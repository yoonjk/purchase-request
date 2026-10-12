// ==========================================================================
// IBM Bob Hands-on Lab - Purchase Approval Client Script
// ==========================================================================

// Essential Elements
const result = document.getElementById('result');
const notification = document.getElementById('statusNotification');
const notificationIcon = document.getElementById('notificationIcon');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const statusBadgeContainer = document.getElementById('statusBadgeContainer');
const summaryTableContainer = document.getElementById('summaryTableContainer');
const jsonTimestamp = document.getElementById('jsonTimestamp');

// Input Elements
const createTestRunIdInput = document.getElementById('createTestRunId') || document.getElementById('test_run_id');
const lookupRunInput = document.getElementById('lookupRun');
const requestIdInput = document.getElementById('requestId');

// SVG Icons
const SVG_SUCCESS = `<svg width="20" height="20" viewBox="0 0 32 32" fill="#24a148"><path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm-2 19.59l-5-5 1.41-1.41L14 18.77l8.59-8.58L24 11.6z"/></svg>`;
const SVG_ERROR = `<svg width="20" height="20" viewBox="0 0 32 32" fill="#da1e28"><path d="M16 2C8.2 2 2 8.2 2 16s6.2 14 14 14 14-6.2 14-14S23.8 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12zm-1-18h2v10h-2zm0 12h2v2h-2z"/></svg>`;
const SVG_INFO = `<svg width="20" height="20" viewBox="0 0 32 32" fill="#0f62fe"><path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 5a1.5 1.5 0 1 1-1.5 1.5A1.5 1.5 0 0 1 16 7zm4 16h-8v-2h3v-7h-2v-2h5v9h2z"/></svg>`;

/**
 * 고유한 Test Run ID 생성 유틸리티 (규칙: ^[A-Za-z0-9_-]{1,64}$)
 * 형식 예: BOB-RUN-20261012-173000-A1B2
 */
function generateUniqueTestRunId() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BOB-RUN-${dateStr}-${timeStr}-${randStr}`;
}

// 초기화 시 고유 Test Run ID 자동 생성 및 설정 (사용자가 직접 수정 가능)
function initUniqueTestRunId() {
  const initialRunId = generateUniqueTestRunId();
  if (createTestRunIdInput && !createTestRunIdInput.value) {
    createTestRunIdInput.value = initialRunId;
  }
  if (lookupRunInput && !lookupRunInput.value) {
    lookupRunInput.value = initialRunId;
  }
}

// Test Run ID 재생성 버튼 리스너 (존재하는 경우)
const regenerateRunIdBtn = document.getElementById('btnRegenerateRunId');
if (regenerateRunIdBtn) {
  regenerateRunIdBtn.addEventListener('click', () => {
    const newRunId = generateUniqueTestRunId();
    if (createTestRunIdInput) createTestRunIdInput.value = newRunId;
    if (lookupRunInput) lookupRunInput.value = newRunId;
    setNotification('info', 'Test Run ID 생성:', `새로운 고유 Test Run ID (${newRunId})가 설정되었습니다.`);
  });
}

function setNotification(type, title, message) {
  if (!notification) return;
  notification.className = 'cds--inline-notification cds--visible cds--inline-notification--' + type;
  if (notificationTitle) notificationTitle.textContent = title;
  if (notificationMessage) notificationMessage.textContent = message;
  if (notificationIcon) {
    if (type === 'success') notificationIcon.innerHTML = SVG_SUCCESS;
    else if (type === 'error') notificationIcon.innerHTML = SVG_ERROR;
    else notificationIcon.innerHTML = SVG_INFO;
  }
}

function hideNotification() {
  if (notification) {
    notification.className = 'cds--inline-notification';
  }
}

function renderStatusBadge(status) {
  if (!statusBadgeContainer) return;
  let badgeClass = 'cds--tag--gray';
  let label = status || 'READY';

  if (status === 'AUTO_APPROVED') {
    badgeClass = 'cds--tag--green';
    label = 'AUTO_APPROVED (자동 승인)';
  } else if (status === 'PENDING_APPROVAL') {
    badgeClass = 'cds--tag--blue';
    label = 'PENDING_APPROVAL (결재 대기)';
  } else if (status === 'REJECTED') {
    badgeClass = 'cds--tag--red';
    label = 'REJECTED (예산 초과 반려)';
  }

  statusBadgeContainer.replaceChildren();
  const badge = document.createElement('span');
  badge.className = `cds--tag ${badgeClass}`;
  const dot = document.createElement('span');
  dot.className = 'cds--tag__dot';
  const text = document.createElement('span');
  text.textContent = label;
  badge.append(dot, text);
  statusBadgeContainer.appendChild(badge);
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '-';
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
}

function show(d) {
  if (result) {
    result.textContent = JSON.stringify(d, null, 2);
  }
  if (jsonTimestamp) {
    jsonTimestamp.textContent = 'Updated: ' + new Date().toLocaleTimeString();
  }

  if (d && typeof d === 'object') {
    if (summaryTableContainer) summaryTableContainer.style.display = 'block';
    const resId = document.getElementById('res-id');
    const resRequester = document.getElementById('res-requester');
    const resRun = document.getElementById('res-run');
    const resAmounts = document.getElementById('res-amounts');
    const resStatus = document.getElementById('res-status');

    const requestIdVal = d.request_id !== undefined ? d.request_id : (d.id !== undefined ? d.id : '-');
    if (resId) resId.textContent = requestIdVal;
    if (resRequester) resRequester.textContent = d.requester || '-';
    if (resRun) resRun.textContent = d.test_run_id || d.testRunId || '-';
    
    const amtStr = formatCurrency(d.amount);
    const budStr = formatCurrency(d.budget);
    if (resAmounts) resAmounts.textContent = `${amtStr} / 가용예산: ${budStr}`;
    
    if (resStatus) {
      const statusSpan = document.createElement('span');
      statusSpan.textContent = d.status || '-';
      resStatus.innerHTML = '';
      resStatus.appendChild(statusSpan);
    }

    renderStatusBadge(d.status);
  }
}

function showError(err) {
  const msg = err && err.message ? err.message : String(err);
  if (result) result.textContent = msg;
  if (jsonTimestamp) jsonTimestamp.textContent = 'Error: ' + new Date().toLocaleTimeString();
  if (summaryTableContainer) summaryTableContainer.style.display = 'none';
  renderStatusBadge('ERROR');
  setNotification('error', 'API Error:', msg || '요청 처리 중 오류가 발생했습니다.');
}

// Input Validation Helpers
function setInputError(inputId, errorId, isError) {
  const input = document.getElementById(inputId);
  const errorText = document.getElementById(errorId);
  if (!input || !errorText) return;
  if (isError) {
    input.classList.add('cds--text-input--invalid');
    errorText.classList.add('cds--visible');
  } else {
    input.classList.remove('cds--text-input--invalid');
    errorText.classList.remove('cds--visible');
  }
}

// Create Form Handler
const createForm = document.getElementById('create');
if (createForm) {
  createForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideNotification();

    const form = e.target;
    const formData = new FormData(form);
    const x = Object.fromEntries(formData);

    let hasError = false;

    // Validate Requester
    const requesterInput = document.getElementById('createRequester') || document.getElementById('requester');
    const requesterId = requesterInput ? requesterInput.id : 'createRequester';
    if (!x.requester || !x.requester.trim()) {
      setInputError(requesterId, 'error-requester', true);
      hasError = true;
    } else {
      setInputError(requesterId, 'error-requester', false);
    }

    // Validate Test Run ID
    const runInput = document.getElementById('createTestRunId') || document.getElementById('test_run_id');
    const runIdElem = runInput ? runInput.id : 'createTestRunId';
    const runRegex = /^[A-Za-z0-9_-]{1,64}$/;
    if (!x.test_run_id || !runRegex.test(x.test_run_id)) {
      setInputError(runIdElem, 'error-test_run_id', true);
      hasError = true;
    } else {
      setInputError(runIdElem, 'error-test_run_id', false);
    }

    // Validate Amount
    const amountInput = document.getElementById('createAmount') || document.getElementById('amount');
    const amountIdElem = amountInput ? amountInput.id : 'createAmount';
    const amtNum = Number(x.amount);
    if (!x.amount || isNaN(amtNum) || amtNum <= 0) {
      setInputError(amountIdElem, 'error-amount', true);
      hasError = true;
    } else {
      setInputError(amountIdElem, 'error-amount', false);
    }

    // Validate Budget
    const budgetInput = document.getElementById('createBudget') || document.getElementById('budget');
    const budgetIdElem = budgetInput ? budgetInput.id : 'createBudget';
    const budNum = Number(x.budget);
    if (x.budget === '' || isNaN(budNum) || budNum < 0) {
      setInputError(budgetIdElem, 'error-budget', true);
      hasError = true;
    } else {
      setInputError(budgetIdElem, 'error-budget', false);
    }

    if (hasError) {
      setNotification('error', 'Validation Error:', '필수 입력 항목과 입력값을 확인해주세요.');
      return;
    }

    x.amount = amtNum;
    x.budget = budNum;

    // Loading state
    const createBtn = document.getElementById('createBtn');
    const createSpinner = document.getElementById('createSpinner');
    const createBtnText = document.getElementById('createBtnText');
    if (createBtn) createBtn.disabled = true;
    if (createSpinner) createSpinner.style.display = 'inline-block';
    if (createBtnText) createBtnText.textContent = 'Submitting...';
    setNotification('info', 'Processing:', '새 구매 요청을 서버에 전송 중입니다...');

    try {
      const r = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(x)
      });
      const d = await r.json();
      if (!r.ok) {
        throw new Error(d.message || JSON.stringify(d));
      }

      // [자동화] Create request 성공 시 응답의 request_id를 조회 입력란에 자동 설정
      const createdId = d.request_id !== undefined ? d.request_id : d.id;
      if (createdId == null || !d.status) {
        throw new Error('API 응답에 Request ID 또는 승인 상태가 없습니다.');
      }
      const createdRunId = d.test_run_id || d.testRunId || x.test_run_id;

      if (requestIdInput) {
        requestIdInput.value = createdId;
      }
      // [자동화] 조회용 test_run_id도 생성에 사용한 값으로 자동 설정
      if (lookupRunInput && createdRunId) {
        lookupRunInput.value = createdRunId;
      }

      show(d);
      setNotification('success', 'Success:', `구매 요청이 성공적으로 등록되었습니다. (Request ID: ${createdId}, 상태: ${d.status})`);
    } catch (err) {
      showError(err);
    } finally {
      if (createBtn) createBtn.disabled = false;
      if (createSpinner) createSpinner.style.display = 'none';
      if (createBtnText) createBtnText.textContent = 'Create request';
    }
  });
}

// Lookup Button Handler
const lookupBtn = document.getElementById('lookup');
if (lookupBtn) {
  lookupBtn.addEventListener('click', async () => {
    hideNotification();

    const id = requestIdInput ? requestIdInput.value : '';
    const run = lookupRunInput ? lookupRunInput.value : '';

    let hasError = false;

    if (!id || Number(id) <= 0) {
      setInputError('requestId', 'error-requestId', true);
      hasError = true;
    } else {
      setInputError('requestId', 'error-requestId', false);
    }

    if (!run || !run.trim()) {
      setInputError('lookupRun', 'error-lookupRun', true);
      hasError = true;
    } else {
      setInputError('lookupRun', 'error-lookupRun', false);
    }

    if (hasError) {
      setNotification('error', 'Validation Error:', '조회할 Request ID와 Test run ID를 입력해주세요.');
      return;
    }

    // Loading state
    const lookupSpinner = document.getElementById('lookupSpinner');
    const lookupBtnText = document.getElementById('lookupBtnText');
    lookupBtn.disabled = true;
    if (lookupSpinner) lookupSpinner.style.display = 'inline-block';
    if (lookupBtnText) lookupBtnText.textContent = 'Searching...';
    setNotification('info', 'Searching:', `Request ID #${id} 정보를 조회하는 중입니다...`);

    try {
      const r = await fetch('/api/purchase-requests/' + encodeURIComponent(id) + '?test_run_id=' + encodeURIComponent(run));
      const d = await r.json();
      if (!r.ok) {
        throw new Error(d.message || JSON.stringify(d));
      }
      show(d);
      setNotification('success', 'Found:', `구매 요청 #${id} 정보를 성공적으로 가져왔습니다.`);
    } catch (err) {
      showError(err);
    } finally {
      lookupBtn.disabled = false;
      if (lookupSpinner) lookupSpinner.style.display = 'none';
      if (lookupBtnText) lookupBtnText.textContent = 'Find request';
    }
  });
}

// DOM 준비 시 초기화 실행
document.addEventListener('DOMContentLoaded', initUniqueTestRunId);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initUniqueTestRunId();
}
