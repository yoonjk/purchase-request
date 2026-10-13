/**
 * 전체 UI/API 테스트를 순서대로 실행한 뒤 생성된 리포트를 Hub 로 업로드한다.
 * 하나가 실패해도 나머지 실행과 업로드를 계속하며, 종료 코드로 두 결과를 구분한다.
 *   0 = 테스트 통과 + 업로드 성공   1 = 테스트 실패(업로드는 성공)
 *   2 = 업로드 실패(테스트는 통과)  3 = 테스트 실패 + 업로드 실패
 */
const { spawnSync } = require('child_process');
const path = require('path');

const cwd = path.join(__dirname, '..');
const scripts = ['test:purchase:api', 'test:hr:api', 'test:purchase:ui', 'test:hr:ui'];
let failed = 0;
for (const s of scripts) {
  console.log(`\n===== npm run ${s} =====`);
  const r = spawnSync('npm', ['run', s, '--silent'], { cwd, stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log('\n===== npm run test:publish =====');
const pub = spawnSync('npm', ['run', 'test:publish', '--silent'], { cwd, stdio: 'inherit' });
const uploadFailed = pub.status !== 0;
console.log(`\n[테스트 실행] 스위트 ${scripts.length}개 중 실패 ${failed}개`);
console.log(`[결과 업로드] ${uploadFailed ? '실패 (npm run test:publish 로 재시도 가능)' : '성공'}`);
process.exit((failed ? 1 : 0) + (uploadFailed ? 2 : 0));
