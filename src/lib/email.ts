import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

export async function sendEmail({ to, subject, html, text, from }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: from ?? import.meta.env.RESEND_FROM ?? 'onboarding@resend.dev',
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
