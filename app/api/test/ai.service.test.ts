/**
 * Unit tests for AiService.
 *
 * global fetch is mocked (Node 18+ has it built-in) so no real HTTP call
 * is made to the beeknoee gateway.  Each test controls what the mock returns
 * and asserts that AiService correctly:
 *   1. Sends the right request shape (model, messages, auth header).
 *   2. Parses clean JSON responses into EmailDraft.
 *   3. Handles messy model output (markdown fences, extra text, partial JSON).
 *   4. Throws InternalServerErrorException on transport errors.
 */

// We override the global fetch in each test
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { AiService, EmailDraft, EmployeeSummary } from '../src/modules/email/ai.service';
import { InternalServerErrorException } from '@nestjs/common';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildOkResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
    text: async () => content,
  } as unknown as Response;
}

function buildErrorResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    text: async () => body,
  } as unknown as Response;
}

const EMPLOYEES: EmployeeSummary[] = [
  { id: 'u1', name: 'Nguyen Van A', email: 'nva@company.com' },
  { id: 'u2', name: 'Tran Thi B', email: 'ttb@company.com' },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AiService', () => {
  let service: AiService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_BASE_URL = 'https://platform.beeknoee.com/api/v1';
    process.env.AI_API_KEY = 'test-api-key';
    process.env.AI_MODEL = 'gemini-2.5-flash';
    service = new AiService();
  });

  // ── HTTP request shape ─────────────────────────────────────────────────────

  describe('HTTP request', () => {
    it('should POST to ${AI_BASE_URL}/chat/completions with Bearer auth', async () => {
      const draft: EmailDraft = {
        recipientName: 'Nguyen Van A',
        subject: 'Test',
        body: 'Hello',
      };
      mockFetch.mockResolvedValueOnce(
        buildOkResponse(JSON.stringify(draft)),
      );

      await service.composeEmailDraft(
        'Write an email to Nguyen Van A about Q2 results',
        EMPLOYEES,
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(url).toBe(
        'https://platform.beeknoee.com/api/v1/chat/completions',
      );
      expect(
        (options.headers as Record<string, string>)['Authorization'],
      ).toBe('Bearer test-api-key');
      expect(
        (options.headers as Record<string, string>)['Content-Type'],
      ).toBe('application/json');

      const body = JSON.parse(options.body as string) as {
        model: string;
        messages: Array<{ role: string; content: string }>;
        response_format: { type: string };
      };
      expect(body.model).toBe('gemini-2.5-flash');
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('should include all employee names in the user message for recipient resolution', async () => {
      mockFetch.mockResolvedValueOnce(
        buildOkResponse(
          JSON.stringify({ recipientName: 'Tran Thi B', subject: 'S', body: 'B' }),
        ),
      );

      await service.composeEmailDraft('Email Tran Thi B', EMPLOYEES);

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as { messages: Array<{ role: string; content: string }> };
      const userMsg = body.messages[1].content;
      expect(userMsg).toContain('Nguyen Van A');
      expect(userMsg).toContain('Tran Thi B');
    });
  });

  // ── Happy path — clean JSON ────────────────────────────────────────────────

  describe('response parsing — clean JSON', () => {
    it('should parse a valid JSON response into EmailDraft', async () => {
      const expected: EmailDraft = {
        recipientName: 'Nguyen Van A',
        subject: 'Q2 Sales Results',
        body: 'Dear Nguyen Van A,\n\nPlease review the attached Q2 report.',
      };
      mockFetch.mockResolvedValueOnce(
        buildOkResponse(JSON.stringify(expected)),
      );

      const result = await service.composeEmailDraft(
        'Write an email about Q2 results to Nguyen Van A',
        EMPLOYEES,
      );

      expect(result).toEqual(expected);
    });
  });

  // ── Defensive parsing ──────────────────────────────────────────────────────

  describe('response parsing — defensive', () => {
    it('should strip markdown code fences and still parse correctly', async () => {
      const json: EmailDraft = {
        recipientName: 'Tran Thi B',
        subject: 'Monthly Update',
        body: 'Hi Tran,',
      };
      const withFences = '```json\n' + JSON.stringify(json) + '\n```';
      mockFetch.mockResolvedValueOnce(buildOkResponse(withFences));

      const result = await service.composeEmailDraft('Send to Tran Thi B', EMPLOYEES);

      expect(result.recipientName).toBe('Tran Thi B');
      expect(result.subject).toBe('Monthly Update');
    });

    it('should extract JSON block from text with surrounding prose', async () => {
      const json: EmailDraft = {
        recipientName: 'Nguyen Van A',
        subject: 'Report',
        body: 'Body text here',
      };
      const withProse =
        'Here is the email draft you requested:\n' +
        JSON.stringify(json) +
        '\nLet me know if you want changes.';
      mockFetch.mockResolvedValueOnce(buildOkResponse(withProse));

      const result = await service.composeEmailDraft(
        'Draft for Nguyen Van A',
        EMPLOYEES,
      );

      expect(result.subject).toBe('Report');
    });

    it('should return a fallback draft with raw text as body when JSON cannot be parsed', async () => {
      mockFetch.mockResolvedValueOnce(
        buildOkResponse('Sorry I cannot help with that.'),
      );

      const result = await service.composeEmailDraft('invalid prompt', EMPLOYEES);

      // Falls back gracefully — body contains the raw text
      expect(result.body).toContain('Sorry I cannot help');
      expect(result.recipientName).toBe('');
      expect(result.subject).toBe('');
    });

    it('should use empty string for missing optional fields in parsed JSON', async () => {
      // Missing recipientName
      mockFetch.mockResolvedValueOnce(
        buildOkResponse(JSON.stringify({ subject: 'Sub', body: 'Bdy' })),
      );

      const result = await service.composeEmailDraft('prompt', EMPLOYEES);

      expect(result.recipientName).toBe('');
      expect(result.subject).toBe('Sub');
      expect(result.body).toBe('Bdy');
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('should throw InternalServerErrorException when fetch throws a network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        service.composeEmailDraft('some prompt', EMPLOYEES),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when API returns a non-2xx status', async () => {
      mockFetch.mockResolvedValueOnce(
        buildErrorResponse(429, 'Too Many Requests'),
      );

      await expect(
        service.composeEmailDraft('some prompt', EMPLOYEES),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when response has no choices', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [] }),
      } as unknown as Response);

      await expect(
        service.composeEmailDraft('some prompt', EMPLOYEES),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when content is empty string', async () => {
      mockFetch.mockResolvedValueOnce(
        buildOkResponse(''),
      );

      await expect(
        service.composeEmailDraft('some prompt', EMPLOYEES),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
