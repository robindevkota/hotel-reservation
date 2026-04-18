import { Request, Response } from 'express';
import Bill from '../models/Bill';
import Payment from '../models/Payment';
import Reservation from '../models/Reservation';
import stripe from '../config/stripe';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateReceiptPDF } from '../utils/pdfReceipt';
import { sendCheckoutReceipt, sendReservationConfirmation } from '../services/notification.service';
import cloudinary from '../config/cloudinary';
import { verifyTransaction, getMerchantInfo } from '../services/phonepay.service';
import { getUsdToNprRate, getUsdToNprRateFull, setUsdToNprRate } from '../services/exchangeRate.service';

export async function createPaymentIntent(req: AuthRequest, res: Response): Promise<void> {
  const billId = req.body.billId || req.guest?.bill;
  const bill = await Bill.findById(billId).populate('guest', 'name email');
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status === 'paid') throw new AppError('Bill already paid', 400);

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(bill.grandTotal * 100), // cents
    currency: 'usd',
    metadata: { billId: String(bill._id) },
  });

  bill.stripePaymentIntentId = intent.id;
  bill.status = 'pending_payment';
  await bill.save();

  res.json({ success: true, clientSecret: intent.client_secret, amount: bill.grandTotal });
}

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as unknown as { id: string; metadata: { billId: string } };
    const bill = await Bill.findOne({ stripePaymentIntentId: intent.id }).populate('guest', 'name email');
    if (bill) {
      bill.status = 'paid';
      bill.paidAt = new Date();
      bill.paymentMethod = 'stripe';
      await bill.save();

      // Generate PDF receipt
      const pdf = await generateReceiptPDF(bill as any);

      // Upload to Cloudinary
      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: 'raw', folder: 'receipts', format: 'pdf' },
          (err, result) => err ? reject(err) : resolve(result as { secure_url: string })
        ).end(pdf);
      });

      bill.receiptUrl = uploadResult.secure_url;
      await bill.save();

      // Save payment record
      await Payment.create({
        bill: bill._id,
        guest: bill.guest,
        amount: bill.grandTotal,
        method: 'stripe',
        stripePaymentIntentId: intent.id,
        status: 'succeeded',
      });

      // Email receipt
      const g = bill.guest as any;
      if (g?.email) sendCheckoutReceipt(g.email, g.name, pdf).catch(console.error);
    }
  }

  res.json({ received: true });
}

export async function cashPayment(req: Request, res: Response): Promise<void> {
  const { billId } = req.body;
  const bill = await Bill.findById(billId).populate('guest', 'name email');
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status === 'paid') throw new AppError('Bill already paid', 400);

  bill.status = 'paid';
  bill.paidAt = new Date();
  bill.paymentMethod = 'cash';
  await bill.save();

  await Payment.create({
    bill: bill._id,
    guest: bill.guest,
    amount: bill.grandTotal,
    method: 'cash',
    status: 'succeeded',
  });

  const pdf = await generateReceiptPDF(bill as any);
  const g = bill.guest as any;
  if (g?.email) sendCheckoutReceipt(g.email, g.name, pdf).catch(console.error);

  res.json({ success: true, bill });
}

// ─── Card authorization for flexible bookings ────────────────────────────────
// Called after createReservation when policy = flexible.
// Authorizes 1 night on the guest's card (hold only — money NOT taken).
// On no-show or late cancel → capture(). On normal cancel → cancel().
export async function authorizeCard(req: Request, res: Response): Promise<void> {
  const { reservationId } = req.body;
  const reservation = await Reservation.findById(reservationId).populate('room', 'name pricePerNight');
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.cancellationPolicy !== 'flexible') throw new AppError('Only flexible reservations use card authorization', 400);
  if (reservation.stripePaymentIntentId) throw new AppError('Card already authorized for this reservation', 400);
  if (!['pending', 'confirmed'].includes(reservation.status)) throw new AppError('Reservation is not in an authorizable state', 400);

  const room = reservation.room as any;
  const oneNightAmount = Math.round(room.pricePerNight * 100); // hold 1 night in cents

  const intent = await stripe.paymentIntents.create({
    amount: oneNightAmount,
    currency: 'usd',
    capture_method: 'manual',  // authorize only — do NOT charge yet
    metadata: {
      reservationId: String(reservation._id),
      bookingRef: reservation.bookingRef,
      type: 'flexible_hold',
    },
  });

  reservation.stripePaymentIntentId = intent.id;
  await reservation.save();

  res.json({ success: true, clientSecret: intent.client_secret, amount: room.pricePerNight });
}

// ─── Upfront charge for non-refundable bookings ───────────────────────────────
// Called immediately after reservation is created when policy = non_refundable.
// Charges 100% of roomCharges via Stripe and marks paidUpfront = true.
export async function chargeUpfront(req: Request, res: Response): Promise<void> {
  const { reservationId } = req.body;
  const reservation = await Reservation.findById(reservationId).populate('room', 'name');
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.cancellationPolicy !== 'non_refundable') throw new AppError('Only non-refundable reservations are charged upfront', 400);
  if (reservation.paidUpfront) throw new AppError('Already charged upfront', 400);
  if (!['pending', 'confirmed'].includes(reservation.status)) throw new AppError('Reservation is not in a chargeable state', 400);

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(reservation.roomCharges * 100),
    currency: 'usd',
    metadata: {
      reservationId: String(reservation._id),
      bookingRef: reservation.bookingRef,
      type: 'upfront_non_refundable',
    },
  });

  reservation.stripePaymentIntentId = intent.id;
  reservation.paidUpfront = true;
  await reservation.save();

  res.json({ success: true, clientSecret: intent.client_secret, amount: reservation.roomCharges });
}

// ─── Refund for flexible cancellations ────────────────────────────────────────
// Called by cancelReservation when policy = flexible AND within free-cancel window.
// Issues full Stripe refund if paidUpfront is true (shouldn't be for flexible, but guards anyway).
// For no-show or late cancel — charges 1 night as penalty.
export async function refundUpfront(req: Request, res: Response): Promise<void> {
  const { reservationId } = req.body;
  const reservation = await Reservation.findById(reservationId).populate('room', 'name pricePerNight');
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (!reservation.stripePaymentIntentId) throw new AppError('No payment on record to refund', 400);

  const refund = await stripe.refunds.create({
    payment_intent: reservation.stripePaymentIntentId,
  });

  res.json({ success: true, refundId: refund.id, amount: (refund.amount / 100).toFixed(2) });
}

// ─── PhonePay: merchant info (show QR / phone number to guest) ───────────────
export async function getPhonePayMerchantInfo(req: Request, res: Response): Promise<void> {
  res.json({ success: true, ...getMerchantInfo() });
}

// ─── PhonePay: verify deposit transaction ID ──────────────────────────────────
export async function verifyPhonePayDeposit(req: Request, res: Response): Promise<void> {
  const { reservationId, transactionId } = req.body;
  if (!reservationId || !transactionId) throw new AppError('reservationId and transactionId are required', 400);

  const reservation = await Reservation.findById(reservationId).populate('room', 'name');
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.guestType !== 'nepali') throw new AppError('Not a Nepali guest reservation', 400);
  if (reservation.depositPaid) throw new AppError('Deposit already verified', 400);

  const result = await verifyTransaction(transactionId, reservation.depositAmount);
  if (!result.success) throw new AppError(result.message, 400);

  // Mark deposit paid and confirm booking
  reservation.depositPaid = true;
  reservation.phonepayTransactionId = transactionId;
  reservation.depositPaidAt = new Date();
  reservation.status = 'confirmed';
  await reservation.save();

  // Send confirmation email
  const room = reservation.room as any;
  sendReservationConfirmation(
    reservation.guest.email,
    reservation.guest.name,
    reservation.bookingRef,
    reservation.checkInDate,
    reservation.checkOutDate,
    room.name,
    reservation.roomCharges,
    reservation.cancellationPolicy,
  ).catch(console.error);

  res.json({ success: true, message: 'Deposit verified. Booking confirmed!', reservation });
}

export async function getUsdNprRate(_req: Request, res: Response): Promise<void> {
  const { rate, updatedBy, updatedAt } = await getUsdToNprRateFull();
  res.json({ success: true, rate, base: 'USD', target: 'NPR', updatedBy, updatedAt });
}

export async function updateUsdNprRate(req: AuthRequest, res: Response): Promise<void> {
  const { rate } = req.body;
  if (!rate || isNaN(Number(rate)) || Number(rate) < 1) throw new AppError('Invalid rate', 400);
  const updatedBy = (req as any).user?.name || (req as any).user?.email || 'admin';
  const saved = await setUsdToNprRate(Number(rate), updatedBy);
  res.json({ success: true, rate: saved });
}

export async function getReceipt(req: AuthRequest, res: Response): Promise<void> {
  const bill = await Bill.findById(req.params.billId).populate('guest', 'name email');
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status !== 'paid') throw new AppError('Bill not yet paid', 400);

  if (bill.receiptUrl) {
    res.json({ success: true, receiptUrl: bill.receiptUrl });
    return;
  }

  // Generate on the fly
  const pdf = await generateReceiptPDF(bill as any);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="receipt-${bill._id}.pdf"`,
  });
  res.send(pdf);
}
