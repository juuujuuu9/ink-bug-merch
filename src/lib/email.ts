import { Resend } from 'resend';

const apiKey = import.meta.env.RESEND_API_KEY;
if (!apiKey || typeof apiKey !== 'string') {
  throw new Error('RESEND_API_KEY is missing or invalid. Set it in .env to send emails.');
}
const resend = new Resend(apiKey);

const FROM_NAME = 'Ink Bug Merch';

function formatFrom(email: string): string {
  return email.includes('<') ? email : `${FROM_NAME} <${email}>`;
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

export async function sendEmail({ to, subject, html, text, from }: SendEmailOptions) {
  const emailAddress = from ?? import.meta.env.RESEND_FROM ?? 'onboarding@resend.dev';
  const { data, error } = await resend.emails.send({
    from: formatFrom(emailAddress),
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export { resend };
