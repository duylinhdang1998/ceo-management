import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * Attachment to include in an outgoing email.
 * `content` is a Buffer so it works both for file attachments
 * and for inline S3-fetched blobs.
 */
export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/** Input shape for sendMail. */
export interface SendMailOptions {
  to: string | string[];
  subject: string;
  /** HTML body — preferred over text when both are supplied. */
  html?: string;
  /** Plain-text fallback body. */
  text?: string;
  attachments?: MailAttachment[];
}

/**
 * EmailService — Nodemailer Gmail SMTP transport.
 *
 * Credentials are read from environment variables at construction time:
 *   SMTP_HOST  (default: smtp.gmail.com)
 *   SMTP_PORT  (default: 465)
 *   SMTP_USER  — Gmail address / G-Suite user
 *   SMTP_PASS  — Gmail App Password (not the account password)
 *   SMTP_FROM  — display address, e.g. "CEO Portal <ceo@company.com>"
 *
 * At least one of `html` or `text` must be provided.
 * Attachments are optional; when supplied the Buffer is streamed directly
 * so there is no temp-file I/O.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor() {
    this.from =
      process.env.SMTP_FROM ?? '"CEO Portal" <noreply@example.com>';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT ?? '465', 10),
      secure: true, // port 465 uses SSL; set false for STARTTLS on 587
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      },
    });
  }

  /**
   * Send an email via Gmail SMTP.
   *
   * Throws if the transport encounters a delivery error.
   * Callers (e.g. email.service) should catch and record the error in
   * email_logs with status='failed'.
   */
  async sendMail(opts: SendMailOptions): Promise<string> {
    const recipients = Array.isArray(opts.to)
      ? opts.to.join(', ')
      : opts.to;

    this.logger.log(
      `Sending email to=${recipients} subject="${opts.subject}"`,
    );

    const attachments = (opts.attachments ?? []).map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    }));

    const info = await this.transporter.sendMail({
      from: this.from,
      to: recipients,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments,
    });

    this.logger.log(`Email delivered to=${recipients} messageId=${info?.messageId ?? 'unknown'}`);
    return (info?.messageId as string | undefined) ?? 'sent';
  }
}
