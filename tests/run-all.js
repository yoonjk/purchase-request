/**
 * 전체 UI/API 테스트를 순서대로 실행한다. 하나가 실패해도 나머지를 계속 실행하고,
 * 모든 JSON 리포트(reports/*.json)를 생성한 뒤 하나라도 실패하면 종료 코드 1을 반환한다.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const scripts = ['test:purchase:api', 'test:hr:api', 'test:purchase:ui', 'test:hr:ui'];
let failed = 0;
for (const s of scripts) {
  console.log(`\n===== npm run ${s} =====`);
  const r = spawnSync('npm', ['run', s, '--silent'], { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(`\n실행한 스위트 ${scripts.length}개 중 실패 ${failed}개. 리포트: reports/*.json`);
process.exit(failed ? 1 : 0);
