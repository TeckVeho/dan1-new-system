import nodemailer from "nodemailer";
import { env, isSmtpConfigured } from "../config/env.js";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!isSmtpConfigured()) {
    console.info(`[email] to=${input.to} subject=${input.subject}\n${input.text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: env.smtpUser
      ? {
          user: env.smtpUser,
          pass: env.smtpPass,
        }
      : undefined,
  });

  await transporter.sendMail({
    from: env.mailFrom,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}
