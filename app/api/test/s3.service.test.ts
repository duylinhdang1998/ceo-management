/**
 * Unit tests for S3Service.
 *
 * AWS SDK v3 commands are mocked with jest.mock so no real network call is made.
 * Each command (Put, Get, Delete) is spied on and its mock implementation
 * is controlled per test.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// ── Mock the entire @aws-sdk/client-s3 package ──────────────────────────────
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    __mockSend: mockSend,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockSend: mockSend } = jest.requireMock('@aws-sdk/client-s3') as {
  __mockSend: jest.Mock;
};

// Import AFTER mock is registered
import { S3Service } from '../src/infra/s3.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReadable(content: string): Readable {
  const r = new Readable();
  r.push(content);
  r.push(null);
  return r;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.S3_BUCKET = 'test-bucket';
    process.env.S3_ENDPOINT = 'https://s3.cmccloud.vn';
    process.env.S3_REGION = 'hcm';
    process.env.S3_ACCESS_KEY = 'test-access';
    process.env.S3_SECRET_KEY = 'test-secret';
    service = new S3Service();
  });

  // ── putHtml ────────────────────────────────────────────────────────────────

  describe('putHtml', () => {
    it('should call PutObjectCommand with ContentType text/html and the HTML body', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.putHtml('reports/test.html', '<h1>Hello</h1>');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const [cmd] = mockSend.mock.calls[0] as [{ input: Record<string, unknown> }][];
      expect((cmd as unknown as { input: Record<string, unknown> }).input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'reports/test.html',
        ContentType: 'text/html; charset=utf-8',
      });
      const input = (cmd as unknown as { input: { Body: Buffer } }).input;
      expect(Buffer.isBuffer(input.Body)).toBe(true);
      expect(input.Body.toString('utf8')).toBe('<h1>Hello</h1>');
    });

    it('should propagate errors from S3 send', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 connection refused'));

      await expect(
        service.putHtml('reports/fail.html', '<p>fail</p>'),
      ).rejects.toThrow('S3 connection refused');
    });
  });

  // ── putBuffer ──────────────────────────────────────────────────────────────

  describe('putBuffer', () => {
    it('should call PutObjectCommand with the given buffer and contentType', async () => {
      mockSend.mockResolvedValueOnce({});

      const buf = Buffer.from('PDF binary content');
      await service.putBuffer('attachments/doc.pdf', buf, 'application/pdf');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const [cmd] = mockSend.mock.calls[0] as [{ input: Record<string, unknown> }][];
      const input = (cmd as unknown as { input: Record<string, unknown> }).input;
      expect(input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'attachments/doc.pdf',
        ContentType: 'application/pdf',
      });
      expect(input['Body']).toBe(buf);
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should return body buffer and contentType from S3 response', async () => {
      const htmlContent = '<html><body>Report</body></html>';
      mockSend.mockResolvedValueOnce({
        Body: makeReadable(htmlContent),
        ContentType: 'text/html; charset=utf-8',
      });

      const result = await service.get('reports/123.html');

      expect(result.contentType).toBe('text/html; charset=utf-8');
      expect(result.body.toString('utf8')).toBe(htmlContent);
    });

    it('should default contentType to application/octet-stream when missing', async () => {
      mockSend.mockResolvedValueOnce({
        Body: makeReadable('raw'),
        // ContentType deliberately omitted
      });

      const result = await service.get('some/file');

      expect(result.contentType).toBe('application/octet-stream');
    });

    it('should propagate errors from S3 get', async () => {
      mockSend.mockRejectedValueOnce(new Error('NoSuchKey'));

      await expect(service.get('missing/key')).rejects.toThrow('NoSuchKey');
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should call DeleteObjectCommand with the correct key', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.delete('reports/old-report.html');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const [cmd] = mockSend.mock.calls[0] as [{ input: Record<string, unknown> }][];
      expect((cmd as unknown as { input: Record<string, unknown> }).input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'reports/old-report.html',
      });
    });

    it('should propagate deletion errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      await expect(service.delete('reports/x.html')).rejects.toThrow(
        'Access denied',
      );
    });
  });

  // ── S3Client construction ──────────────────────────────────────────────────

  describe('S3Client configuration', () => {
    it('should construct S3Client with forcePathStyle true for CMC compatibility', () => {
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          forcePathStyle: true,
          endpoint: 'https://s3.cmccloud.vn',
          region: 'hcm',
        }),
      );
    });
  });
});
