import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { transporter } from '../config/nodemailer';

export const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
];

export async function sendContact(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { name, email, subject, message } = req.body;
  const to = 'royalsuitesboutiquehotel2025@gmail.com';

  await transporter.sendMail({
    from: process.env.FROM_EMAIL || `"Royal Suites Contact" <${to}>`,
    to,
    replyTo: email,
    subject: `[Contact Form] ${subject}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;border:1px solid #C9A84C;padding:2rem;">
        <h2 style="font-family:'Cinzel',serif;color:#0D1B3E;margin-top:0;">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <tr><td style="padding:0.5rem 0;color:#888;width:100px;">Name</td><td style="padding:0.5rem 0;color:#0D1B3E;font-weight:bold;">${name}</td></tr>
          <tr><td style="padding:0.5rem 0;color:#888;">Email</td><td style="padding:0.5rem 0;"><a href="mailto:${email}" style="color:#C9A84C;">${email}</a></td></tr>
          <tr><td style="padding:0.5rem 0;color:#888;">Subject</td><td style="padding:0.5rem 0;color:#0D1B3E;">${subject}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #C9A84C33;margin:1.25rem 0;" />
        <p style="color:#333;line-height:1.7;white-space:pre-wrap;">${message}</p>
        <hr style="border:none;border-top:1px solid #C9A84C33;margin:1.25rem 0;" />
        <p style="font-size:0.75rem;color:#aaa;">Sent via Royal Suites contact form</p>
      </div>
    `,
  });

  res.json({ success: true });
}
