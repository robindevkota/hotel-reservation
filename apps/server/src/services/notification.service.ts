import { transporter } from '../config/nodemailer';

export async function sendReservationConfirmation(
  email: string,
  name: string,
  bookingRef: string,
  checkIn: Date,
  checkOut: Date,
  roomName: string,
  totalAmount: number,
  cancellationPolicy: 'flexible' | 'non_refundable',
): Promise<void> {
  const policyLabel = cancellationPolicy === 'non_refundable'
    ? 'Non-Refundable (10% discount applied — no refunds on cancellation)'
    : 'Flexible — free cancellation up to 48 hours before check-in';

  const cancelUrl = `${process.env.CLIENT_URL}/manage-booking`;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: `👑 Booking Confirmed — ${bookingRef} | Royal Suites`,
    html: `
      <div style="font-family: Georgia, serif; background: #F5ECD7; padding: 40px; color: #0D1B3E; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #C9A84C; text-align: center; letter-spacing: 4px;">ROYAL SUITES</h1>
        <h2 style="text-align: center; border-bottom: 1px solid #C9A84C; padding-bottom: 12px;">Booking Confirmed</h2>
        <p>Dear ${name},</p>
        <p>Your reservation has been confirmed. We look forward to welcoming you.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#1A2E6E; color:#F5ECD7;">
            <td colspan="2" style="padding: 10px 12px; font-weight: bold; letter-spacing: 1px;">BOOKING DETAILS</td>
          </tr>
          <tr><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C; width:40%;"><strong>Booking Reference</strong></td><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C; font-size: 18px; font-weight: bold; color: #C9A84C;">${bookingRef}</td></tr>
          <tr><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;"><strong>Room</strong></td><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;">${roomName}</td></tr>
          <tr><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;"><strong>Check-in</strong></td><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;">${new Date(checkIn).toDateString()}</td></tr>
          <tr><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;"><strong>Check-out</strong></td><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;">${new Date(checkOut).toDateString()}</td></tr>
          <tr><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;"><strong>Total Amount</strong></td><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;">$${totalAmount.toFixed(2)}</td></tr>
          <tr><td style="padding: 10px 12px;"><strong>Cancellation Policy</strong></td><td style="padding: 10px 12px;">${policyLabel}</td></tr>
        </table>
        ${cancellationPolicy === 'flexible' ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${cancelUrl}" style="background: #0D1B3E; color: #C9A84C; padding: 12px 28px; text-decoration: none; letter-spacing: 2px; font-size: 13px; border: 1px solid #C9A84C;">
            CANCEL THIS BOOKING
          </a>
          <p style="font-size: 12px; color: #666; margin-top: 8px;">Free cancellation until 48 hours before check-in.</p>
        </div>` : `
        <div style="background: #fff3cd; border: 1px solid #C9A84C; padding: 12px 16px; margin: 20px 0; font-size: 13px;">
          ⚠️ This booking is <strong>non-refundable</strong>. No refund will be issued for cancellations.
        </div>`}
        <p style="color: #8B6914; font-style: italic; text-align: center; margin-top: 30px;">May your stay be worthy of the pharaohs.</p>
        <p style="font-size: 11px; color: #999; text-align: center;">Royal Suites · Please keep your booking reference for check-in.</p>
      </div>
    `,
  });
}

export async function sendCancellationConfirmation(
  email: string,
  name: string,
  bookingRef: string,
  policy: 'flexible' | 'non_refundable',
  refundIssued: boolean,
  penaltyCharged: number,
): Promise<void> {
  const refundLine = policy === 'non_refundable'
    ? 'This booking was <strong>non-refundable</strong>. No refund has been issued.'
    : refundIssued
      ? penaltyCharged > 0
        ? `A partial refund has been issued. A 1-night penalty of <strong>$${penaltyCharged.toFixed(2)}</strong> was retained as per our cancellation policy.`
        : 'A <strong>full refund</strong> has been issued to your original payment method. Please allow 5–10 business days.'
      : 'No charge was made to your payment method.';

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: `Booking Cancelled — ${bookingRef} | Royal Suites`,
    html: `
      <div style="font-family: Georgia, serif; background: #F5ECD7; padding: 40px; color: #0D1B3E; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #C9A84C; text-align: center; letter-spacing: 4px;">ROYAL SUITES</h1>
        <h2 style="text-align: center; border-bottom: 1px solid #C9A84C; padding-bottom: 12px;">Booking Cancelled</h2>
        <p>Dear ${name},</p>
        <p>Your reservation <strong>${bookingRef}</strong> has been successfully cancelled.</p>
        <div style="background: #fff; border: 1px solid #C9A84C; padding: 16px 20px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Refund Status:</strong><br/>${refundLine}</p>
        </div>
        <p>If you have any questions, please contact our front desk.</p>
        <p style="color: #8B6914; font-style: italic; text-align: center; margin-top: 30px;">We hope to welcome you another time.</p>
        <p style="font-size: 11px; color: #999; text-align: center;">Royal Suites</p>
      </div>
    `,
  });
}

export async function sendCheckoutReceipt(
  email: string,
  name: string,
  pdfBuffer: Buffer
): Promise<void> {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: '👑 Royal Suites — Your Stay Receipt',
    html: `
      <div style="font-family: Georgia, serif; background: #F5ECD7; padding: 40px; color: #0D1B3E;">
        <h1 style="color: #C9A84C; text-align: center;">ROYAL SUITES</h1>
        <p>Dear ${name},</p>
        <p>Thank you for staying with us. Please find your receipt attached.</p>
        <p style="color: #8B6914; font-style: italic;">We hope to welcome you again soon.</p>
      </div>
    `,
    attachments: [{ filename: 'receipt.pdf', content: pdfBuffer }],
  });
}

// Sent automatically 2 days before check-in (call from a cron job or scheduler).
export async function sendPreArrivalReminder(
  email: string,
  name: string,
  bookingRef: string,
  checkIn: Date,
  checkOut: Date,
  roomName: string,
): Promise<void> {
  const cancelUrl = `${process.env.CLIENT_URL}/manage-booking`;
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: `Your Stay Begins Tomorrow — ${bookingRef} | Royal Suites`,
    html: `
      <div style="font-family: Georgia, serif; background: #F5ECD7; padding: 40px; color: #0D1B3E; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #C9A84C; text-align: center; letter-spacing: 4px;">ROYAL SUITES</h1>
        <h2 style="text-align: center; border-bottom: 1px solid #C9A84C; padding-bottom: 12px;">We're Ready to Welcome You</h2>
        <p>Dear ${name},</p>
        <p>Your stay at Royal Suites begins in <strong>2 days</strong>. Here is a reminder of your booking details:</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C; width:40%;"><strong>Booking Reference</strong></td><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C; color: #C9A84C; font-weight: bold;">${bookingRef}</td></tr>
          <tr><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;"><strong>Room</strong></td><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;">${roomName}</td></tr>
          <tr><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;"><strong>Check-in</strong></td><td style="padding: 10px 12px; border-bottom: 1px solid #C9A84C;">${new Date(checkIn).toDateString()}</td></tr>
          <tr><td style="padding: 10px 12px;"><strong>Duration</strong></td><td style="padding: 10px 12px;">${nights} night${nights > 1 ? 's' : ''}</td></tr>
        </table>
        <p>Please present your booking reference <strong>${bookingRef}</strong> at the front desk upon arrival.</p>
        <p style="font-size: 12px; color: #666; margin-top: 16px;">
          Need to cancel? <a href="${cancelUrl}" style="color: #C9A84C;">Click here</a> — free cancellation closes 48 hours before check-in.
        </p>
        <p style="color: #8B6914; font-style: italic; text-align: center; margin-top: 30px;">We look forward to making your stay unforgettable.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'Password Reset Request — Royal Suites',
    html: `
      <div style="font-family: Georgia, serif; background: #F5ECD7; padding: 40px; color: #0D1B3E; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #C9A84C; text-align: center; letter-spacing: 4px;">ROYAL SUITES</h1>
        <h2 style="text-align: center; border-bottom: 1px solid #C9A84C; padding-bottom: 12px;">Password Reset</h2>
        <p>Dear ${name},</p>
        <p>We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #0D1B3E; color: #C9A84C; padding: 12px 28px; text-decoration: none; letter-spacing: 2px; font-size: 13px; border: 1px solid #C9A84C;">
            RESET PASSWORD
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">If you did not request a password reset, please ignore this email. Your password will not change.</p>
        <p style="font-size: 11px; color: #999; text-align: center; margin-top: 30px;">Royal Suites · This link expires in 1 hour.</p>
      </div>
    `,
  });
}

export async function sendSpaConfirmation(
  email: string,
  name: string,
  serviceName: string,
  date: Date,
  startTime: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: '🌿 Spa Booking Confirmed — Royal Suites',
    html: `
      <div style="font-family: Georgia, serif; background: #F5ECD7; padding: 40px; color: #0D1B3E;">
        <h1 style="color: #C9A84C; text-align: center;">ROYAL SUITES SPA</h1>
        <p>Dear ${name},</p>
        <p>Your spa session <strong>${serviceName}</strong> is confirmed for <strong>${new Date(date).toDateString()}</strong> at <strong>${startTime}</strong>.</p>
        <p style="color: #8B6914; font-style: italic;">Prepare to be renewed, body and soul.</p>
      </div>
    `,
  });
}
