import { EmployeeSummary } from "./ai.service";

/**
 * Minimum word length for word-level fuzzy matching.
 * Words shorter than this (e.g. single letters like "A") are skipped
 * to avoid false positives like 'a' matching 'external@gmail.com'.
 */
const MIN_WORD_LENGTH = 2;

/**
 * Compute a fuzzy match score between a candidate string and a query string.
 *
 * Scoring tiers:
 *   3 — exact match (case-insensitive)
 *   2 — one string contains the other
 *   1 — at least one meaningful word overlaps
 *   0 — no match
 *
 * Pure function — no side effects, no I/O.
 */
export function fuzzyMatchScore(candidate: string, query: string): number {
  const c = candidate.toLowerCase();
  const q = query.toLowerCase();
  if (c === q) return 3;
  if (c.includes(q) || q.includes(c)) return 2;
  // Check if any meaningful word in the candidate matches a word in the query
  const cWords = c.split(/\s+/).filter((w) => w.length >= MIN_WORD_LENGTH);
  const qWords = q.split(/\s+/).filter((w) => w.length >= MIN_WORD_LENGTH);
  if (cWords.length === 0 || qWords.length === 0) return 0;
  const hasWordMatch = cWords.some((cw) =>
    qWords.some((qw) => cw === qw || cw.includes(qw) || qw.includes(cw)),
  );
  if (hasWordMatch) return 1;
  return 0;
}

/**
 * Resolve a recipient name extracted by the AI against the active employee list.
 *
 * Returns:
 *   - `{ match: employee }` when exactly one confident match is found
 *   - `{ candidates: employee[] }` when zero or multiple matches are found
 *     (includes the full active list when recipientName is empty)
 *
 * Pure function — no side effects, no I/O.
 */
export function resolveRecipient(
  recipientName: string,
  employees: EmployeeSummary[],
): { match: EmployeeSummary } | { candidates: EmployeeSummary[] } {
  if (!recipientName || recipientName.trim() === "") {
    return { candidates: employees };
  }

  const scored = employees
    .map((e) => ({
      employee: e,
      score: fuzzyMatchScore(e.name, recipientName),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { candidates: employees };
  }

  const topScore = scored[0].score;
  const topMatches = scored.filter((x) => x.score === topScore);

  if (topMatches.length === 1 && topScore >= 1) {
    return { match: topMatches[0].employee };
  }

  // Multiple equally-scoring matches → ambiguous
  return { candidates: topMatches.map((x) => x.employee) };
}
