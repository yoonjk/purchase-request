/**
 * Result Publisher: reports/*.json 을 Hub Result Collector 로 전송한다.
 *   node tests/publish-results.js [report.json ...]   (인자가 없으면 reports/*.json 전체)
 *
 * - 원본 Newman/Playwright 리포트를 다시 파싱하지 않고, 러너가 만든 정규화 JSON 을 그대로 전송한다.
 * - execution_id 는 리포트 옆 사이드카 파일(reports/.execution-ids.json)에 보존한다.
 *   전송에 실패해도 같은 ID 로 재시도하고, 같은 리포트 파일이 새로 생성되면(startedAt 변경) 새 ID 를 발급한다.
 * - 토큰은 로그/리포트에 출력하지 않는다.
 * - 종료 코드: 0=업로드 모두 성공, 1=업로드 실패 존재, 2=설정 오류.
 *   (테스트 성공/실패 여부는 종료 코드에 반영하지 않고 별도로 출력한다.)
 */
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const reportsDir = path.join(root, 'reports');
const idFile = path.join(reportsDir, '.execution-ids.json');

const hubUrl = (process.env.HUB_URL || '').replace(/\/+$/, '');
const token = process.env.HUB_TEST_API_TOKEN || '';
const appIds = { PURCHASE: process.env.HUB_APP_ID_PURCHASE, HR: process.env.HUB_APP_ID_HR };

if (!hubUrl || !token || !appIds.PURCHASE || !appIds.HR) {
  console.error('HUB_URL / HUB_TEST_API_TOKEN / HUB_APP_ID_PURCHASE / HUB_APP_ID_HR 환경변수가 필요합니다 (.env).');
  process.exit(2);
}
// 운영 서버로 잘못 전송하는 것을 막는다: localhost 가 아니면 TEST_DB_CONFIRMED=true 필수.
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(hubUrl);
if (!isLocal && process.env.TEST_DB_CONFIRMED !== 'true') {
  console.error('HUB_URL 이 localhost 가 아니므로 TEST_DB_CONFIRMED=true 가 필요합니다.');
  process.exit(2);
}

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : fs.existsSync(reportsDir)
    ? fs.readdirSync(reportsDir).filter((f) => /^[a-z]+-(api|ui)\.json$/.test(f)).sort().map((f) => path.join(reportsDir, f))
    : [];
if (files.length === 0) { console.error('업로드할 리포트(reports/*.json)가 없습니다.'); process.exit(2); }

const ids = fs.existsSync(idFile) ? JSON.parse(fs.readFileSync(idFile, 'utf8')) : {};

function executionIdFor(file, report) {
  const key = path.basename(file);
  const stamp = `${report.startedAt}|${report.finishedAt}`;
  if (ids[key] && ids[key].stamp === stamp) return ids[key].executionId; // 재시도: 동일 ID
  const id = `${report.module}-${report.type}-${report.startedAt.replace(/[^0-9A-Za-z]/g, '')}-${crypto.randomBytes(4).toString('hex')}`;
  ids[key] = { stamp, executionId: id };
  fs.writeFileSync(idFile, JSON.stringify(ids, null, 2));
  return id;
}

function validate(report) {
  const s = report?.stats;
  return report && report.schemaVersion === 1 && ['PURCHASE', 'HR'].includes(report.module)
    && ['API', 'UI'].includes(report.type) && Array.isArray(report.tests) && s
    && s.total === s.passed + s.failed + s.skipped && s.total === report.tests.length;
}

async function send(file) {
  let report;
  try { report = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return { file, ok: false, reason: 'JSON 파싱 실패' }; }
  if (!validate(report)) return { file, ok: false, reason: '리포트 구조 검증 실패' };
  const executionId = executionIdFor(file, report);
  const body = JSON.stringify({ executionId, applicationId: appIds[report.module], report });
  try {
    const res = await fetch(`${hubUrl}/api/modernization/test-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body,
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    let msg = '';
    try { msg = JSON.parse(text).message || ''; } catch { /* body 가 JSON 이 아님 */ }
    return { file, executionId, report, status: res.status, ok: res.status === 200 || res.status === 201,
      duplicate: res.status === 200, reason: res.ok ? '' : `HTTP ${res.status}${msg ? ' ' + msg : ''}` };
  } catch (e) {
    return { file, executionId, report, ok: false, reason: `전송 오류: ${e.name}` };
  }
}

(async () => {
  const out = [];
  for (const f of files) out.push(await send(f));
  console.log('\n===== 테스트 결과 (리포트 기준) =====');
  for (const r of out.filter((x) => x.report)) {
    const s = r.report.stats;
    console.log(`${r.report.module.padEnd(8)} ${r.report.type.padEnd(3)} total=${s.total} passed=${s.passed} failed=${s.failed} skipped=${s.skipped}`);
  }
  console.log('\n===== 업로드 결과 =====');
  for (const r of out) {
    const name = path.basename(r.file);
    console.log(`${r.ok ? (r.duplicate ? 'DUPLICATE(OK)' : 'UPLOADED     ') : 'FAILED       '} ${name}${r.ok ? '' : ' - ' + r.reason}`);
  }
  const failed = out.filter((r) => !r.ok).length;
  console.log(`\n업로드 ${out.length - failed}/${out.length} 성공${failed ? ` (실패 ${failed}건은 같은 execution_id 로 재시도 가능: npm run test:publish)` : ''}`);
  process.exit(failed ? 1 : 0);
})();
