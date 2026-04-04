import { transporter } from '../config/nodemailer';

export async function sendReservationConfirmation(
  email: string,
  name: string,
  reservationId: string,
  checkIn: Date,
  checkOut: Date,
  roomName: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: '👑 Your Royal Suites Reservation is Confirmed',
    html: `
      <div style="font-family: Georgia, serif; background: #F5ECD7; padding: 40px; color: #0D1B3E;">
        <h1 style="color: #C9A84C; text-align: center;">ROYAL SUITES</h1>
        <h2 style="text-align: center;">Reservation Confirmed</h2>
        <p>Dear ${name},</p>
        <p>Your reservation has been confirmed. We look forward to welcoming you.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #C9A84C;"><strong>Reservation ID</strong></td><td>${reservationId}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #C9A84C;"><strong>Room</strong></td><td>${roomName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #C9A84C;"><strong>Check-in</strong></td><td>${new Date(checkIn).toDateString()}</td></tr>
          <tr><td style="padding: 8px;"><strong>Check-out</strong></td><td>${new Date(checkOut).toDateString()}</td></tr>
        </table>
        <p style="color: #8B6914; font-style: italic; text-align: center;">May your stay be worthy of the pharaohs.</p>
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
