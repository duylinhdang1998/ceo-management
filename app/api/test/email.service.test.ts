/**
 * Unit tests for EmailService.
 *
 * nodemailer.createTransport is mocked so no real SMTP connection is made.
 * The mock captures every sendMail call so tests can assert on the options
 * passed through (to, subject, html, text, attachments).
 */

// ── Mock nodemailer before importing EmailService ────────────────────────────
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport,
}));

import { EmailService, SendMailOptions } from '../src/modules/email/email.service';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'ceo@company.com';
    process.env.SMTP_PASS = 'app-password';
    process.env.SMTP_FROM = '"CEO Portal" <ceo@company.com>';
    service = new EmailService();
  });

  // ── Constructor / transport creation ──────────────────────────────────────

  describe('constructor', () => {
    it('should create the Nodemailer transport with correct SMTP config', () => {
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: 'ceo@company.com',
            pass: 'app-password',
          },
        }),
      );
    });
  });

  // ── sendMail — basic ───────────────────────────────────────────────────────

  describe('sendMail', () => {
    it('should call transporter.sendMail with correct to/subject/html', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-msg-id' });

      const opts: SendMailOptions = {
        to: 'employee@company.com',
        subject: 'Q2 Report',
        html: '<p>Please review the attached report.</p>',
      };

      await service.sendMail(opts);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"CEO Portal" <ceo@company.com>',
          to: 'employee@company.com',
          subject: 'Q2 Report',
          html: '<p>Please review the attached report.</p>',
        }),
      );
    });

    it('should join multiple recipients into a comma-separated string', async () => {
      mockSendMail.mockResolvedValueOnce({});

      await service.sendMail({
        to: ['alice@company.com', 'bob@company.com'],
        subject: 'Team Update',
        text: 'Plain text body',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs['to']).toBe('alice@company.com, bob@company.com');
    });

    it('should include attachments with filename and content buffer', async () => {
      mockSendMail.mockResolvedValueOnce({});

      const pdfBuffer = Buffer.from('%PDF-1.4 mock content');

      await service.sendMail({
        to: 'manager@company.com',
        subject: 'Annual Report',
        html: '<p>See attachment.</p>',
        attachments: [
          {
            filename: 'annual-report.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      const callArgs = mockSendMail.mock.calls[0][0] as Record<string, unknown>;
      const attachments = callArgs['attachments'] as Array<{
        filename: string;
        content: Buffer;
        contentType: string;
      }>;
      expect(attachments).toHaveLength(1);
      expect(attachments[0].filename).toBe('annual-report.pdf');
      expect(attachments[0].content).toBe(pdfBuffer);
      expect(attachments[0].contentType).toBe('application/pdf');
    });

    it('should pass both html and text when both are supplied', async () => {
      mockSendMail.mockResolvedValueOnce({});

      await service.sendMail({
        to: 'user@company.com',
        subject: 'Dual-body',
        html: '<b>Bold</b>',
        text: 'Bold (plain)',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs['html']).toBe('<b>Bold</b>');
      expect(callArgs['text']).toBe('Bold (plain)');
    });

    it('should send with empty attachments array when none supplied', async () => {
      mockSendMail.mockResolvedValueOnce({});

      await service.sendMail({
        to: 'user@company.com',
        subject: 'No attachments',
        text: 'Body',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs['attachments']).toEqual([]);
    });

    it('should propagate transport errors to the caller', async () => {
      mockSendMail.mockRejectedValueOnce(
        new Error('Invalid login: 535 5.7.8 Authentication Failed'),
      );

      await expect(
        service.sendMail({
          to: 'user@company.com',
          subject: 'Fail',
          text: 'body',
        }),
      ).rejects.toThrow('Authentication Failed');
    });
  });
});
