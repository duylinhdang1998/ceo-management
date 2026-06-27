#!/usr/bin/env node
/**
 * report-upload.mjs — CEO Report Upload Skill helper script
 *
 * Usage:
 *   node report-upload.mjs --api-url <url> --token <PAT> --file <path> --report <name-or-url>
 *   node report-upload.mjs --file <path> --report <name-or-url>   # uses cached config
 *   node report-upload.mjs --dry-run --file <path> --report <name>
 *   node report-upload.mjs --help
 *
 * Auth: Personal Access Token (PAT) only — no email/password login.
 *   Create a PAT on the portal's API Tokens page (Settings → API Tokens).
 *
 * Config cached at: ~/.config/ceo-report-skill/config.json  (chmod 600)
 * Config shape:     { apiUrl, token }
 *
 * Environment variable fallbacks: CEO_API_URL, CEO_API_TOKEN
 *
 * Requirements: Node 18+ (uses built-in fetch, FormData, Blob, fs/promises)
 * No external npm dependencies.
 */

import { readFile, writeFile, mkdir, access, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve, extname, basename } from 'node:path';
import { resolveReport } from './lib/resolve-report.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIG_DIR = join(homedir(), '.config', 'ceo-report-skill');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

// ---------------------------------------------------------------------------
// CLI argument parsing (no external deps)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    file: null,
    report: null,
    apiUrl: null,
    token: null,
    dryRun: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { args.help = true; }
    else if (arg === '--dry-run') { args.dryRun = true; }
    else if ((arg === '--file' || arg === '-f') && argv[i + 1]) { args.file = argv[++i]; }
    else if ((arg === '--report' || arg === '-r') && argv[i + 1]) { args.report = argv[++i]; }
    else if (arg === '--api-url' && argv[i + 1]) { args.apiUrl = argv[++i]; }
    else if (arg === '--token' && argv[i + 1]) { args.token = argv[++i]; }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Print helpers
// ---------------------------------------------------------------------------

function log(msg) { process.stdout.write(msg + '\n'); }
function err(msg) { process.stderr.write('[ERROR] ' + msg + '\n'); }

function printHelp() {
  log(`
ceo-report-upload — Upload hoặc sửa báo cáo HTML lên CEO Management Portal

Usage:
  # First run — provide API URL and PAT (saved to config for later runs):
  node report-upload.mjs --api-url <url> --token <PAT> --file <path.html> --report <tên hoặc URL>

  # Subsequent runs — use cached config:
  node report-upload.mjs --file <path.html> --report <tên hoặc URL>

Options:
  --api-url  <url>   API base URL (e.g. https://api.company.com). Also: CEO_API_URL env.
  --token    <PAT>   Personal Access Token from the portal Tokens page. Also: CEO_API_TOKEN env.
  --file, -f <path>  Đường dẫn file HTML cần upload (bắt buộc)
  --report, -r <text> Tên báo cáo hoặc URL dạng https://host/reports/<id>
  --dry-run          Không gọi API thật, chỉ in ra các bước sẽ thực hiện
  --help, -h         Hiển thị trợ giúp này

Config: ~/.config/ceo-report-skill/config.json  (chmod 600, contains { apiUrl, token })

Get a PAT: Log in to the CEO Management Portal → Settings → API Tokens → Create token.
`);
}

// ---------------------------------------------------------------------------
// Config management
// ---------------------------------------------------------------------------

async function loadConfig() {
  try {
    await access(CONFIG_PATH);
    const raw = await readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveConfig(config) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  await chmod(CONFIG_PATH, 0o600);
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/**
 * Upload (POST or PUT) using multipart/form-data.
 * Node 18+ has built-in FormData + Blob + fetch.
 */
async function uploadReport(config, resolution, fileBuffer, filename, dryRun, fetchFn = fetch) {
  if (resolution.action === 'put') {
    const { reportId, reportTitle } = resolution;
    log("Cập nhật báo cáo '" + reportTitle + "' (id: " + reportId + ')...');

    if (dryRun) {
      log('[DRY-RUN] Sẽ gọi PUT /api/reports/' + reportId + ' (multipart, file=' + filename + ', ' + fileBuffer.length + ' bytes)');
      log("[DRY-RUN] Đã cập nhật báo cáo '" + reportTitle + "' thành công.");
      return;
    }

    const form = new FormData();
    form.append('file', new Blob([fileBuffer], { type: 'text/html' }), filename);

    const res = await fetchFn(config.apiUrl + '/api/reports/' + reportId, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + config.token },
      body: form,
    });

    let body;
    try { body = await res.json(); } catch { body = null; }

    if (res.status === 401) {
      err('Token không hợp lệ hoặc đã bị thu hồi. Kiểm tra lại PAT hoặc truyền --token <PAT> mới.');
      process.exit(1);
    }
    if (!res.ok) {
      err('Cập nhật thất bại. HTTP ' + res.status + ': ' + JSON.stringify(body));
      process.exit(1);
    }
    log("Đã cập nhật báo cáo '" + reportTitle + "' thành công.");

  } else if (resolution.action === 'post') {
    const { title } = resolution;
    log("Tạo báo cáo mới '" + title + "'...");

    if (dryRun) {
      log('[DRY-RUN] Sẽ gọi POST /api/reports (multipart, title="' + title + '", file=' + filename + ', ' + fileBuffer.length + ' bytes)');
      log("[DRY-RUN] Đã tạo báo cáo mới '" + title + "' thành công. ID: dry-run-id");
      return;
    }

    const form = new FormData();
    form.append('title', title);
    form.append('file', new Blob([fileBuffer], { type: 'text/html' }), filename);

    const res = await fetchFn(config.apiUrl + '/api/reports', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + config.token },
      body: form,
    });

    let body;
    try { body = await res.json(); } catch { body = null; }

    if (res.status === 401) {
      err('Token không hợp lệ hoặc đã bị thu hồi. Kiểm tra lại PAT hoặc truyền --token <PAT> mới.');
      process.exit(1);
    }
    if (!res.ok) {
      err('Tạo báo cáo thất bại. HTTP ' + res.status + ': ' + JSON.stringify(body));
      process.exit(1);
    }

    const newReport = body?.data || body;
    const newId = newReport?.id || '(unknown)';
    log("Đã tạo báo cáo mới '" + title + "' thành công. ID: " + newId);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Validate required args
  if (!args.file) {
    err('--file <path> là bắt buộc. Dùng --help để xem hướng dẫn.');
    process.exit(1);
  }
  if (!args.report) {
    err('--report <tên hoặc URL> là bắt buộc. Dùng --help để xem hướng dẫn.');
    process.exit(1);
  }

  const filePath = resolve(args.file);

  // Validate file exists and is .html
  try {
    await access(filePath);
  } catch {
    err('Không tìm thấy file: ' + filePath);
    process.exit(1);
  }

  const ext = extname(filePath).toLowerCase();
  if (ext !== '.html' && ext !== '.htm') {
    err('File phải có đuôi .html hoặc .htm. Nhận được: ' + ext);
    process.exit(1);
  }

  // Read file as buffer (multipart upload)
  const fileBuffer = await readFile(filePath);
  if (fileBuffer.length === 0) {
    err('File HTML rỗng: ' + filePath);
    process.exit(1);
  }
  const filename = basename(filePath);

  // ---------------------------------------------------------------------------
  // Resolve config: CLI flags > env vars > cached config
  // ---------------------------------------------------------------------------
  const cliApiUrl = args.apiUrl || process.env.CEO_API_URL || null;
  const cliToken  = args.token  || process.env.CEO_API_TOKEN || null;

  let config = null;

  if (cliApiUrl && cliToken) {
    // Save and use the provided credentials
    const stripped = cliApiUrl.replace(/\/$/, '');
    config = { apiUrl: stripped, token: cliToken };
    await saveConfig(config);
    log('Config đã lưu tại ' + CONFIG_PATH);
  } else {
    config = await loadConfig();
    if (!config || !config.apiUrl || !config.token) {
      err(
        'Chưa có config. Truyền --api-url <url> --token <PAT> để thiết lập.\n' +
        'PAT được tạo tại: CEO Management Portal → Settings → API Tokens.\n' +
        'Ví dụ:\n' +
        '  node report-upload.mjs --api-url https://api.company.com --token <PAT> \\\n' +
        '    --file report.html --report "Tên báo cáo"'
      );
      process.exit(1);
    }
    log('Dùng config đã lưu từ ' + CONFIG_PATH);
  }

  // Resolve report — no interactive prompts; promptFn not required for URL path,
  // but name-search "0 results" branch needs it. We supply a non-interactive stub
  // that declines (returns 'N') — the agent calling this script should pass a URL
  // or an exact match. For multi-match disambiguation the agent handles that outside.
  const resolution = await resolveReport(args.report, config, {
    dryRun: args.dryRun,
    fetchFn: fetch,
    logFn: log,
    promptFn: async (question) => {
      // Non-interactive: print the question to stderr so the caller (Claude agent)
      // can see it, then return 'N' to cancel rather than hanging on stdin.
      process.stderr.write('[PROMPT] ' + question + '\n');
      process.stderr.write('[INFO] Non-interactive mode: answering N. Pass a URL or exact name to avoid ambiguity.\n');
      return 'N';
    },
  });

  if (resolution.action === 'cancel') {
    log('Không tìm thấy báo cáo khớp. Không có thay đổi nào được thực hiện.');
    log('Gợi ý: Truyền URL dạng https://host/reports/<id> để tạo/cập nhật chính xác.');
    process.exit(0);
  }

  if (resolution.action === 'error') {
    if (resolution.message === '401') {
      err('Token không hợp lệ hoặc đã bị thu hồi. Truyền --token <PAT> mới để cập nhật config.');
    } else {
      err(resolution.message);
    }
    process.exit(1);
  }

  // Upload via multipart
  await uploadReport(config, resolution, fileBuffer, filename, args.dryRun, fetch);
}

main().catch((e) => {
  err('Lỗi không xử lý được: ' + (e?.message || String(e)));
  process.exit(1);
});
