import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';

/**
 * Minimal representation of an employee passed to the AI to help it
 * identify the right recipient from a free-text prompt.
 */
export interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
}

/**
 * Structured draft returned by the AI service.
 *
 * `recipientName` is the name as extracted by the model — callers should
 * fuzzy-match this against the `employees` list to resolve the actual user.
 */
export interface EmailDraft {
  recipientName: string;
  subject: string;
  body: string;
}

/**
 * Contract for any AI-backed email composer.
 * Keeping it as an interface lets future sprints swap beeknoee for another
 * provider without touching callers.
 */
export interface IAiService {
  composeEmailDraft(
    prompt: string,
    employees: EmployeeSummary[],
  ): Promise<EmailDraft>;
}

/**
 * AiService — beeknoee gateway (gemini-2.5-flash), OpenAI-compatible.
 *
 * Calls POST ${AI_BASE_URL}/chat/completions with:
 *   model:  AI_MODEL  (gemini-2.5-flash)
 *   Authorization: Bearer ${AI_API_KEY}
 *
 * The response_format approach:
 *   - We instruct the model via system prompt to reply ONLY with a JSON
 *     object matching EmailDraft shape.
 *   - We include the employee list as context so the model can resolve the
 *     recipient by name.
 *   - We parse defensively with a try/catch and attempt to extract valid
 *     JSON even if the model wraps it in a markdown code fence.
 *
 * Env vars:
 *   AI_BASE_URL  (default: https://platform.beeknoee.com/api/v1)
 *   AI_API_KEY
 *   AI_MODEL     (default: gemini-2.5-flash)
 */
@Injectable()
export class AiService implements IAiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.baseUrl =
      process.env.AI_BASE_URL ?? 'https://platform.beeknoee.com/api/v1';
    this.apiKey = process.env.AI_API_KEY ?? '';
    this.model = process.env.AI_MODEL ?? 'gemini-2.5-flash';
  }

  /**
   * Ask the AI to compose an email draft given a CEO prompt and the full
   * list of employees (so the model can identify the correct recipient).
   *
   * Returns { recipientName, subject, body } as structured data.
   * The caller is responsible for resolving recipientName → actual user.
   */
  async composeEmailDraft(
    prompt: string,
    employees: EmployeeSummary[],
  ): Promise<EmailDraft> {
    const employeeListText = employees
      .map((e, i) => `${i + 1}. ${e.name} <${e.email}>`)
      .join('\n');

    const systemPrompt = `You are an AI assistant helping a CEO compose internal emails.
You will receive a prompt describing the email intent and a list of employees.
Identify the recipient from the employee list that best matches the description in the prompt.
Reply with ONLY a valid JSON object in this exact format (no markdown, no code fences):
{
  "recipientName": "<full name of the matched employee>",
  "subject": "<concise email subject line>",
  "body": "<complete email body in plain text>"
}
If no specific recipient is mentioned, use an empty string for recipientName.`;

    const userMessage = `Employee list:\n${employeeListText}\n\nCEO prompt: ${prompt}`;

    this.logger.debug(
      `composeEmailDraft model=${this.model} prompt="${prompt.slice(0, 80)}..."`,
    );

    let rawText: string;
    try {
      rawText = await this.callChatCompletions(systemPrompt, userMessage);
    } catch (err) {
      this.logger.error('AI API call failed', err);
      throw new InternalServerErrorException(
        'AI service unavailable — could not compose email draft',
      );
    }

    return this.parseEmailDraft(rawText);
  }

  /**
   * Low-level call to the OpenAI-compatible /chat/completions endpoint.
   * Returns the raw content string from the first choice.
   */
  private async callChatCompletions(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        // Some OpenAI-compatible gateways support response_format;
        // beeknoee passes this through to Gemini which honours it.
        // We also instruct via system prompt as a fallback.
        response_format: { type: 'json_object' },
        temperature: 0.3, // low temp for deterministic JSON
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `beeknoee /chat/completions returned ${response.status}: ${body}`,
      );
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new Error(
        `Unexpected response shape from AI: ${JSON.stringify(json)}`,
      );
    }

    return content;
  }

  /**
   * Parse the raw text returned by the model into an EmailDraft.
   *
   * Defensive strategy:
   *   1. Try JSON.parse on the full text.
   *   2. Strip markdown code fences (```json ... ```) then parse.
   *   3. Use regex to extract the first {...} block and parse that.
   *   4. If all fail, return a safe fallback so the caller can still
   *      surface something useful rather than a 500.
   */
  private parseEmailDraft(rawText: string): EmailDraft {
    const fallback: EmailDraft = {
      recipientName: '',
      subject: '',
      body: rawText.trim(),
    };

    // Attempt 1 — direct parse
    try {
      return this.validateDraft(JSON.parse(rawText));
    } catch {
      // continue
    }

    // Attempt 2 — strip markdown fences
    const stripped = rawText
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```$/im, '')
      .trim();
    try {
      return this.validateDraft(JSON.parse(stripped));
    } catch {
      // continue
    }

    // Attempt 3 — extract first {...} block
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return this.validateDraft(JSON.parse(match[0]));
      } catch {
        // continue
      }
    }

    this.logger.warn(
      `Could not parse AI response as JSON; returning raw text as body. Raw: ${rawText.slice(0, 200)}`,
    );
    return fallback;
  }

  /** Assert that a parsed object looks like an EmailDraft. */
  private validateDraft(parsed: unknown): EmailDraft {
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('subject' in parsed) ||
      !('body' in parsed)
    ) {
      throw new Error('Parsed object missing required fields');
    }

    const obj = parsed as Record<string, unknown>;
    return {
      recipientName: typeof obj.recipientName === 'string' ? obj.recipientName : '',
      subject: typeof obj.subject === 'string' ? obj.subject : '',
      body: typeof obj.body === 'string' ? obj.body : '',
    };
  }
}
