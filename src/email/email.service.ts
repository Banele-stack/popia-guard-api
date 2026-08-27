import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Thin SMTP wrapper, configured entirely from env vars (SMTP_HOST/PORT/
 * USER/PASS/FROM) so it works with whatever provider gets picked — SendGrid,
 * Resend, Mailgun, even a Gmail app-password — without a provider-specific
 * SDK or code change. Nothing here is POPIAGuard-specific; the
 * compliance-digest content lives in alerts.service.ts.
 *
 * If SMTP isn't configured (no SMTP_HOST), sends are logged and skipped
 * rather than throwing — so the rest of the app (register, login,
 * forgot-password) keeps working in local dev / before a mail provider is
 * wired up, instead of every email-triggering action failing outright.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor() {
    this.from = process.env.SMTP_FROM ?? 'POPIAGuard <no-reply@popiaguard.co.za>';

    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    } else {
      this.logger.warn(
        'SMTP_HOST is not set — emails (compliance alerts, password resets, invites) will be logged, not sent. ' +
          'Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM to enable real delivery.',
      );
    }
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[email skipped — SMTP not configured] to=${input.to} subject="${input.subject}"`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      this.logger.log(`Email sent to=${input.to} subject="${input.subject}"`);
    } catch (err) {
      this.logger.error(
        `Failed to send email to=${input.to} subject="${input.subject}"`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
