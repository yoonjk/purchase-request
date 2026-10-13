import { expect, Page } from '@playwright/test';

export const username = process.env.TEST_LOGIN_ID;
export const password = process.env.TEST_LOGIN_PASSWORD;

/** 데이터 변경 테스트는 테스트 전용 DB임이 명시적으로 확인된 경우에만 실행한다. */
export const mutationsAllowed = process.env.TEST_DB_CONFIRMED === 'true';
export const MUTATION_SKIP_REASON =
  'TEST_DB_CONFIRMED=true 가 아니므로 데이터 변경 테스트를 건너뜁니다.';
export const CREDENTIAL_SKIP_REASON = 'TEST_LOGIN_ID / TEST_LOGIN_PASSWORD 환경변수가 필요합니다.';

/** 실행마다 고유한 접미사 (Request ID 규칙 [A-Za-z0-9_-] 및 직원 ID 10자 제한을 고려). */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
}

/** 구매 요청용 Test Run ID. 서버 규칙: [A-Za-z0-9_-]{1,64} */
export function uniqueRunId(prefix = 'PW'): string {
  return `${prefix}-RUN-${uniqueSuffix()}`;
}

/** 직원 ID. 서버 규칙: [A-Za-z0-9_-]{1,10} */
export function uniqueEmployeeId(): string {
  return `PW${uniqueSuffix()}`.slice(0, 10);
}

/**
 * 공통 로그인 helper.
 * login.html 은 hidden `_csrf` 값을 비동기 fetch 로 채우므로 값이 채워질 때까지 자동 대기한다.
 */
export async function login(page: Page, user = username, pass = password): Promise<void> {
  if (!user || !pass) throw new Error(CREDENTIAL_SKIP_REASON);
  await page.goto('/login.html');
  await expect(page.locator('#csrf')).not.toHaveValue('');
  await page.locator('input[name="username"]').fill(user);
  await page.locator('input[name="password"]').fill(pass);
  await Promise.all([
    page.waitForURL(/\/dashboard\.html(?:[?#].*)?$/),
    page.getByRole('button', { name: '로그인' }).click(),
  ]);
  // dashboard 초기화(CSRF 토큰 수신, 사용자 표시) 완료 대기
  await expect(page.locator('#user')).not.toBeEmpty();
}

/** 사이드바 탭 이동 (data-tab 속성 사용). */
export async function openTab(page: Page, tab: string): Promise<void> {
  await page.locator(`nav button[data-tab="${tab}"]`).click();
}
