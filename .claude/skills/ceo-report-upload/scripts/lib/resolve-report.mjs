/**
 * resolve-report.mjs — Pure match/resolve helpers for ceo-report-upload.
 *
 * No process.exit, no side effects, no readline — fully injectable.
 * Imported by both report-upload.mjs (entrypoint) and report-upload.test.mjs.
 */

// ---------------------------------------------------------------------------
// URL / ID detection
// ---------------------------------------------------------------------------

/**
 * If the input looks like a URL containing a report id, extract the id.
 * Patterns:
 *   https://host/reports/<id>
 *   https://host/anything/reports/<id>
 *   https://host/reports/<id>/...
 *
 * @param {string} input
 * @returns {string|null}
 */
export function extractIdFromUrl(input) {
  if (!input.match(/^https?:\/\//i)) return null;
  const match = input.match(/\/reports\/([^/?#\s]+)/i);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Report resolution
// ---------------------------------------------------------------------------

/**
 * Resolve which report to update/create given the user's identifier input.
 *
 * Returns:
 *   { action: 'put', reportId, reportTitle }   — edit existing
 *   { action: 'post', title }                  — create new
 *   { action: 'cancel' }                       — user cancelled
 *   { action: 'error', message }               — unrecoverable error
 *
 * @param {string} identifier  — user-supplied name or URL
 * @param {object} config      — { apiUrl, token }
 * @param {object} opts
 * @param {boolean}  opts.dryRun
 * @param {Function} opts.fetchFn  — fetch-compatible function
 * @param {Function} opts.promptFn — async (question: string) => string
 *                                   Caller supplies readline prompt or a test stub.
 * @param {Function} opts.logFn    — (msg: string) => void  (optional, defaults to console.log)
 */
export async function resolveReport(identifier, config, opts = {}) {
  const {
    dryRun = false,
    fetchFn = fetch,
    promptFn,
    logFn = (msg) => process.stdout.write(msg + '\n'),
  } = opts;

  // ---- Branch 1: URL / link with embedded id ------------------------------
  const extractedId = extractIdFromUrl(identifier);

  if (extractedId) {
    logFn('Nhận diện link URL. Trích report id: ' + extractedId);

    if (dryRun) {
      logFn('[DRY-RUN] Sẽ gọi GET /api/reports/' + extractedId);
      return { action: 'put', reportId: extractedId, reportTitle: '[dry-run-title]' };
    }

    const res = await fetchFn(config.apiUrl + '/api/reports/' + extractedId, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + config.token,
      },
    });

    let body;
    try { body = await res.json(); } catch { body = null; }

    if (res.status === 401) return { action: 'error', message: '401' };
    if (res.status === 404 || !res.ok) {
      return {
        action: 'error',
        message: "Không tìm thấy báo cáo với id '" + extractedId + "'. Vui lòng kiểm tra lại link.",
      };
    }

    const report = body?.data || body;
    return { action: 'put', reportId: extractedId, reportTitle: report?.title || extractedId };
  }

  // ---- Branch 2: Search by name -------------------------------------------
  const searchName = identifier.trim();
  const searchParam = encodeURIComponent(searchName);

  if (dryRun) {
    logFn('[DRY-RUN] Sẽ gọi GET /api/reports?search=' + searchParam);
    return { action: '_dry_run_name_search', searchName };
  }

  const res = await fetchFn(config.apiUrl + '/api/reports?search=' + searchParam, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + config.token,
    },
  });

  let body;
  try { body = await res.json(); } catch { body = null; }

  if (res.status === 401) return { action: 'error', message: '401' };
  if (!res.ok) return { action: 'error', message: 'Lỗi khi tìm kiếm báo cáo. HTTP ' + res.status };

  // Support both { data: [...] } and { data: { data: [...] } } (paginated wrapper)
  const reports = body?.data?.data || body?.data || [];

  if (reports.length === 0) {
    const answer = await promptFn("Không tìm thấy báo cáo '" + searchName + "'. Tạo báo cáo mới? (y/N): ");
    if (answer.toLowerCase() === 'y') return { action: 'post', title: searchName };
    return { action: 'cancel' };
  }

  if (reports.length === 1) {
    const r = reports[0];
    return { action: 'put', reportId: r.id, reportTitle: r.title };
  }

  // Multiple matches — list and let user pick
  logFn("Tìm thấy nhiều báo cáo khớp tên '" + searchName + "'. Chọn một:");
  reports.forEach((r, i) => {
    logFn('  ' + (i + 1) + '. ' + r.title + ' (id: ' + r.id + ')');
  });

  while (true) {
    const raw = await promptFn('Nhập số thứ tự (1-' + reports.length + '): ');
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1 && n <= reports.length) {
      const chosen = reports[n - 1];
      return { action: 'put', reportId: chosen.id, reportTitle: chosen.title };
    }
    logFn('Lựa chọn không hợp lệ. Vui lòng nhập số từ 1 đến ' + reports.length + ':');
  }
}
