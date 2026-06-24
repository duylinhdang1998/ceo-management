#!/usr/bin/env node
/**
 * report-upload.mjs — CEO Report Upload Skill helper script
 *
 * Usage:
 *   node report-upload.mjs --file <path> --report <name-or-url> [--dry-run]
 *   node report-upload.mjs --help
 *
 * Requirements: Node 20+ (uses built-in fetch, fs/promises, readline/promises)
 * No external npm dependencies.
 *
 * Config stored at: ~/.config/ceo-report-skill/config.json  (chmod 600)
 * Config contains: { apiUrl, token }  — NO passwords stored.
 */

import { readFile, writeFile, mkdir, access, chmod } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { homedir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
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
  const args = { file: null, report: null, dryRun: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { args.help = true; }
    else if (arg === '--dry-run') { args.dryRun = true; }
    else if ((arg === '--file' || arg === '-f') && argv[i + 1]) { args.file = argv[++i]; }
    else if ((arg === '--report' || arg === '-r') && argv[i + 1]) { args.report = argv[++i]; }
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
  node report-upload.mjs --file <path.html> --report <tên hoặc URL> [--dry-run]
  node report-upload.mjs --help

Options:
  --file, -f    <path>   Đường dẫn file HTML cần upload (bắt buộc)
  --report, -r  <text>   Tên báo cáo hoặc URL dạng https://host/reports/<id>
  --dry-run              Không gọi API thật, chỉ in ra các bước sẽ thực hiện
  --help, -h             Hiển thị trợ giúp này

Config: ~/.config/ceo-report-skill/config.json  (chmod 600)
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

async function clearToken() {
  const config = await loadConfig();
  if (config) {
    delete config.token;
    await saveConfig(config);
  }
}

// ---------------------------------------------------------------------------
// Interactive prompts (readline/promises)
// ---------------------------------------------------------------------------

function makeReadline() {
  return createInterface({ input, output, terminal: true });
}

async function prompt(rl, question) {
  return (await rl.question(question)).trim();
}

async function promptPassword(rl, question) {
  // Node readline doesn't have built-in hide; we write the question manually
  process.stdout.write(question);
  return new Promise((resolve) => {
    let password = '';
    const stdin = process.stdin;
    const wasPaused = stdin.isPaused();
    if (wasPaused) stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    const handler = (ch) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false);
        stdin.removeListener('data', handler);
        if (wasPaused) stdin.pause();
        process.stdout.write('\n');
        resolve(password);
      } else if (ch === '') {
        // Ctrl+C
        process.exit(1);
      } else if (ch === '' || ch === '\b') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += ch;
        process.stdout.write('*');
      }
    };
    stdin.on('data', handler);
  });
}

// ---------------------------------------------------------------------------
// First-run setup
// ---------------------------------------------------------------------------

/**
 * Run interactive first-run setup:
 *   1. Ask API base URL
 *   2. Ask CEO email + password
 *   3. POST /api/auth/login → get accessToken
 *   4. Save { apiUrl, token } to config (chmod 600)
 *
 * Returns the resulting config object.
 *
 * @param {object} opts
 * @param {boolean} opts.dryRun
 */
async function runFirstTimeSetup(opts = {}) {
  const { dryRun = false } = opts;

  log('');
  log('=== Thiết lập lần đầu (First-run Setup) ===');
  log('Config sẽ được lưu tại: ' + CONFIG_PATH);
  log('Mật khẩu KHÔNG được lưu lại.');
  log('');

  const rl = makeReadline();

  let apiUrl;
  while (true) {
    apiUrl = await prompt(rl, 'Nhập API base URL của hệ thống (vd: https://api.company.com): ');
    if (apiUrl && apiUrl.startsWith('http')) break;
    log('URL không hợp lệ. Phải bắt đầu bằng http:// hoặc https://');
  }
  // Strip trailing slash
  apiUrl = apiUrl.replace(/\/$/, '');

  const email = await prompt(rl, 'Nhập email CEO: ');

  let password;
  try {
    password = await promptPassword(rl, 'Nhập mật khẩu CEO: ');
  } catch {
    // Fallback for non-TTY (e.g. tests piping stdin)
    password = await prompt(rl, 'Nhập mật khẩu CEO: ');
  }

  rl.close();

  if (dryRun) {
    log('[DRY-RUN] Sẽ gọi POST ' + apiUrl + '/api/auth/login với email: ' + email);
    const fakeConfig = { apiUrl, token: 'dry-run-token' };
    log('[DRY-RUN] Lưu config: ' + JSON.stringify(fakeConfig));
    return fakeConfig;
  }

  // POST /api/auth/login
  log('');
  log('Đang đăng nhập...');

  let loginRes;
  try {
    loginRes = await fetch(apiUrl + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (e) {
    err('Không thể kết nối tới API: ' + e.message);
    err('Kiểm tra lại API URL và kết nối mạng.');
    process.exit(1);
  }

  if (!loginRes.ok) {
    if (loginRes.status === 401) {
      err('Đăng nhập thất bại. Vui lòng kiểm tra email/mật khẩu.');
    } else {
      err('Đăng nhập thất bại. HTTP ' + loginRes.status);
    }
    process.exit(1);
  }

  let loginBody;
  try {
    loginBody = await loginRes.json();
  } catch {
    err('Phản hồi từ API không hợp lệ (không phải JSON).');
    process.exit(1);
  }

  // Support both { accessToken } and { data: { accessToken } } shapes
  const token = loginBody.accessToken || loginBody.data?.accessToken;
  if (!token) {
    err('Không tìm thấy accessToken trong phản hồi đăng nhập.');
    process.exit(1);
  }

  const config = { apiUrl, token };
  await saveConfig(config);
  log('Đăng nhập thành công. Config đã lưu tại ' + CONFIG_PATH);
  log('');

  return config;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/**
 * Make an authenticated API request.
 * Returns { ok, status, body }
 */
async function apiRequest(config, method, path, bodyObj, fetchFn = fetch) {
  const url = config.apiUrl + path;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + config.token,
  };
  const options = { method, headers };
  if (bodyObj !== undefined) {
    options.body = JSON.stringify(bodyObj);
  }

  const res = await fetchFn(url, options);
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

// ---------------------------------------------------------------------------
// Upload (PUT or POST)
// ---------------------------------------------------------------------------

async function handle401() {
  await clearToken();
  err('Phiên đăng nhập đã hết hạn hoặc token bị thu hồi. Chạy lại skill để đăng nhập mới.');
  process.exit(1);
}

async function uploadReport(config, resolution, htmlContent, dryRun, fetchFn = fetch) {
  if (resolution.action === 'put') {
    const { reportId, reportTitle } = resolution;
    log("Cập nhật báo cáo '" + reportTitle + "' (id: " + reportId + ')...');

    if (dryRun) {
      log('[DRY-RUN] Sẽ gọi PUT /api/reports/' + reportId + ' với htmlContent (' + htmlContent.length + ' bytes)');
      log("[DRY-RUN] Đã cập nhật báo cáo '" + reportTitle + "' thành công.");
      return;
    }

    const { ok, status, body } = await apiRequest(
      config,
      'PUT',
      '/api/reports/' + reportId,
      { htmlContent },
      fetchFn,
    );

    if (status === 401) await handle401();
    if (!ok) {
      err('Cập nhật thất bại. HTTP ' + status + ': ' + JSON.stringify(body));
      process.exit(1);
    }
    log("Đã cập nhật báo cáo '" + reportTitle + "' thành công.");

  } else if (resolution.action === 'post') {
    const { title } = resolution;
    log("Tạo báo cáo mới '" + title + "'...");

    if (dryRun) {
      log('[DRY-RUN] Sẽ gọi POST /api/reports với title="' + title + '" và htmlContent (' + htmlContent.length + ' bytes)');
      log("[DRY-RUN] Đã tạo báo cáo mới '" + title + "' thành công. ID: dry-run-id");
      return;
    }

    const { ok, status, body } = await apiRequest(
      config,
      'POST',
      '/api/reports',
      { title, htmlContent, status: 'draft' },
      fetchFn,
    );

    if (status === 401) await handle401();
    if (!ok) {
      err('Tạo báo cáo thất bại. HTTP ' + status + ': ' + JSON.stringify(body));
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

  // Read HTML content
  const htmlContent = await readFile(filePath, 'utf8');
  if (!htmlContent.trim()) {
    err('File HTML rỗng: ' + filePath);
    process.exit(1);
  }

  // Load or setup config
  let config = await loadConfig();

  if (!config || !config.apiUrl || !config.token) {
    config = await runFirstTimeSetup({ dryRun: args.dryRun });
  } else {
    log('Dùng config đã lưu từ ' + CONFIG_PATH);
  }

  // Resolve report — supply readline-backed promptFn for interactive branches
  const resolution = await resolveReport(args.report, config, {
    dryRun: args.dryRun,
    fetchFn: fetch,
    logFn: log,
    promptFn: async (question) => {
      const rl = makeReadline();
      const answer = await prompt(rl, question);
      rl.close();
      return answer;
    },
  });

  if (resolution.action === 'cancel') {
    log('Đã hủy. Không có thay đổi nào được thực hiện.');
    process.exit(0);
  }

  if (resolution.action === 'error') {
    if (resolution.message === '401') {
      await clearToken();
      err('Phiên đăng nhập đã hết hạn hoặc token bị thu hồi. Chạy lại skill để đăng nhập mới.');
    } else {
      err(resolution.message);
    }
    process.exit(1);
  }

  // Upload
  await uploadReport(config, resolution, htmlContent, args.dryRun, fetch);
}

main().catch((e) => {
  err('Lỗi không xử lý được: ' + (e?.message || String(e)));
  process.exit(1);
});
