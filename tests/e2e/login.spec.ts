import { test, expect } from '@playwright/test';
import { login, username, CREDENTIAL_SKIP_REASON } from '../helpers/auth';

test.describe('로그인 E2E', () => {
  test('정상 계정 로그인 후 대시보드 진입', async ({ page }) => {
    test.skip(!username || !process.env.TEST_LOGIN_PASSWORD, CREDENTIAL_SKIP_REASON);
    await login(page);
    // #user 요소에 loginId가 표시됨을 단언한다 (실제 dashboard.html 기준).
    await expect(page.locator('#user')).not.toBeEmpty();
    await expect(page).toHaveURL(/\/dashboard\.html(?:[?#].*)?$/);
  });

  test('잘못된 비밀번호로 로그인하면 대시보드에 진입하지 못함', async ({ page }) => {
    test.skip(!username, CREDENTIAL_SKIP_REASON);
    await page.goto('/login.html');
    await expect(page.locator('#csrf')).not.toHaveValue('');
    await page.locator('input[name="username"]').fill(username!);
    await page.locator('input[name="password"]').fill('intentionally-wrong-password-12345');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).not.toHaveURL(/\/dashboard\.html(?:[?#].*)?$/);
    // Spring Security는 ?error 로 redirect한다; 커스텀 페이지는 #message 에 표시.
    const msg = page.locator('#message');
    if (await msg.isVisible()) {
      await expect(msg).not.toBeEmpty();
    }
  });

  test('비인증 사용자의 대시보드 접근 차단', async ({ page }) => {
    await page.goto('/dashboard.html');
    await expect(page).not.toHaveURL(/\/dashboard\.html(?:[?#].*)?$/);
  });

  test('로그아웃 후 dashboard 접근 차단', async ({ page }) => {
    test.skip(!username || !process.env.TEST_LOGIN_PASSWORD, CREDENTIAL_SKIP_REASON);
    await login(page);
    // logout 폼에 CSRF가 채워진 뒤에 제출한다
    await expect(page.locator('#logoutCsrf')).not.toHaveValue('');
    await page.locator('#logout button').click();
    await page.waitForURL(/\/login\.html/);
    await expect(page).not.toHaveURL(/\/dashboard\.html/);
  });
});
