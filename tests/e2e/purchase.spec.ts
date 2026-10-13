import { test, expect, Page } from '@playwright/test';
import {
  login, openTab, uniqueRunId, mutationsAllowed, MUTATION_SKIP_REASON,
  username, password, CREDENTIAL_SKIP_REASON,
} from '../helpers/auth';

// 대상: dashboard.html 의 #create, #lookup, #list 패널 (management.js)

type Created = { request_id: number; requester: string; test_run_id: string; amount: number; budget: number; status: string };

async function createPurchase(page: Page, v: { requester: string; runId: string; amount: number; budget: number }): Promise<Created> {
  await openTab(page, 'create');
  const form = page.locator('#createForm');
  await form.locator('[name="requester"]').fill(v.requester);
  await form.locator('[name="test_run_id"]').fill(v.runId);
  await form.locator('[name="amount"]').fill(String(v.amount));
  await form.locator('[name="budget"]').fill(String(v.budget));
  await form.getByRole('button', { name: '구매 요청 등록' }).click();
  // 자동 대기: 응답 JSON에 이번 실행의 고유 run ID가 나타날 때까지
  await expect(page.locator('#created')).toContainText(v.runId);
  await expect(page.locator('#notice')).toHaveText('구매 요청 등록 완료');
  return JSON.parse((await page.locator('#created').textContent()) ?? '{}');
}

async function lookup(page: Page, id: number | string, runId: string) {
  await openTab(page, 'lookup');
  await page.locator('#lookupForm [name="id"]').fill(String(id));
  await page.locator('#lookupForm [name="run"]').fill(runId);
  await page.locator('#lookupForm').getByRole('button', { name: /조회하기/ }).click();
}

test.describe('PURCHASE UI', () => {
  test.skip(!username || !password, CREDENTIAL_SKIP_REASON);

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('정상 시나리오', () => {
    test('[PUR-UI-01] 구매 요청 등록 후 AUTO_APPROVED 확인', async ({ page }) => {
      test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
      const runId = uniqueRunId();
      const r = await createPurchase(page, { requester: 'pw-tester', runId, amount: 500000, budget: 1000000 });
      expect(r.status).toBe('AUTO_APPROVED');
      expect(r.test_run_id).toBe(runId);
      expect(r.request_id).toBeGreaterThan(0);
    });

    test('[PUR-UI-02] 등록한 구매 요청을 ID와 Test Run ID로 조회', async ({ page }) => {
      test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
      const runId = uniqueRunId();
      const r = await createPurchase(page, { requester: 'pw-tester', runId, amount: 300000, budget: 400000 });
      await lookup(page, r.request_id, runId);
      await expect(page.locator('#notice')).toHaveText('조회 완료');
      await expect(page.locator('#lookupDetailPanel')).toBeVisible();
      const summary = page.locator('#lookupSummary');
      await expect(summary).toContainText(String(r.request_id));
      await expect(summary).toContainText('pw-tester');
      await expect(summary).toContainText(runId);
      await expect(summary).toContainText('AUTO_APPROVED');
    });

    test('[PUR-UI-03] 구매 요청 목록에 등록한 요청이 표시됨', async ({ page }) => {
      test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
      const runId = uniqueRunId();
      await createPurchase(page, { requester: 'pw-tester', runId, amount: 10000, budget: 20000 });
      await openTab(page, 'list');
      const row = page.locator('#requestTable tbody tr', { hasText: runId });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText('AUTO_APPROVED');
    });

    test('[PUR-UI-04] 구매 요청 목록 화면 조회 (읽기 전용)', async ({ page }) => {
      await openTab(page, 'list');
      await expect(page.locator('#pageTitle')).toHaveText('구매 요청 목록조회');
      await expect(page.locator('#requestTable thead th')).toContainText(['ID', '요청자', '금액', '예산', '승인 상태', 'Test Run ID']);
      await page.locator('#loadRequests').click();
      await expect(page.locator('#requestTable tbody tr').first()).toBeVisible();
      await expect(page.locator('#notice.error')).toHaveCount(0);
    });
  });

  test.describe('예산 및 승인 상태 경계값', () => {
    const cases = [
      { id: '05', name: '금액=1,000,000 이하 & 예산 내 → AUTO_APPROVED', amount: 1000000, budget: 1000000, expected: 'AUTO_APPROVED' },
      { id: '06', name: '금액=1,000,001 & 예산 내 → PENDING_APPROVAL', amount: 1000001, budget: 2000000, expected: 'PENDING_APPROVAL' },
      { id: '07', name: '금액 > 예산 → REJECTED', amount: 500000, budget: 100000, expected: 'REJECTED' },
      { id: '08', name: '금액=예산 (1,000,000 이하) → AUTO_APPROVED', amount: 700000, budget: 700000, expected: 'AUTO_APPROVED' },
    ];
    for (const c of cases) {
      test(`[PUR-UI-${c.id}] ${c.name}`, async ({ page }) => {
        test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
        const r = await createPurchase(page, { requester: 'pw-tester', runId: uniqueRunId(), amount: c.amount, budget: c.budget });
        expect(r.status).toBe(c.expected);
      });
    }
  });

  test.describe('오류 시나리오', () => {
    // 브라우저 검증에서 걸러지므로 서버로 POST가 전송되지 않아야 한다 (DB 변경 없음).
    async function expectBlockedByBrowser(page: Page, fill: Record<string, string>, field: string, validity: string) {
      let posts = 0;
      page.on('request', (req) => {
        if (req.method() === 'POST' && req.url().endsWith('/api/purchase-requests')) posts++;
      });
      await openTab(page, 'create');
      const form = page.locator('#createForm');
      for (const [name, value] of Object.entries(fill)) await form.locator(`[name="${name}"]`).fill(value);
      await form.getByRole('button', { name: '구매 요청 등록' }).click();
      await expect
        .poll(() => form.locator(`[name="${field}"]`).evaluate((el, key) => (el as HTMLInputElement).validity[key as 'valueMissing'], validity))
        .toBe(true);
      await expect(page.locator('#created')).toBeEmpty();
      expect(posts).toBe(0);
    }

    test('[PUR-UI-09] 요청자 누락 시 제출 차단', async ({ page }) => {
      await expectBlockedByBrowser(page, { test_run_id: uniqueRunId(), amount: '1000', budget: '2000' }, 'requester', 'valueMissing');
    });

    test('[PUR-UI-10] Test Run ID 형식 위반(공백/특수문자) 시 제출 차단', async ({ page }) => {
      await expectBlockedByBrowser(page, { requester: 'pw-tester', test_run_id: 'bad id!', amount: '1000', budget: '2000' }, 'test_run_id', 'patternMismatch');
    });

    test('[PUR-UI-11] 요청 금액 0 이하 시 제출 차단', async ({ page }) => {
      await expectBlockedByBrowser(page, { requester: 'pw-tester', test_run_id: uniqueRunId(), amount: '0', budget: '2000' }, 'amount', 'rangeUnderflow');
    });

    test('[PUR-UI-12] 예산이 음수일 때 제출 차단', async ({ page }) => {
      await expectBlockedByBrowser(page, { requester: 'pw-tester', test_run_id: uniqueRunId(), amount: '1000', budget: '-1' }, 'budget', 'rangeUnderflow');
    });

    test('[PUR-UI-13] 존재하지 않는 Request ID 조회 시 404 오류 알림', async ({ page }) => {
      await lookup(page, 999999999, uniqueRunId());
      const notice = page.locator('#notice');
      await expect(notice).toHaveClass(/error/);
      await expect(notice).toContainText('404');
    });

    test('[PUR-UI-14] Request ID 누락 시 조회 제출 차단', async ({ page }) => {
      await openTab(page, 'lookup');
      await page.locator('#lookupForm [name="run"]').fill(uniqueRunId());
      await page.locator('#lookupForm').getByRole('button', { name: /조회하기/ }).click();
      await expect
        .poll(() => page.locator('#lookupForm [name="id"]').evaluate((el) => (el as HTMLInputElement).validity.valueMissing))
        .toBe(true);
      await expect(page.locator('#lookupDetailPanel')).toBeHidden();
    });

    test('[PUR-UI-15] 다른 Test Run ID로 조회하면 404 (데이터 격리)', async ({ page }) => {
      test.skip(!mutationsAllowed, MUTATION_SKIP_REASON);
      const r = await createPurchase(page, { requester: 'pw-tester', runId: uniqueRunId(), amount: 1000, budget: 2000 });
      await lookup(page, r.request_id, uniqueRunId('OTHER'));
      await expect(page.locator('#notice')).toHaveClass(/error/);
      await expect(page.locator('#notice')).toContainText('404');
    });
  });
});

test.describe('PURCHASE UI - 인증', () => {
  test('[PUR-UI-16] 비인증 사용자는 /purchases.html 접근 시 로그인 페이지로 이동', async ({ page }) => {
    await page.goto('/purchases.html');
    await expect(page).toHaveURL(/\/login\.html/);
  });
});
