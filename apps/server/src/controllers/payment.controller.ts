import { Request, Response } from 'express';
import Bill from '../models/Bill';
import Payment from '../models/Payment';
import Guest from '../models/Guest';
import stripe from '../config/stripe';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateReceiptPDF } from '../utils/pdfReceipt';
import { sendCheckoutReceipt } from '../services/notification.service';
import cloudinary from '../config/cloudinary';

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
