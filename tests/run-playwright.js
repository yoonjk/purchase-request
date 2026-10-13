/**
 * Playwright 실행기: 지정한 spec 을 실행하고 (실패해도) JSON 리포트를 만든다.
 *   node tests/run-playwright.js <suite-name> <spec-file...>
 *
 * 산출물
 *   test-results/<suite>.json         Playwright 원본 JSON (비밀값 마스킹됨)
 *   reports/<suite>-ui.json           정규화 요약 (Result Collector 입력용)
 */
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [suite, ...specs] = process.argv.slice(2);
if (!suite || specs.length === 0) {
  console.error('usage: node tests/run-playwright.js <suite-name> <spec-file...>');
  process.exit(2);
}

const root = path.join(__dirname, '..');
const rawName = `${suite}-ui-raw`;
const rawFile = path.join(root, 'test-results', `${rawName}.json`);
fs.rmSync(rawFile, { force: true });

const startedAt = new Date();
const r = spawnSync(
  path.join(root, 'node_modules', '.bin', 'playwright'),
  ['test', ...specs],
  { cwd: root, stdio: 'inherit', env: { ...process.env, PW_JSON_REPORT: rawName } },
);
const finishedAt = new Date();

const redact = (s) => {
  let out = String(s ?? '');
  for (const secret of [process.env.TEST_LOGIN_PASSWORD, process.env.TEST_LOGIN_ID]) {
    if (secret) out = out.split(secret).join('***');
  }
  return out.replace(/\x1b\[[0-9;]*m/g, '');
};

if (!fs.existsSync(rawFile)) {
  console.error('Playwright JSON 리포트가 생성되지 않았습니다 (실행 오류).');
  process.exit(r.status || 1);
}

// 원본 마스킹 후 다시 저장
const rawText = redact(fs.readFileSync(rawFile, 'utf8'));
fs.writeFileSync(rawFile, rawText);
const raw = JSON.parse(rawText);

const tests = [];
const walk = (suites) => {
  for (const s of suites ?? []) {
    for (const spec of s.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const results = t.results ?? [];
        const last = results[results.length - 1] ?? {};
        const status = t.status === 'skipped' || last.status === 'skipped' ? 'skipped'
          : t.status === 'expected' ? 'passed'
          : t.status === 'flaky' ? 'passed' : 'failed';
        const annotation = (t.annotations ?? []).find((a) => a.type === 'skip');
        tests.push({
          id: (spec.title.match(/^\[([^\]]+)\]/) || [])[1] ?? spec.title,
          name: spec.title,
          file: spec.file,
          status,
          durationMs: last.duration,
          error: status === 'failed' ? redact((last.error?.message ?? '').split('\n').slice(0, 8).join('\n')) : undefined,
          skipReason: status === 'skipped' ? annotation?.description : undefined,
        });
      }
    }
    walk(s.suites);
  }
};
walk(raw.suites);

const count = (s) => tests.filter((t) => t.status === s).length;
const mod = suite.toUpperCase();
const report = {
  schemaVersion: 1,
  tool: 'playwright',
  application: 'purchase-request',
  module: mod,
  type: 'UI',
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  mutationsExecuted: process.env.TEST_DB_CONFIRMED === 'true',
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt - startedAt,
  stats: { total: tests.length, passed: count('passed'), failed: count('failed'), skipped: count('skipped') },
  tests,
};
const outDir = path.join(root, 'reports');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${suite}-ui.json`);
fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
console.log(`\n[${suite} UI] total=${report.stats.total} passed=${report.stats.passed} failed=${report.stats.failed} skipped=${report.stats.skipped}`);
console.log(`JSON report: ${path.relative(process.cwd(), outFile)}`);
process.exit(r.status === 0 ? 0 : 1);
