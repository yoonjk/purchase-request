import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: 'test-results/artifacts',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    // 테스트 실패 여부와 관계없이 항상 생성된다. 파일명은 PW_JSON_REPORT로 지정(기본: ui-all).
    ['json', { outputFile: `test-results/${process.env.PW_JSON_REPORT ?? 'ui-all'}.json` }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
    // 비밀번호/쿠키가 포함될 수 있는 trace, video는 남기지 않는다.
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
