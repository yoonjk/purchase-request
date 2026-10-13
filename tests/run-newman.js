/**
 * Newman 실행기: 컬렉션을 실행하고 비밀정보가 없는 정규화 JSON 리포트를 생성한다.
 *   node tests/run-newman.js <purchase|hr>
 *
 * - .env 의 TEST_LOGIN_ID / TEST_LOGIN_PASSWORD 를 Postman 환경 변수(loginId/loginPassword)로 주입한다.
 * - TEST_DB_CONFIRMED=true 가 아니면 "[MUTATION]" 폴더는 실행하지 않고 skipped 로 보고한다.
 * - 요청 body/header/cookie 는 리포트에 기록하지 않는다 (비밀번호, CSRF 토큰, 세션 쿠키 노출 방지).
 * - 테스트가 실패해도 리포트를 쓴 뒤 종료 코드로 실패를 전달한다.
 */
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const newman = require('newman');

const suite = process.argv[2];
if (!['purchase', 'hr'].includes(suite)) {
  console.error('usage: node tests/run-newman.js <purchase|hr>');
  process.exit(2);
}

const collectionPath = path.join(__dirname, 'api', `${suite}.postman_collection.json`);
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const mutationsAllowed = process.env.TEST_DB_CONFIRMED === 'true';
const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
const MUT = '[MUTATION]';

const allFolders = collection.item.map((f) => f.name);
const runFolders = allFolders.filter((n) => mutationsAllowed || !n.startsWith(MUT));
const skippedFolders = collection.item.filter((f) => !runFolders.includes(f.name));

if (!process.env.TEST_LOGIN_ID || !process.env.TEST_LOGIN_PASSWORD) {
  console.error('TEST_LOGIN_ID / TEST_LOGIN_PASSWORD 환경변수가 필요합니다 (.env).');
  process.exit(2);
}

const redact = (s) => {
  let out = String(s ?? '');
  for (const secret of [process.env.TEST_LOGIN_PASSWORD, process.env.TEST_LOGIN_ID]) {
    if (secret) out = out.split(secret).join('***');
  }
  return out;
};

const startedAt = new Date();
newman.run(
  {
    collection,
    folder: runFolders,
    envVar: [
      { key: 'baseUrl', value: baseUrl },
      { key: 'loginId', value: process.env.TEST_LOGIN_ID },
      { key: 'loginPassword', value: process.env.TEST_LOGIN_PASSWORD },
    ],
    reporters: ['cli'],
    reporter: { cli: { noBanner: true } },
    timeoutRequest: 15000,
  },
  (err, summary) => {
    const finishedAt = new Date();
    const tests = [];
    for (const ex of summary?.run?.executions ?? []) {
      const assertions = (ex.assertions ?? []).map((a) => ({
        name: a.assertion,
        status: a.skipped ? 'skipped' : a.error ? 'failed' : 'passed',
        error: a.error ? redact(a.error.message) : undefined,
      }));
      const reqError = ex.requestError ? redact(ex.requestError.message) : undefined;
      const failed = !!reqError || assertions.some((a) => a.status === 'failed');
      tests.push({
        id: (ex.item.name.match(/^\[([^\]]+)\]/) || [])[1] ?? ex.item.name,
        name: ex.item.name,
        method: ex.request?.method,
        httpStatus: ex.response?.code,
        status: failed ? 'failed' : 'passed',
        assertions,
        error: reqError,
      });
    }
    for (const f of skippedFolders) {
      for (const it of f.item) {
        tests.push({
          id: (it.name.match(/^\[([^\]]+)\]/) || [])[1] ?? it.name,
          name: it.name,
          method: it.request.method,
          status: 'skipped',
          assertions: [],
          skipReason: 'TEST_DB_CONFIRMED=true 가 아니므로 데이터 변경 폴더를 건너뜀',
        });
      }
    }
    const count = (s) => tests.filter((t) => t.status === s).length;
    const asserts = summary?.run?.stats?.assertions ?? { total: 0, failed: 0 };
    const report = {
      schemaVersion: 1,
      tool: 'newman',
      application: 'purchase-request',
      module: suite.toUpperCase(),
      type: 'API',
      baseUrl,
      mutationsExecuted: mutationsAllowed,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt - startedAt,
      stats: { total: tests.length, passed: count('passed'), failed: count('failed'), skipped: count('skipped') },
      assertionStats: { total: asserts.total, failed: asserts.failed },
      runError: err ? redact(err.message) : undefined,
      tests,
    };
    const outDir = path.join(__dirname, '..', 'reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${suite}-api.json`);
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
    console.log(`\n[${suite} API] total=${report.stats.total} passed=${report.stats.passed} failed=${report.stats.failed} skipped=${report.stats.skipped}`);
    console.log(`JSON report: ${path.relative(process.cwd(), outFile)}`);
    process.exit(err || report.stats.failed > 0 ? 1 : 0);
  },
);
