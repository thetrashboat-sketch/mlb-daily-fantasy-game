import { Resend } from 'resend';

export async function sendPasswordResetEmail(toAddress, resetLink) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] Password reset link for ${toAddress}: ${resetLink}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM_ADDRESS,
    to: toAddress,
    subject: 'Reset your Daily Dinger password',
    html: `<p>Click the link below to reset your password. This link expires in 20 minutes.</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  });
}
