/**
 * Postman Collection v2.1 생성기 (PURCHASE / HR).
 *   node tests/api/build-collections.js
 * 결과: tests/api/purchase.postman_collection.json, tests/api/hr.postman_collection.json
 *
 * - 인증 정보는 컬렉션에 포함하지 않는다. {{loginId}}, {{loginPassword}} 는 실행 시 주입된다.
 * - 이름이 "[MUTATION]" 으로 시작하는 폴더는 DB 데이터를 변경한다. run-newman.js 가
 *   TEST_DB_CONFIRMED=true 일 때만 실행한다.
 */
const fs = require('fs');
const path = require('path');

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';
const MUT = '[MUTATION] ';

// ---------- 스크립트 조각 ----------
const status = (code) => `pm.test('HTTP ${code}', () => pm.response.to.have.status(${code}));`;
const json = (body) => `const j = pm.response.json();\n${body}`;

function req(name, method, urlPath, o = {}) {
  const headers = [];
  if (o.csrf !== false && method !== 'GET') headers.push({ key: 'X-XSRF-TOKEN', value: o.csrfValue ?? '{{csrfToken}}' });
  if (o.json !== undefined) headers.push({ key: 'Content-Type', value: 'application/json' });
  const request = { method, header: headers, url: `{{baseUrl}}${urlPath}` };
  if (o.json !== undefined) {
    request.body = { mode: 'raw', raw: typeof o.json === 'string' ? o.json : JSON.stringify(o.json), options: { raw: { language: 'json' } } };
  }
  if (o.form) {
    request.body = { mode: 'urlencoded', urlencoded: Object.entries(o.form).map(([key, value]) => ({ key, value })) };
  }
  const item = {
    name,
    request,
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: o.test.split('\n') } }],
  };
  if (o.noRedirect) item.protocolProfileBehavior = { followRedirects: false };
  return item;
}

const folder = (name, item, description) => ({ name, description, item });

// ---------- 공통 폴더: 인증 ----------
function unauthenticated(prefix, readPath, writePath, writeBody) {
  return folder('00 Unauthenticated', [
    req(`[${prefix}-01] 비인증 GET ${readPath} → 401`, 'GET', readPath, { test: status(401) }),
    req(`[${prefix}-02] 비인증 POST ${writePath} (CSRF 없음) → 403`, 'POST', writePath, { csrf: false, json: writeBody, test: status(403) }),
  ], '로그인 전 요청. 세션이 없으므로 /api 는 401, CSRF 없는 변경 요청은 403.');
}

function authSetup(prefix) {
  return folder('01 Auth Setup', [
    req(`[${prefix}-S1] CSRF 토큰 발급 (permitAll)`, 'GET', '/api/auth/csrf', {
      test: [status(200), json(
        `pm.test('headerName=X-XSRF-TOKEN', () => pm.expect(j.headerName).to.eql('X-XSRF-TOKEN'));\n` +
        `pm.test('token 존재', () => pm.expect(j.token).to.be.a('string').and.not.empty);\n` +
        `pm.collectionVariables.set('csrfToken', j.token);`)].join('\n'),
    }),
    req(`[${prefix}-S2] 잘못된 비밀번호 로그인 → /login.html?error 로 redirect`, 'POST', '/login', {
      csrf: false, noRedirect: true,
      form: { username: '{{loginId}}', password: 'intentionally-wrong-password-12345', _csrf: '{{csrfToken}}' },
      test: [status(302), `pm.test('Location 에 error 포함', () => pm.expect(pm.response.headers.get('Location')).to.include('/login.html?error'));`].join('\n'),
    }),
    req(`[${prefix}-S3] 정상 로그인 → /dashboard.html 로 redirect`, 'POST', '/login', {
      csrf: false, noRedirect: true,
      form: { username: '{{loginId}}', password: '{{loginPassword}}', _csrf: '{{csrfToken}}' },
      test: [status(302), `pm.test('Location 에 dashboard.html 포함', () => pm.expect(pm.response.headers.get('Location')).to.include('/dashboard.html'));`].join('\n'),
    }),
    req(`[${prefix}-S4] 로그인 후 CSRF 토큰 재발급`, 'GET', '/api/auth/csrf', {
      test: [status(200), json(`pm.collectionVariables.set('csrfToken', j.token);\npm.test('token 갱신', () => pm.expect(j.token).to.be.a('string').and.not.empty);`)].join('\n'),
    }),
    req(`[${prefix}-S5] 인증 확인 GET /api/auth/me`, 'GET', '/api/auth/me', {
      test: [status(200), json(`pm.test('loginId 반환', () => pm.expect(j.loginId).to.be.a('string').and.not.empty);`)].join('\n'),
    }),
  ], '세션 쿠키(JSESSIONID, XSRF-TOKEN)는 Newman cookie jar 가 유지한다. 토큰/쿠키는 리포트에 기록하지 않는다.');
}

function csrfNegative(prefix, writePath, body) {
  return folder('02 CSRF Security', [
    req(`[${prefix}-01] 로그인 상태 + X-XSRF-TOKEN 없이 POST → 403`, 'POST', writePath, { csrf: false, json: body, test: status(403) }),
    req(`[${prefix}-02] 로그인 상태 + 잘못된 X-XSRF-TOKEN → 403`, 'POST', writePath, { csrfValue: 'invalid-token-value', json: body, test: status(403) }),
  ], '기존 CSRF 설정(CookieCsrfTokenRepository) 동작 확인. 403 이므로 DB 변경 없음.');
}

// =====================================================================
// PURCHASE
// =====================================================================
const P = 'PUR-API';
const pBody = (o) => JSON.stringify({ requester: 'nm-tester', test_run_id: '{{runId}}', amount: 1000, budget: 2000, ...o });
const pNo = (key) => { const o = JSON.parse(pBody({})); delete o[key]; return JSON.stringify(o); };
const created = (n, amount, budget, expected, extra = '') => req(
  `[${P}-${n}] 구매 요청 등록 amount=${amount}, budget=${budget} → ${expected}`, 'POST', '/api/purchase-requests',
  {
    json: pBody({ amount, budget }),
    test: [status(201), json(
      `pm.test('status=${expected}', () => pm.expect(j.status).to.eql('${expected}'));\n` +
      `pm.test('echo test_run_id', () => pm.expect(j.test_run_id).to.eql(pm.collectionVariables.get('runId')));\n` +
      `pm.test('amount/budget 일치', () => { pm.expect(Number(j.amount)).to.eql(${amount}); pm.expect(Number(j.budget)).to.eql(${budget}); });\n` +
      `pm.test('request_id > 0', () => pm.expect(j.request_id).to.be.above(0));\n${extra}`)].join('\n'),
  });

const purchase = {
  info: { name: 'Purchase API', description: 'PURCHASE: 구매 요청 등록/조회/목록, 입력 검증, 승인 규칙, 인증/CSRF', schema: SCHEMA },
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: [
    `if (!pm.collectionVariables.get('runId')) {`,
    `  pm.collectionVariables.set('runId', 'NM-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase());`,
    `}`] } }],
  item: [
    unauthenticated(P, '/api/purchase-requests', '/api/purchase-requests', pBody({})),
    authSetup(P),
    csrfNegative('PUR-SEC', '/api/purchase-requests', pBody({})),
    folder('03 Validation (no DB change)', [
      req(`[${P}-01] requester 누락 → 400`, 'POST', '/api/purchase-requests', { json: pNo('requester'), test: status(400) }),
      req(`[${P}-02] requester 공백 → 400`, 'POST', '/api/purchase-requests', { json: pBody({ requester: '   ' }), test: status(400) }),
      req(`[${P}-03] requester 101자 → 400`, 'POST', '/api/purchase-requests', { json: pBody({ requester: 'R'.repeat(101) }), test: status(400) }),
      req(`[${P}-04] test_run_id 누락 → 400`, 'POST', '/api/purchase-requests', { json: pNo('test_run_id'), test: status(400) }),
      req(`[${P}-05] test_run_id 특수문자 → 400`, 'POST', '/api/purchase-requests', { json: pBody({ test_run_id: 'bad id!' }), test: status(400) }),
      req(`[${P}-06] test_run_id 65자 → 400`, 'POST', '/api/purchase-requests', { json: pBody({ test_run_id: 'A'.repeat(65) }), test: status(400) }),
      req(`[${P}-07] 깨진 JSON → 400`, 'POST', '/api/purchase-requests', { json: '{"requester": ', test: status(400) }),
      req(`[${P}-08] amount 가 숫자가 아님 → 400`, 'POST', '/api/purchase-requests', { json: pBody({ amount: 'abc' }), test: status(400) }),
      req(`[${P}-09] amount 누락(null) → 400`, 'POST', '/api/purchase-requests', { json: pNo('amount'), test: status(400) }),
      req(`[${P}-10] amount 0 → 400`, 'POST', '/api/purchase-requests', { json: pBody({ amount: 0 }), test: status(400) }),
      req(`[${P}-11] budget 음수 → 400`, 'POST', '/api/purchase-requests', { json: pBody({ budget: -1 }), test: status(400) }),
      req(`[${P}-12] 조회: test_run_id 파라미터 누락 → 400`, 'GET', '/api/purchase-requests/1', { test: status(400) }),
      req(`[${P}-13] 조회: id 가 숫자가 아님 → 400`, 'GET', '/api/purchase-requests/abc?test_run_id={{runId}}', { test: status(400) }),
      req(`[${P}-14] 조회: 존재하지 않는 id → 404`, 'GET', '/api/purchase-requests/999999999?test_run_id={{runId}}', { test: status(404) }),
    ], '서버가 insert 전에 거부하는 요청. 정상 동작이라면 DB 가 변경되지 않는다.'),
    folder(MUT + '04 Create, Lookup, List & Approval rules', [
      created('15', 500000, 1000000, 'AUTO_APPROVED', `pm.collectionVariables.set('createdId', j.request_id);`),
      created('16', 1000000, 1000000, 'AUTO_APPROVED'),
      created('17', 1000001, 2000000, 'PENDING_APPROVAL'),
      created('18', 500000, 100000, 'REJECTED'),
      created('19', 700000, 700000, 'AUTO_APPROVED'),
      req(`[${P}-20] 등록한 요청 조회 (id + test_run_id) → 200`, 'GET', '/api/purchase-requests/{{createdId}}?test_run_id={{runId}}', {
        test: [status(200), json(
          `pm.test('request_id 일치', () => pm.expect(String(j.request_id)).to.eql(String(pm.collectionVariables.get('createdId'))));\n` +
          `pm.test('requester/test_run_id/status 일치', () => { pm.expect(j.requester).to.eql('nm-tester'); pm.expect(j.test_run_id).to.eql(pm.collectionVariables.get('runId')); pm.expect(j.status).to.eql('AUTO_APPROVED'); });\n` +
          `pm.test('amount=500000, budget=1000000', () => { pm.expect(Number(j.amount)).to.eql(500000); pm.expect(Number(j.budget)).to.eql(1000000); });`)].join('\n') }),
      req(`[${P}-21] 다른 test_run_id 로 조회 → 404 (데이터 격리)`, 'GET', '/api/purchase-requests/{{createdId}}?test_run_id=OTHER-RUN-ID', { test: status(404) }),
      req(`[${P}-22] 목록 조회에 등록한 요청 포함 → 200`, 'GET', '/api/purchase-requests', {
        test: [status(200), json(
          `pm.test('배열', () => pm.expect(j).to.be.an('array'));\n` +
          `const mine = j.filter(x => x.testRunId === pm.collectionVariables.get('runId'));\n` +
          `pm.test('이번 실행 요청 5건 포함', () => pm.expect(mine.length).to.eql(5));\n` +
          `pm.test('목록 항목 필드', () => { const x = mine[0]; ['requestId','requester','testRunId','totalAmount','budget','status'].forEach(k => pm.expect(x).to.have.property(k)); });\n` +
          `pm.test('상태 분포 AUTO×3, PENDING×1, REJECTED×1', () => { const c = {}; mine.forEach(x => c[x.status] = (c[x.status]||0)+1); pm.expect(c).to.eql({AUTO_APPROVED:3, PENDING_APPROVAL:1, REJECTED:1}); });`)].join('\n') }),
    ], '구매 요청은 삭제 API 가 없으므로 {{runId}} 로 식별되는 데이터가 남는다.'),
  ],
};

// =====================================================================
// HR
// =====================================================================
const H = 'HR-API';
const eBody = (o) => JSON.stringify({ employeeId: '{{empId}}', name: 'NM 테스터', department: 'QA', managerId: null, annualLeaveDays: 10, ...o });
const eNo = (key) => { const o = JSON.parse(eBody({})); delete o[key]; return JSON.stringify(o); };
const lBody = (o) => JSON.stringify({ startDate: '2030-01-07', endDate: '2030-01-09', days: 3, reason: 'newman', ...o });

const hr = {
  info: { name: 'HR API', description: 'HR: 직원 목록/등록/수정, 연차 조회/신청/수정/취소, 입력 검증, 인증/CSRF', schema: SCHEMA },
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: [
    `if (!pm.collectionVariables.get('empId')) {`,
    `  pm.collectionVariables.set('empId', ('NM' + Date.now().toString(36).toUpperCase()).slice(0, 10));`,
    `}`] } }],
  item: [
    unauthenticated(H, '/api/hr/employees', '/api/hr/employees', eBody({})),
    authSetup(H),
    csrfNegative('HR-SEC', '/api/hr/employees', eBody({})),
    folder('03 Read (no DB change)', [
      req(`[${H}-01] 직원 목록 조회 → 200`, 'GET', '/api/hr/employees', {
        test: [status(200), json(
          `pm.test('배열', () => pm.expect(j).to.be.an('array'));\n` +
          `pm.test('직원 필드', () => { if (j.length) ['employeeId','name','department','annualLeaveDays','usedLeaveDays'].forEach(k => pm.expect(j[0]).to.have.property(k)); });\n` +
          `pm.test('사용 연차 ≤ 총 연차', () => j.forEach(e => pm.expect(e.usedLeaveDays).to.be.at.most(e.annualLeaveDays)));`)].join('\n') }),
      req(`[${H}-02] 존재하지 않는 직원 조회 → 404`, 'GET', '/api/hr/employees/ZZNOEXIST', { test: status(404) }),
      req(`[${H}-03] 존재하지 않는 직원의 연차 조회 → 404`, 'GET', '/api/hr/employees/ZZNOEXIST/leaves', { test: status(404) }),
    ]),
    folder('04 Validation (no DB change)', [
      req(`[${H}-04] 직원 등록: name 누락 → 400`, 'POST', '/api/hr/employees', { json: eNo('name'), test: status(400) }),
      req(`[${H}-05] 직원 등록: department 공백 → 400`, 'POST', '/api/hr/employees', { json: eBody({ department: '  ' }), test: status(400) }),
      req(`[${H}-06] 직원 등록: annualLeaveDays 누락 → 400`, 'POST', '/api/hr/employees', { json: eNo('annualLeaveDays'), test: status(400) }),
      req(`[${H}-07] 직원 등록: annualLeaveDays 366 → 400`, 'POST', '/api/hr/employees', { json: eBody({ annualLeaveDays: 366 }), test: status(400) }),
      req(`[${H}-08] 직원 등록: annualLeaveDays 음수 → 400`, 'POST', '/api/hr/employees', { json: eBody({ annualLeaveDays: -1 }), test: status(400) }),
      req(`[${H}-09] 직원 등록: 직원 ID 11자 → 400`, 'POST', '/api/hr/employees', { json: eBody({ employeeId: 'ABCDEFGHIJK' }), test: status(400) }),
      req(`[${H}-10] 직원 등록: 직원 ID 특수문자 → 400`, 'POST', '/api/hr/employees', { json: eBody({ employeeId: 'bad id!' }), test: status(400) }),
      req(`[${H}-11] 직원 등록: 존재하지 않는 관리자 ID → 404`, 'POST', '/api/hr/employees', { json: eBody({ managerId: 'ZZNOEXIST' }), test: status(404) }),
      req(`[${H}-12] 직원 수정: 존재하지 않는 직원 → 404`, 'PUT', '/api/hr/employees/ZZNOEXIST', { json: eBody({}), test: status(404) }),
      req(`[${H}-13] 직원 삭제: 존재하지 않는 직원 → 404`, 'DELETE', '/api/hr/employees/ZZNOEXIST', { test: status(404) }),
      req(`[${H}-14] 연차 신청: days 0 → 400`, 'POST', '/api/hr/employees/ZZNOEXIST/leaves', { json: lBody({ days: 0 }), test: status(400) }),
      req(`[${H}-15] 연차 신청: 종료일이 시작일보다 이전 → 400`, 'POST', '/api/hr/employees/ZZNOEXIST/leaves', { json: lBody({ startDate: '2030-01-09', endDate: '2030-01-07' }), test: status(400) }),
      req(`[${H}-16] 연차 신청: 일수가 기간보다 큼 → 400`, 'POST', '/api/hr/employees/ZZNOEXIST/leaves', { json: lBody({ endDate: '2030-01-07', days: 3 }), test: status(400) }),
      req(`[${H}-17] 연차 신청: 사유 501자 → 400`, 'POST', '/api/hr/employees/ZZNOEXIST/leaves', { json: lBody({ reason: 'R'.repeat(501) }), test: status(400) }),
      req(`[${H}-18] 연차 신청: 존재하지 않는 직원 → 404`, 'POST', '/api/hr/employees/ZZNOEXIST/leaves', { json: lBody({}), test: status(404) }),
    ], '서버가 DB 변경 전에 거부하는 요청.'),
    folder(MUT + '05 Employee & Leave lifecycle', [
      req(`[${H}-19] 직원 등록 (annual=10) → 201`, 'POST', '/api/hr/employees', {
        json: eBody({}),
        test: [status(201), json(
          `pm.test('등록 값 반영', () => { pm.expect(j.employeeId).to.eql(pm.collectionVariables.get('empId')); pm.expect(j.name).to.eql('NM 테스터'); pm.expect(j.annualLeaveDays).to.eql(10); pm.expect(j.usedLeaveDays).to.eql(0); });`)].join('\n') }),
      req(`[${H}-20] 직원 단건 조회 → 200`, 'GET', '/api/hr/employees/{{empId}}', {
        test: [status(200), json(`pm.test('department=QA', () => pm.expect(j.department).to.eql('QA'));`)].join('\n') }),
      req(`[${H}-21] 직원 목록에 등록한 직원 포함 → 200`, 'GET', '/api/hr/employees', {
        test: [status(200), json(`pm.test('목록에 존재', () => pm.expect(j.some(e => e.employeeId === pm.collectionVariables.get('empId'))).to.be.true);`)].join('\n') }),
      req(`[${H}-22] 직원 정보 수정 (name/department/annual=20) → 200`, 'PUT', '/api/hr/employees/{{empId}}', {
        json: eBody({ name: 'NM 수정후', department: 'DevOps', annualLeaveDays: 20 }),
        test: [status(200), json(`pm.test('수정 값 반영', () => { pm.expect(j.name).to.eql('NM 수정후'); pm.expect(j.department).to.eql('DevOps'); pm.expect(j.annualLeaveDays).to.eql(20); });`)].join('\n') }),
      req(`[${H}-23] 연차 신청 3일 → 201, APPROVED`, 'POST', '/api/hr/employees/{{empId}}/leaves', {
        json: lBody({}),
        test: [status(201), json(
          `pm.test('연차 필드', () => { pm.expect(j.status).to.eql('APPROVED'); pm.expect(j.days).to.eql(3); pm.expect(j.startDate).to.eql('2030-01-07'); pm.expect(j.employeeId).to.eql(pm.collectionVariables.get('empId')); });\n` +
          `pm.collectionVariables.set('leaveId', j.leaveId);`)].join('\n') }),
      req(`[${H}-24] 연차 신청 후 사용 일수 3 → 200`, 'GET', '/api/hr/employees/{{empId}}', {
        test: [status(200), json(`pm.test('used=3', () => pm.expect(j.usedLeaveDays).to.eql(3));`)].join('\n') }),
      req(`[${H}-25] 연차 내역 조회 → 200`, 'GET', '/api/hr/employees/{{empId}}/leaves', {
        test: [status(200), json(`pm.test('신청한 연차 포함', () => pm.expect(j.some(l => String(l.leaveId) === String(pm.collectionVariables.get('leaveId')) && l.status === 'APPROVED')).to.be.true);`)].join('\n') }),
      req(`[${H}-26] 잔여 연차(17일) 초과 신청 18일 → 409`, 'POST', '/api/hr/employees/{{empId}}/leaves', {
        json: lBody({ startDate: '2030-02-01', endDate: '2030-02-28', days: 18 }), test: status(409) }),
      req(`[${H}-27] 연차 총량을 사용 일수(3)보다 작게 수정(2) → 409`, 'PUT', '/api/hr/employees/{{empId}}', {
        json: eBody({ annualLeaveDays: 2 }), test: status(409) }),
      req(`[${H}-28] 연차 수정 (3일 → 2일) → 200`, 'PUT', '/api/hr/leaves/{{leaveId}}', {
        json: lBody({ endDate: '2030-01-08', days: 2 }),
        test: [status(200), json(`pm.test('days=2', () => { pm.expect(j.days).to.eql(2); pm.expect(j.endDate).to.eql('2030-01-08'); });`)].join('\n') }),
      req(`[${H}-29] 연차 수정 후 사용 일수 2 → 200`, 'GET', '/api/hr/employees/{{empId}}', {
        test: [status(200), json(`pm.test('used=2', () => pm.expect(j.usedLeaveDays).to.eql(2));`)].join('\n') }),
      req(`[${H}-30] 연차 취소 → 204`, 'POST', '/api/hr/leaves/{{leaveId}}/cancel', { test: status(204) }),
      req(`[${H}-31] 취소 후 사용 일수 0 복원 → 200`, 'GET', '/api/hr/employees/{{empId}}', {
        test: [status(200), json(`pm.test('used=0', () => pm.expect(j.usedLeaveDays).to.eql(0));`)].join('\n') }),
      req(`[${H}-32] 이미 취소된 연차 재취소 → 409`, 'POST', '/api/hr/leaves/{{leaveId}}/cancel', { test: status(409) }),
      req(`[${H}-33] 취소된 연차 삭제 → 204`, 'DELETE', '/api/hr/leaves/{{leaveId}}', { test: status(204) }),
      req(`[${H}-34] 삭제된 연차 재삭제 → 404`, 'DELETE', '/api/hr/leaves/{{leaveId}}', { test: status(404) }),
      req(`[${H}-35] 직원 삭제(정리) → 204`, 'DELETE', '/api/hr/employees/{{empId}}', { test: status(204) }),
      req(`[${H}-36] 삭제된 직원 조회 → 404`, 'GET', '/api/hr/employees/{{empId}}', { test: status(404) }),
    ], '테스트가 만든 직원/연차를 마지막에 삭제한다. 중간 실패 시 {{empId}}(NM 접두사) 직원이 남을 수 있다.'),
  ],
};

// ---------- 파일 쓰기 ----------
const dir = __dirname;
fs.writeFileSync(path.join(dir, 'purchase.postman_collection.json'), JSON.stringify(purchase, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'hr.postman_collection.json'), JSON.stringify(hr, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'local.postman_environment.json'), JSON.stringify({
  name: 'local',
  values: [
    { key: 'baseUrl', value: 'http://localhost:8080', enabled: true },
    { key: 'loginId', value: '', type: 'default', enabled: true },
    { key: 'loginPassword', value: '', type: 'secret', enabled: true },
  ],
  _postman_variable_scope: 'environment',
}, null, 2) + '\n');

const count = (c) => c.item.reduce((n, f) => n + f.item.length, 0);
console.log(`purchase: ${count(purchase)} requests, hr: ${count(hr)} requests`);
