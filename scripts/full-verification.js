const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runFullVerification() {
  const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots', 'e2e-verification');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const results = {
    testDate: new Date().toISOString(),
    apiIntegrationTests: [],
    negativeTests: [],
    browserE2ETests: [],
    consoleErrors: []
  };

  const BASE_URL = 'http://localhost:8080';

  console.log('=== Step 1 & 2: API Integration Tests ===');

  const testCases = [
    { id: 'TC-01', requester: 'bob-tester-01', amount: 500000, budget: 1000000, expectedStatus: 'AUTO_APPROVED' },
    { id: 'TC-02', requester: 'bob-tester-02', amount: 1500000, budget: 2000000, expectedStatus: 'PENDING_APPROVAL' },
    { id: 'TC-03', requester: 'bob-tester-03', amount: 1200000, budget: 1000000, expectedStatus: 'REJECTED' }
  ];

  for (const tc of testCases) {
    const runId = `BOB-VERIFY-${tc.id}-${Date.now()}`;
    console.log(`\n[${tc.id}] POST /api/purchase-requests (Amount: ${tc.amount}, Budget: ${tc.budget})`);

    // 1. POST
    const postPayload = {
      requester: tc.requester,
      test_run_id: runId,
      amount: tc.amount,
      budget: tc.budget
    };

    const postRes = await fetch(`${BASE_URL}/api/purchase-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload)
    });

    const postStatus = postRes.status;
    const postData = await postRes.json();
    console.log(`  POST Status: ${postStatus}, Body:`, postData);

    // 2. GET
    const getRes = await fetch(`${BASE_URL}/api/purchase-requests/${postData.request_id}?test_run_id=${encodeURIComponent(runId)}`);
    const getStatus = getRes.status;
    const getData = await getRes.json();
    console.log(`  GET Status: ${getStatus}, Body:`, getData);

    const isStatusMatch = postData.status === tc.expectedStatus && getData.status === tc.expectedStatus;
    const isDataMatch =
      postData.request_id === getData.request_id &&
      postData.requester === getData.requester &&
      postData.test_run_id === getData.test_run_id &&
      Number(postData.amount) === Number(getData.amount) &&
      Number(postData.budget) === Number(getData.budget);

    const passed = postStatus === 201 && getStatus === 200 && isStatusMatch && isDataMatch;

    results.apiIntegrationTests.push({
      testId: tc.id,
      description: `Amount: ${tc.amount}, Budget: ${tc.budget} -> Expected: ${tc.expectedStatus}`,
      postRequest: postPayload,
      postResponse: { status: postStatus, body: postData },
      getResponse: { status: getStatus, body: getData },
      expectedStatus: tc.expectedStatus,
      actualStatus: postData.status,
      statusMatch: isStatusMatch,
      dataMatch: isDataMatch,
      result: passed ? 'PASS' : 'FAIL'
    });
  }

  console.log('\n=== Step 4: Negative Tests ===');

  const negativeCases = [
    {
      id: 'NEG-01',
      name: '잘못된 Test Run ID (특수문자 포함)',
      method: 'POST',
      url: `${BASE_URL}/api/purchase-requests`,
      payload: { requester: 'bob-tester', test_run_id: 'invalid@run!id', amount: 500000, budget: 1000000 },
      expectedStatus: 400
    },
    {
      id: 'NEG-02',
      name: '존재하지 않는 Request ID 조회',
      method: 'GET',
      url: `${BASE_URL}/api/purchase-requests/999999?test_run_id=BOB-UI-001`,
      expectedStatus: 404
    }
  ];

  for (const neg of negativeCases) {
    console.log(`\n[${neg.id}] ${neg.name}`);
    let res;
    if (neg.method === 'POST') {
      res = await fetch(neg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(neg.payload)
      });
    } else {
      res = await fetch(neg.url);
    }
    const status = res.status;
    let body;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    console.log(`  Response Status: ${status}, Body:`, body);
    const passed = status === neg.expectedStatus;
    results.negativeTests.push({
      testId: neg.id,
      name: neg.name,
      expectedStatus: neg.expectedStatus,
      actualStatus: status,
      responseBody: body,
      result: passed ? 'PASS' : 'FAIL'
    });
  }

  console.log('\n=== Step 3: Browser E2E Tests with Playwright ===');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    results.consoleErrors.push(err.message);
  });

  // Browser E2E for each scenario
  for (const tc of testCases) {
    console.log(`\n[E2E-${tc.id}] Browser Test: ${tc.expectedStatus}`);
    await page.goto(`${BASE_URL}/purchases.html`, { waitUntil: 'networkidle' });

    const currentRunId = `BOB-E2E-${tc.id}-${Date.now()}`;
    await page.fill('#createTestRunId', currentRunId);
    await page.fill('#createRequester', tc.requester);
    await page.fill('#createAmount', String(tc.amount));
    await page.fill('#createBudget', String(tc.budget));

    // Screenshot before submit
    await page.screenshot({ path: path.join(screenshotsDir, `${tc.id}_01_before_submit.png`), fullPage: true });

    // Submit
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/purchase-requests') && res.request().method() === 'POST'),
      page.click('#createBtn')
    ]);

    const createdData = await response.json();
    await page.waitForTimeout(400);

    // Verify status badge
    const badgeText = (await page.textContent('#statusBadgeContainer')).trim();
    const isBadgeMatch = badgeText.includes(tc.expectedStatus);

    // Verify auto sync into lookup fields
    const autoRequestId = await page.inputValue('#requestId');
    const autoRunId = await page.inputValue('#lookupRun');
    const isSyncMatch = String(autoRequestId) === String(createdData.request_id) && autoRunId === currentRunId;

    // Screenshot after create
    await page.screenshot({ path: path.join(screenshotsDir, `${tc.id}_02_created.png`), fullPage: true });

    // Click Lookup
    const [lookupRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/purchase-requests/') && res.request().method() === 'GET'),
      page.click('#lookup')
    ]);

    const lookupData = await lookupRes.json();
    await page.waitForTimeout(400);

    // Screenshot after lookup
    await page.screenshot({ path: path.join(screenshotsDir, `${tc.id}_03_looked_up.png`), fullPage: true });

    const isLookupMatch =
      lookupData.request_id === createdData.request_id &&
      lookupData.status === tc.expectedStatus &&
      Number(lookupData.amount) === tc.amount;

    const e2ePassed = isBadgeMatch && isSyncMatch && isLookupMatch;

    results.browserE2ETests.push({
      testId: `E2E-${tc.id}`,
      scenario: tc.id,
      expectedStatus: tc.expectedStatus,
      badgeText,
      autoRequestId,
      autoRunId,
      createdData,
      lookupData,
      isBadgeMatch,
      isSyncMatch,
      isLookupMatch,
      result: e2ePassed ? 'PASS' : 'FAIL',
      screenshots: [
        `docs/screenshots/e2e-verification/${tc.id}_01_before_submit.png`,
        `docs/screenshots/e2e-verification/${tc.id}_02_created.png`,
        `docs/screenshots/e2e-verification/${tc.id}_03_looked_up.png`
      ]
    });
  }

  // Browser Negative E2E Test (Client validation & 404 lookup)
  console.log('\n[E2E-NEG-01] Client-side Validation Test (Empty Requester)');
  await page.goto(`${BASE_URL}/purchases.html`, { waitUntil: 'networkidle' });
  await page.fill('#createRequester', '');
  await page.fill('#createAmount', '500000');
  await page.fill('#createBudget', '1000000');
  await page.click('#createBtn');
  await page.waitForTimeout(300);

  const requesterErrorVisible = await page.isVisible('#error-requester.cds--visible');
  const notificationText = (await page.textContent('#statusNotification')).trim();
  console.log(`  Validation error visible: ${requesterErrorVisible}, Notification: ${notificationText}`);
  await page.screenshot({ path: path.join(screenshotsDir, 'NEG_01_client_validation.png'), fullPage: true });

  results.browserE2ETests.push({
    testId: 'E2E-NEG-01',
    scenario: '클라이언트 유효성 검사 (Requester 누락 시 인라인 에러 및 제출 차단)',
    requesterErrorVisible,
    notificationText,
    result: requesterErrorVisible ? 'PASS' : 'FAIL',
    screenshots: ['docs/screenshots/e2e-verification/NEG_01_client_validation.png']
  });

  // Browser Negative E2E Test (404 Lookup Error Badge Display)
  console.log('\n[E2E-NEG-02] 404 Not Found Lookup Error Display Test');
  await page.fill('#requestId', '999999');
  await page.fill('#lookupRun', 'NON_EXISTENT_RUN');
  await page.click('#lookup');
  await page.waitForTimeout(400);

  const errorBadgeText = (await page.textContent('#statusBadgeContainer')).trim();
  const errorNotification = (await page.textContent('#statusNotification')).trim();
  console.log(`  Error Badge: ${errorBadgeText}, Error Notification: ${errorNotification}`);
  await page.screenshot({ path: path.join(screenshotsDir, 'NEG_02_404_error_display.png'), fullPage: true });

  const isErrorProperlyDisplayed = errorBadgeText.includes('ERROR') || errorNotification.includes('404');
  results.browserE2ETests.push({
    testId: 'E2E-NEG-02',
    scenario: '존재하지 않는 Request ID 조회 시 ERROR 상태 배지 및 오류 알림 표시',
    errorBadgeText,
    errorNotification,
    result: isErrorProperlyDisplayed ? 'PASS' : 'FAIL',
    screenshots: ['docs/screenshots/e2e-verification/NEG_02_404_error_display.png']
  });

  await browser.close();

  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'e2e-verification-results.json'), JSON.stringify(results, null, 2));
  console.log('\n모든 검증 완료 및 결과 저장 완료 (docs/e2e-verification-results.json)');
}

runFullVerification().catch(console.error);
