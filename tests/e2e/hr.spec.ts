import { test, expect, Page } from '@playwright/test';
import {
  login, openTab, uniqueEmployeeId, mutationsAllowed, MUTATION_SKIP_REASON,
  username, password, CREDENTIAL_SKIP_REASON,
} from '../helpers/auth';

// 대상: dashboard.html 의 #employees, #leave 패널 (management.js 의 HR 섹션)

const createdEmployees: string[] = [];

async function registerEmployee(page: Page, v: { id: string; name: string; dept: string; annual?: number }) {
  await openTab(page, 'employees');
  const f = page.locator('#employeeForm');
  await f.locator('[name="employeeId"]').fill(v.id);
  await f.locator('[name="name"]').fill(v.name);
  await f.locator('[name="department"]').fill(v.dept);
  await f.locator('[name="annualLeaveDays"]').fill(String(v.annual ?? 15));
  await page.locator('#employeeSubmit').click();
  await expect(page.locator('#notice')).toHaveText('직원 등록 완료');
  createdEmployees.push(v.id);
}

/**
 * 선행 데이터는 API 로 준비한다 (UI 등록 흐름 결함과 분리하기 위함).
 * 등록 UI 자체는 [HR-UI-02] 에서 별도로 검증한다.
 */
async function arrangeEmployee(page: Page, v: { id: string; name: string; dept: string; annual: number }) {
  const csrf = (await (await page.request.get('/api/auth/csrf')).json()) as { headerName: string; token: string };
  const res = await page.request.post('/api/hr/employees', {
    headers: { [csrf.headerName]: csrf.token },
    data: { employeeId: v.id, name: v.name, department: v.dept, managerId: null, annualLeaveDays: v.annual },
  });
  expect(res.status(), '선행 데이터(직원) API 등록').toBe(201);
  createdEmployees.push(v.id);
}

function employeeRow(page: Page, id: string) {
  return page.locator('#employeeTable tbody tr', { has: page.locator('td', { hasText: new RegExp(`^${id}$`) }) });
}

async function selectEmployeeForLeave(page: Page, id: string) {
  await openTab(page, 'leave');
  // 옵션이 로드될 때까지 자동 대기 후 선택
  await expect(page.locator(`#leaveEmployee option[value="${id}"]`)).toHaveCount(1);
  await page.locator('#leaveEmployee').selectOption(id);
}

/** 테스트가 만든 직원만 API 로 정리한다 (세션/CSRF는 브라우저 컨텍스트 사용, 값은 출력하지 않음). */
async function cleanup(page: Page) {
  const req = page.request;
  const csrf = (await (await req.get('/api/auth/csrf')).json()) as { headerName: string; token: string };
  const headers = { [csrf.headerName]: csrf.token };
  for (const id of createdEmployees.splice(0)) {
    const leaves = await req.get(`/api/hr/employees/${id}/leaves`);
    if (leaves.ok()) {
      for (const l of (await leaves.json()) as { leaveId: number; status: string }[]) {
        if (l.status === 'APPROVED') await req.post(`/api/hr/leaves/${l.leaveId}/cancel`, { headers });
        await req.delete(`/api/hr/leaves/${l.leaveId}`, { headers });
      }
    }
    await req.delete(`/api/hr/employees/${id}`, { headers });
  }
}

test.describe('HR UI', () => {
  test.skip(!username || !password, CREDENTIAL_SKIP_REASON);

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    if (createdEmployees.length) await cleanup(page);
  });

  test.describe('정상 시나리오', () => {
    test('[HR-UI-01] 직원 목록 조회 (읽기 전용)', async ({ page }) => {
      await openTab(page, 'employees');
      await expect(page.locator('#pageDescription')).toContainText('직원');
      await expect(page.locator('#employeeTable thead th')).toContainText(['ID', '직원명', '부서', '관리자 ID', '연차 총량', '사용', '잔여', '작업']);
      await expect(page.locator('#employeeTable tbody tr').first()).toBeVisible();
      await expect(page.locator('#hrEmployeeTotal')).not.toHaveText('0');
    });

    test('[HR-UI-02] 직원 등록 후 목록에 표시', async ({ page }) => {
      test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
      const id = uniqueEmployeeId();
      await registerEmployee(page, { id, name: 'PW 테스터', dept: 'QA', annual: 12 });
      const row = employeeRow(page, id);
      await expect(row).toHaveCount(1);
      await expect(row).toContainText('PW 테스터');
      await expect(row).toContainText('QA');
      await expect(row.locator('td').nth(4)).toHaveText('12');
    });

    test('[HR-UI-03] 직원 정보 수정', async ({ page }) => {
      test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
      const id = uniqueEmployeeId();
      await arrangeEmployee(page, { id, name: 'PW 수정전', dept: 'QA', annual: 10 });
      await openTab(page, 'employees');
      await employeeRow(page, id).getByRole('button', { name: '수정' }).click();
      await expect(page.locator('#employeeSubmit')).toHaveText('변경사항 저장');
      await expect(page.locator('#employeeForm [name="employeeId"]')).toHaveValue(id);
      await page.locator('#employeeForm [name="name"]').fill('PW 수정후');
      await page.locator('#employeeForm [name="department"]').fill('DevOps');
      await page.locator('#employeeForm [name="annualLeaveDays"]').fill('20');
      await page.locator('#employeeSubmit').click();
      await expect(page.locator('#notice')).toHaveText('직원 정보 수정 완료');
      const row = employeeRow(page, id);
      await expect(row).toContainText('PW 수정후');
      await expect(row).toContainText('DevOps');
      await expect(row.locator('td').nth(4)).toHaveText('20');
    });

    test('[HR-UI-04] 연차 화면: 직원 선택 시 잔여 연차 표시 및 연차 신청', async ({ page }) => {
      test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
      const id = uniqueEmployeeId();
      await arrangeEmployee(page, { id, name: 'PW 연차', dept: 'QA', annual: 15 });
      await selectEmployeeForLeave(page, id);
      await expect(page.locator('#leaveTotal')).toHaveText('15일');
      await expect(page.locator('#leaveUsed')).toHaveText('0일');
      await expect(page.locator('#leaveRemaining')).toHaveText('15일');

      const f = page.locator('#leaveForm');
      await f.locator('[name="startDate"]').fill('2030-01-07');
      await f.locator('[name="endDate"]').fill('2030-01-09');
      await f.locator('[name="days"]').fill('3');
      await f.locator('[name="reason"]').fill('PW 자동화 테스트');
      await page.locator('#leaveSubmit').click();

      await expect(page.locator('#notice')).toHaveText('연차 사용이 등록되었습니다.');
      await expect(page.locator('#leaveUsed')).toHaveText('3일');
      await expect(page.locator('#leaveRemaining')).toHaveText('12일');
      const row = page.locator('#leaveTable tbody tr');
      await expect(row).toHaveCount(1);
      await expect(row).toContainText('2030-01-07');
      await expect(row).toContainText('사용 완료');
    });
  });

  test.describe('오류 시나리오', () => {
    async function expectEmployeeBlocked(page: Page, fill: Record<string, string>, field: string, validity: string) {
      let posts = 0;
      page.on('request', (r) => {
        if (r.method() === 'POST' && r.url().endsWith('/api/hr/employees')) posts++;
      });
      await openTab(page, 'employees');
      const f = page.locator('#employeeForm');
      for (const [n, v] of Object.entries(fill)) await f.locator(`[name="${n}"]`).fill(v);
      await page.locator('#employeeSubmit').click();
      await expect
        .poll(() => f.locator(`[name="${field}"]`).evaluate((el, k) => (el as HTMLInputElement).validity[k as 'valueMissing'], validity))
        .toBe(true);
      expect(posts).toBe(0);
    }

    test('[HR-UI-05] 직원 ID 누락 시 제출 차단', async ({ page }) => {
      await expectEmployeeBlocked(page, { name: 'x', department: 'QA', annualLeaveDays: '10' }, 'employeeId', 'valueMissing');
    });

    test('[HR-UI-06] 직원 ID 형식 위반 시 제출 차단', async ({ page }) => {
      await expectEmployeeBlocked(page, { employeeId: 'bad id!', name: 'x', department: 'QA', annualLeaveDays: '10' }, 'employeeId', 'patternMismatch');
    });

    test('[HR-UI-07] 직원명 누락 시 제출 차단', async ({ page }) => {
      await expectEmployeeBlocked(page, { employeeId: uniqueEmployeeId(), department: 'QA', annualLeaveDays: '10' }, 'name', 'valueMissing');
    });

    test('[HR-UI-08] 연간 연차 일수 범위 초과(366) 시 제출 차단', async ({ page }) => {
      await expectEmployeeBlocked(page, { employeeId: uniqueEmployeeId(), name: 'x', department: 'QA', annualLeaveDays: '366' }, 'annualLeaveDays', 'rangeOverflow');
    });

    test('[HR-UI-09] 직원 미선택 상태에서 연차 신청 시 오류 알림', async ({ page }) => {
      await openTab(page, 'leave');
      const f = page.locator('#leaveForm');
      await f.locator('[name="startDate"]').fill('2030-02-04');
      await f.locator('[name="endDate"]').fill('2030-02-04');
      await f.locator('[name="days"]').fill('1');
      await page.locator('#leaveSubmit').click();
      await expect(page.locator('#notice')).toHaveClass(/error/);
      await expect(page.locator('#notice')).toHaveText('직원을 선택하세요');
    });

    test('[HR-UI-10] 연차 일수가 0 이하일 때 제출 차단', async ({ page }) => {
      await openTab(page, 'leave');
      const f = page.locator('#leaveForm');
      await f.locator('[name="startDate"]').fill('2030-02-04');
      await f.locator('[name="endDate"]').fill('2030-02-04');
      await f.locator('[name="days"]').fill('0');
      await page.locator('#leaveSubmit').click();
      await expect
        .poll(() => f.locator('[name="days"]').evaluate((el) => (el as HTMLInputElement).validity.rangeUnderflow))
        .toBe(true);
    });

    test('[HR-UI-11] 잔여 연차보다 많이 신청하면 409 오류 알림', async ({ page }) => {
      test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
      const id = uniqueEmployeeId();
      await arrangeEmployee(page, { id, name: 'PW 한도', dept: 'QA', annual: 2 });
      await selectEmployeeForLeave(page, id);
      const f = page.locator('#leaveForm');
      await f.locator('[name="startDate"]').fill('2030-03-04');
      await f.locator('[name="endDate"]').fill('2030-03-08');
      await f.locator('[name="days"]').fill('5');
      await page.locator('#leaveSubmit').click();
      await expect(page.locator('#notice')).toHaveClass(/error/);
      await expect(page.locator('#notice')).toContainText('409');
      await expect(page.locator('#leaveUsed')).toHaveText('0일');
    });

    test('[HR-UI-12] 기간보다 큰 일수를 입력하면 400 오류 알림', async ({ page }) => {
      test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
      const id = uniqueEmployeeId();
      await arrangeEmployee(page, { id, name: 'PW 기간', dept: 'QA', annual: 15 });
      await selectEmployeeForLeave(page, id);
      const f = page.locator('#leaveForm');
      await f.locator('[name="startDate"]').fill('2030-03-04');
      await f.locator('[name="endDate"]').fill('2030-03-04');
      await f.locator('[name="days"]').fill('3');
      await page.locator('#leaveSubmit').click();
      await expect(page.locator('#notice')).toHaveClass(/error/);
      await expect(page.locator('#notice')).toContainText('400');
      await expect(page.locator('#leaveUsed')).toHaveText('0일');
    });
  });
});

test.describe('HR UI - 인증', () => {
  test('[HR-UI-13] 비인증 사용자는 dashboard(HR 화면 포함) 접근 시 로그인 페이지로 이동', async ({ page }) => {
    await page.goto('/dashboard.html');
    await expect(page).toHaveURL(/\/login\.html/);
  });
});
