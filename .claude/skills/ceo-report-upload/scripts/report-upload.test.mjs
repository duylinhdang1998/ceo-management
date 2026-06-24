#!/usr/bin/env node
/**
 * report-upload.test.mjs — Unit tests for match logic and 401 handling.
 *
 * Imports extractIdFromUrl + resolveReport from lib/resolve-report.mjs.
 * Provides a mocked fetch and a queue-based promptFn for user-input simulation.
 * No external test runner needed — runs as a plain Node.js script.
 *
 * Run: node report-upload.test.mjs
 *
 * Covers (from 4.S-claude-skill.feature @integration scenarios):
 *   T1  Match by URL — existing report → PUT
 *   T2  Match by URL — 404 → error
 *   T3  Match by name — 0 results → cancel (user inputs N)
 *   T4  Match by name — 0 results → create new (user inputs y)
 *   T5  Match by name — 1 result → PUT automatically
 *   T6  Match by name — multiple results → user picks #2 → PUT
 *   T7  Match by URL — 401 → clearToken + error message
 *   T8  extractIdFromUrl — various URL shapes
 */

import { extractIdFromUrl, resolveReport } from './lib/resolve-report.mjs';

// ---------------------------------------------------------------------------
// Minimal test runner (no deps)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error('ASSERT FAILED: ' + message);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  [PASS] ' + name);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log('  [FAIL] ' + name);
    console.log('         ' + e.message);
  }
}

// ---------------------------------------------------------------------------
// Mock fetch factory
// ---------------------------------------------------------------------------

/**
 * Returns a fetch-compatible function that returns predefined responses
 * based on URL substring matching. Each entry: { urlContains, status, body }
 */
function makeMockFetch(responses) {
  return async function mockFetch(url) {
    const match = responses.find((r) => url.includes(r.urlContains));
    if (!match) {
      throw new Error('No mock response defined for URL: ' + url);
    }
    return {
      ok: match.status >= 200 && match.status < 300,
      status: match.status,
      json: async () => match.body,
    };
  };
}

/**
 * Returns a promptFn that drains a pre-supplied queue of user inputs.
 */
function makeQueuePromptFn(userInputs) {
  const inputQueue = [...userInputs];
  return (label) => {
    const val = inputQueue.shift();
    if (val === undefined) throw new Error('No more user input queued for prompt: ' + label);
    return Promise.resolve(val);
  };
}

// Fake config (token is not validated by mock fetch)
const fakeConfig = { apiUrl: 'https://api.test.com', token: 'test-token-123' };

// Silence log output from resolveReport during tests
const noopLog = () => {};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log('\n=== ceo-report-upload — Unit / Match Logic Tests ===\n');

// T8: extractIdFromUrl — pure function, no fetch needed
console.log('extractIdFromUrl():');

await test('T8a: HTTPS URL with /reports/<id>', () => {
  assert(extractIdFromUrl('https://app.company.com/reports/abc-789') === 'abc-789', 'should extract abc-789');
});

await test('T8b: URL with /reports/<id>/extra-path', () => {
  assert(extractIdFromUrl('https://host/reports/rpt-uuid-001/view') === 'rpt-uuid-001', 'should extract rpt-uuid-001');
});

await test('T8c: URL with query string', () => {
  assert(extractIdFromUrl('https://host/reports/id-123?tab=notes') === 'id-123', 'should extract id-123');
});

await test('T8d: plain name string → returns null', () => {
  assert(extractIdFromUrl('Doanh thu quý 2') === null, 'plain name should return null');
});

await test('T8e: no http prefix → returns null', () => {
  assert(extractIdFromUrl('app.company.com/reports/123') === null, 'without http should return null');
});

await test('T8f: URL without /reports/ path → returns null', () => {
  assert(extractIdFromUrl('https://host/other/path') === null, 'no /reports/ should return null');
});

// T1: Match by URL — found
console.log('\nresolveReport() — URL match:');

await test('T1: URL with existing id → action=put with correct reportId', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports/abc-789',
      status: 200,
      body: { data: { id: 'abc-789', title: 'Báo cáo Chi phí' } },
    },
  ]);

  const result = await resolveReport(
    'https://app.company.com/reports/abc-789',
    fakeConfig,
    { fetchFn, logFn: noopLog },
  );

  assert(result.action === 'put', 'action should be put');
  assert(result.reportId === 'abc-789', 'reportId should be abc-789');
  assert(result.reportTitle === 'Báo cáo Chi phí', 'reportTitle should match');
});

// T2: Match by URL — 404
await test('T2: URL with non-existent id → action=error with 404 message', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports/id-khong-ton-tai',
      status: 404,
      body: { message: 'Not found' },
    },
  ]);

  const result = await resolveReport(
    'https://app.company.com/reports/id-khong-ton-tai',
    fakeConfig,
    { fetchFn, logFn: noopLog },
  );

  assert(result.action === 'error', 'action should be error');
  assert(result.message.includes('id-khong-ton-tai'), 'error message should include the id');
  assert(result.message.includes('Không tìm thấy'), 'error message should say not found');
});

// T7: 401 on URL match
await test('T7a: URL match returns 401 → action=error with message "401"', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports/some-id',
      status: 401,
      body: { message: 'Unauthorized' },
    },
  ]);

  const result = await resolveReport(
    'https://host/reports/some-id',
    fakeConfig,
    { fetchFn, logFn: noopLog },
  );

  assert(result.action === 'error', 'action should be error');
  assert(result.message === '401', 'message should be 401');
});

// Name search tests
console.log('\nresolveReport() — name search:');

// T5: 1 result → auto PUT
await test('T5: name search returns 1 result → action=put automatically', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports?search=',
      status: 200,
      body: { data: { data: [{ id: 'rpt-uuid-001', title: 'Doanh thu quý 2' }] } },
    },
  ]);

  const result = await resolveReport('Doanh thu quý 2', fakeConfig, { fetchFn, logFn: noopLog });

  assert(result.action === 'put', 'action should be put');
  assert(result.reportId === 'rpt-uuid-001', 'should pick the only result');
  assert(result.reportTitle === 'Doanh thu quý 2', 'title should match');
});

// T3: 0 results → user says N → cancel
await test('T3: name search returns 0 → user inputs "N" → action=cancel', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports?search=',
      status: 200,
      body: { data: { data: [] } },
    },
  ]);

  const result = await resolveReport('Kế hoạch 2027', fakeConfig, {
    fetchFn,
    logFn: noopLog,
    promptFn: makeQueuePromptFn(['N']),
  });

  assert(result.action === 'cancel', 'action should be cancel');
});

// T4: 0 results → user says y → create new
await test('T4: name search returns 0 → user inputs "y" → action=post', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports?search=',
      status: 200,
      body: { data: { data: [] } },
    },
  ]);

  const result = await resolveReport('Kế hoạch 2027', fakeConfig, {
    fetchFn,
    logFn: noopLog,
    promptFn: makeQueuePromptFn(['y']),
  });

  assert(result.action === 'post', 'action should be post');
  assert(result.title === 'Kế hoạch 2027', 'title should be the searched name');
});

// T6: multiple results → user picks #2
await test('T6: name search returns 3 results → user picks 2 → action=put for r2', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports?search=',
      status: 200,
      body: {
        data: {
          data: [
            { id: 'r1', title: 'Doanh thu quý 1' },
            { id: 'r2', title: 'Doanh thu quý 2' },
            { id: 'r3', title: 'Doanh thu quý 3' },
          ],
        },
      },
    },
  ]);

  const result = await resolveReport('Doanh thu', fakeConfig, {
    fetchFn,
    logFn: noopLog,
    promptFn: makeQueuePromptFn(['2']),
  });

  assert(result.action === 'put', 'action should be put');
  assert(result.reportId === 'r2', 'should pick r2 (index 1 = choice 2)');
  assert(result.reportTitle === 'Doanh thu quý 2', 'title should be quý 2');
});

// T6b: out-of-range input then valid
await test('T6b: invalid pick "5" then valid "1" → picks r1', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports?search=',
      status: 200,
      body: {
        data: {
          data: [
            { id: 'r1', title: 'Doanh thu quý 1' },
            { id: 'r2', title: 'Doanh thu quý 2' },
            { id: 'r3', title: 'Doanh thu quý 3' },
          ],
        },
      },
    },
  ]);

  const result = await resolveReport('Doanh thu', fakeConfig, {
    fetchFn,
    logFn: noopLog,
    promptFn: makeQueuePromptFn(['5', '1']),  // first invalid, then valid
  });

  assert(result.action === 'put', 'action should be put');
  assert(result.reportId === 'r1', 'should pick r1 after retry');
});

// T7b: 401 on name search
await test('T7b: name search returns 401 → action=error with message "401"', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports?search=',
      status: 401,
      body: { message: 'Token revoked' },
    },
  ]);

  const result = await resolveReport('Báo cáo nào đó', fakeConfig, { fetchFn, logFn: noopLog });

  assert(result.action === 'error', 'action should be error');
  assert(result.message === '401', 'message should be 401');
});

// Paginated response format test (flat data.data[] vs data[])
await test('T5b: supports flat data[] response format (no pagination wrapper)', async () => {
  const fetchFn = makeMockFetch([
    {
      urlContains: '/api/reports?search=',
      status: 200,
      body: { data: [{ id: 'flat-id', title: 'Flat Report' }] },
    },
  ]);

  const result = await resolveReport('Flat Report', fakeConfig, { fetchFn, logFn: noopLog });

  assert(result.action === 'put', 'action should be put');
  assert(result.reportId === 'flat-id', 'should handle flat data format');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(50));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach((f) => {
    console.log('  - ' + f.name + ': ' + f.error);
  });
  process.exit(1);
} else {
  console.log('All tests passed.');
  process.exit(0);
}
