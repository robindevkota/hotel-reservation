import { transporter } from '../config/nodemailer';

const LOGO_URL = 'https://res.cloudinary.com/dvwey9irk/image/upload/v1776608648/royal-suites/logo.jpg';
const logoImg = `<img src="${LOGO_URL}" alt="Royal Suites" style="width:90px;height:90px;object-fit:contain;display:block;margin:0 auto 8px;border-radius:50%;" />`;

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
  const cancelUrl = `${process.env.CLIENT_URL}/manage-booking?ref=${encodeURIComponent(bookingRef)}&email=${encodeURIComponent(email)}`;

  const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));

  await transporter.sendMail({
    from: `Royal Suites <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: `Booking Confirmed — ${bookingRef} | Royal Suites`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5ECD7;font-family:Georgia,serif;">
  <div style="max-width:600px;margin:0 auto;background:#F5ECD7;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0D1B3E 0%,#1A2E6E 100%);padding:36px 40px 28px;text-align:center;border-bottom:2px solid #C9A84C;">
      ${logoImg}
      <div style="font-size:11px;letter-spacing:6px;color:#C9A84C;margin-bottom:8px;">✦ &nbsp; E S T A B L I S H E D &nbsp; 2 0 2 4 &nbsp; ✦</div>
      <div style="font-size:28px;font-weight:bold;letter-spacing:8px;color:#C9A84C;text-transform:uppercase;">Royal Suites</div>
      <div style="width:60px;height:1px;background:#C9A84C;margin:12px auto;opacity:0.5;"></div>
      <div style="font-size:13px;letter-spacing:3px;color:#a0aec0;text-transform:uppercase;">Luxury Hotel &amp; Spa</div>
    </div>

    <!-- Greeting -->
    <div style="background:#F5ECD7;padding:32px 40px 24px;text-align:center;border-bottom:1px solid #e0d0b0;">
      <div style="display:inline-block;background:#fff;border:1px solid #C9A84C;padding:6px 20px;margin-bottom:16px;">
        <span style="font-size:11px;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;">Reservation Confirmed</span>
      </div>
      <div style="font-size:24px;color:#0D1B3E;font-weight:normal;margin:8px 0;">Dear ${name},</div>
      <p style="color:#5a6a8a;font-size:15px;line-height:1.7;margin:8px 0 0;">
        Your reservation at Royal Suites has been confirmed.<br>We look forward to welcoming you.
      </p>
    </div>

    <!-- Booking Reference Hero -->
    <div style="background:linear-gradient(135deg,#C9A84C,#e6c76b);padding:24px 40px;text-align:center;">
      <div style="font-size:11px;letter-spacing:3px;color:#0D1B3E;text-transform:uppercase;margin-bottom:6px;">Booking Reference</div>
      <div style="font-size:26px;font-weight:bold;letter-spacing:4px;color:#0D1B3E;">${bookingRef}</div>
      <div style="font-size:11px;color:#5a4a1a;margin-top:6px;">Present this at check-in</div>
    </div>

    <!-- Details Grid -->
    <div style="background:#fff;padding:32px 40px;border-bottom:1px solid #e0d0b0;">
      <div style="font-size:11px;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;margin-bottom:20px;border-bottom:1px solid #e8dcc8;padding-bottom:12px;">Stay Details</div>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #f0e8d8;width:45%;">
            <div style="font-size:10px;letter-spacing:2px;color:#9a8a6a;text-transform:uppercase;margin-bottom:4px;">Room</div>
            <div style="color:#0D1B3E;font-size:15px;">${roomName}</div>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #f0e8d8;">
            <div style="font-size:10px;letter-spacing:2px;color:#9a8a6a;text-transform:uppercase;margin-bottom:4px;">Duration</div>
            <div style="color:#0D1B3E;font-size:15px;">${nights} Night${nights !== 1 ? 's' : ''}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #f0e8d8;">
            <div style="font-size:10px;letter-spacing:2px;color:#9a8a6a;text-transform:uppercase;margin-bottom:4px;">Check-in</div>
            <div style="color:#0D1B3E;font-size:15px;">${new Date(checkIn).toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</div>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #f0e8d8;">
            <div style="font-size:10px;letter-spacing:2px;color:#9a8a6a;text-transform:uppercase;margin-bottom:4px;">Check-out</div>
            <div style="color:#0D1B3E;font-size:15px;">${new Date(checkOut).toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 0;">
            <div style="font-size:10px;letter-spacing:2px;color:#9a8a6a;text-transform:uppercase;margin-bottom:4px;">Rate Type</div>
            <div style="color:#0D1B3E;font-size:15px;">Flexible</div>
          </td>
          <td style="padding:14px 0;">
            <div style="font-size:10px;letter-spacing:2px;color:#9a8a6a;text-transform:uppercase;margin-bottom:4px;">Total Amount</div>
            <div style="color:#C9A84C;font-size:20px;font-weight:bold;">$${totalAmount.toFixed(2)}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Policy Banner -->
    <div style="background:#f0faf4;border-top:1px solid #bbf0d0;border-bottom:1px solid #bbf0d0;padding:20px 40px;">
      <div style="color:#166534;font-size:12px;letter-spacing:1px;font-weight:bold;margin-bottom:6px;">✓ &nbsp;FREE CANCELLATION</div>
      <div style="color:#4a7a5a;font-size:13px;line-height:1.6;">Cancel at no charge up to 48 hours before check-in. A 1-night penalty applies for late cancellations or no-shows.</div>
    </div>

    <!-- Manage Booking CTA -->
    <div style="background:#F5ECD7;padding:28px 40px;text-align:center;border-bottom:1px solid #e0d0b0;">
      <p style="color:#5a6a8a;font-size:13px;margin:0 0 16px;">Need to cancel or view your booking?</p>
      <a href="${cancelUrl}" style="display:inline-block;background:#0D1B3E;color:#C9A84C;padding:13px 36px;text-decoration:none;letter-spacing:3px;font-size:11px;text-transform:uppercase;border:1px solid #0D1B3E;">
        Manage Booking
      </a>
    </div>

    <!-- Payment Info -->
    <div style="background:#fff;padding:20px 40px;border-bottom:1px solid #e0d0b0;">
      <div style="background:#F5ECD7;border:1px solid #e0d0b0;padding:16px 20px;">
        <div style="font-size:11px;letter-spacing:2px;color:#9a8a6a;text-transform:uppercase;margin-bottom:8px;">Payment</div>
        <div style="color:#5a6a8a;font-size:13px;">
          Card held — <strong style="color:#0D1B3E;">$${totalAmount.toFixed(2)}</strong> authorized (not charged). Full amount due at checkout.
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#0D1B3E;padding:32px 40px;text-align:center;border-top:2px solid #C9A84C;">
      <div style="color:#C9A84C;font-style:italic;font-size:14px;margin-bottom:16px;">May your stay be worthy of the pharaohs.</div>
      <div style="width:40px;height:1px;background:#C9A84C;margin:0 auto 16px;opacity:0.4;"></div>
      <div style="font-size:10px;letter-spacing:2px;color:#6b7fa3;text-transform:uppercase;">Royal Suites &nbsp;·&nbsp; Luxury Hotel &amp; Spa</div>
      <div style="font-size:11px;color:#4a5568;margin-top:8px;">noreply@royalsuitesnp.com</div>
    </div>

  </div>
</body>
</html>
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
        ${logoImg}
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
        ${logoImg}
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
        ${logoImg}
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
        ${logoImg}
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
