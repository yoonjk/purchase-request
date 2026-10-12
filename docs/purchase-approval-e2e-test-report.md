# IBM Bob — Purchase Approval End-to-End 통합 검증 보고서

## 문서 정보

| 항목 | 내용 |
|---|---|
| **프로젝트** | Purchase Approval System (구매 품의 관리 시스템) |
| **애플리케이션 스택** | Java 21 / Spring Boot 4.1.1 / MyBatis / MySQL / Carbon Design v11 |
| **테스트 대상 URL** | Base: `http://localhost:8080`, UI: `/purchases.html` |
| **테스트 도구** | Playwright (Chromium Headless / 1280x900) & Node.js Native HTTP Client |
| **테스트 일시** | 2026-10-12 18:31:54 (KST) |
| **수행자** | Senior Java Developer & QA Automation Engineer (Bob) |
| **최종 판정** | **ALL PASSED (10/10 테스트 케이스 성공, 0 실패)** |

---

## 1. Executive Summary (전체 테스트 요약)

IBM Carbon Design System 스타일로 개편된 Purchase Approval 웹 UI와 Spring Boot 백엔드 REST API 간의 통합 동작을 4단계(정적 분석, REST API 연동, 브라우저 E2E, 네거티브 테스트)에 걸쳐 종합 검증하였습니다.

- **정적 분석**: HTML / JS / CSS 간 ID 및 이벤트 리스너 100% 정상 매핑, XSS 취약점 없는 안전한 DOM 조작(`replaceChildren`), 비즈니스 판정의 서버 집중 설계 확인 완료.
- **REST API 연동 테스트**: `TC-01(AUTO_APPROVED)`, `TC-02(PENDING_APPROVAL)`, `TC-03(REJECTED)` 모두 HTTP 201/200 응답 및 데이터 정합성 100% 일치.
- **브라우저 E2E 테스트**: Playwright를 통해 폼 입력, 자동 Test Run ID 채번, 승인 상태 Carbon Tag 시각화, Request ID 조회 필드 자동 동기화, 조회 결과 일치 여부를 모두 검증 통과.
- **네거티브 테스트**: 유효하지 않은 파라미터(잘못된 `test_run_id`, 404 미존재 ID 조회, 빈 입력값)에 대해 클라이언트 차단 및 서버 400/404 에러 배지(`ERROR`)가 `REJECTED`와 명확히 구분되어 처리됨을 확인.

---

## 2. 테스트 케이스별 실행 결과 요약

| Test ID | 구분 | 시나리오 요약 | 입력값 (Amount / Budget) | 기대 결과 | 실제 결과 | 판정 |
|---|:---:|---|---|---|---|:---:|
| **TC-01** | API | 소액 품의 자동 승인 | ₩500,000 / ₩1,000,000 | `AUTO_APPROVED` | `AUTO_APPROVED` | **PASS** |
| **TC-02** | API | 한도 초과 결재 대기 | ₩1,500,000 / ₩2,000,000 | `PENDING_APPROVAL` | `PENDING_APPROVAL` | **PASS** |
| **TC-03** | API | 예산 초과 품의 반려 | ₩1,200,000 / ₩1,000,000 | `REJECTED` | `REJECTED` | **PASS** |
| **NEG-01** | API | 잘못된 Test Run ID (특수문자) | test_run_id: `invalid@run!id` | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| **NEG-02** | API | 존재하지 않는 Request ID 조회 | ID: `999999` 조회 | HTTP 404 Not Found | HTTP 404 Not Found | **PASS** |
| **E2E-01** | UI | TC-01 브라우저 E2E 및 태그 시각화 | ₩500,000 / ₩1,000,000 | Green Tag + 자동 동기화 | Green Tag `AUTO_APPROVED` | **PASS** |
| **E2E-02** | UI | TC-02 브라우저 E2E 및 태그 시각화 | ₩1,500,000 / ₩2,000,000 | Blue Tag + 자동 동기화 | Blue Tag `PENDING_APPROVAL` | **PASS** |
| **E2E-03** | UI | TC-03 브라우저 E2E 및 태그 시각화 | ₩1,200,000 / ₩1,000,000 | Red Tag + 자동 동기화 | Red Tag `REJECTED` | **PASS** |
| **E2E-NEG-01** | UI | 클라이언트 필수값 누락 검증 | Requester: `""` (공백) | 인라인 에러 + 제출 차단 | 에러 노출 및 전송 차단 | **PASS** |
| **E2E-NEG-02** | UI | 404 에러 시 화면 표시 검증 | Request ID: `999999` | `ERROR` 배지 및 에러 알림 | `ERROR` 배지 노출 | **PASS** |

---

## 3. 세부 테스트 실행 내역 및 HTTP Payload

### 3.1. [TC-01] 자동 승인 시나리오 (AUTO_APPROVED)
- **POST 요청**: `POST /api/purchase-requests`
  ```json
  {
    "requester": "bob-tester-01",
    "test_run_id": "BOB-VERIFY-TC-01-1791797502965",
    "amount": 500000,
    "budget": 1000000
  }
  ```
- **POST 응답 (HTTP 201 Created)**:
  ```json
  {
    "request_id": 7,
    "requester": "bob-tester-01",
    "test_run_id": "BOB-VERIFY-TC-01-1791797502965",
    "amount": 500000,
    "budget": 1000000,
    "status": "AUTO_APPROVED"
  }
  ```
- **GET 재조회 응답 (HTTP 200 OK)**:
  `GET /api/purchase-requests/7?test_run_id=BOB-VERIFY-TC-01-1791797502965`
  POST 응답 데이터와 100% 동일함 확인.

---

### 3.2. [TC-02] 결재 대기 시나리오 (PENDING_APPROVAL)
- **POST 요청**: `POST /api/purchase-requests`
  ```json
  {
    "requester": "bob-tester-02",
    "test_run_id": "BOB-VERIFY-TC-02-1791797503702",
    "amount": 1500000,
    "budget": 2000000
  }
  ```
- **POST 응답 (HTTP 201 Created)**:
  ```json
  {
    "request_id": 8,
    "requester": "bob-tester-02",
    "test_run_id": "BOB-VERIFY-TC-02-1791797503702",
    "amount": 1500000,
    "budget": 2000000,
    "status": "PENDING_APPROVAL"
  }
  ```
- **GET 재조회 응답 (HTTP 200 OK)**:
  `GET /api/purchase-requests/8?test_run_id=BOB-VERIFY-TC-02-1791797503702`
  POST 응답 데이터와 100% 동일함 확인.

---

### 3.3. [TC-03] 예산 초과 반려 시나리오 (REJECTED)
- **POST 요청**: `POST /api/purchase-requests`
  ```json
  {
    "requester": "bob-tester-03",
    "test_run_id": "BOB-VERIFY-TC-03-1791797504227",
    "amount": 1200000,
    "budget": 1000000
  }
  ```
- **POST 응답 (HTTP 201 Created)**:
  ```json
  {
    "request_id": 9,
    "requester": "bob-tester-03",
    "test_run_id": "BOB-VERIFY-TC-03-1791797504227",
    "amount": 1200000,
    "budget": 1000000,
    "status": "REJECTED"
  }
  ```
- **GET 재조회 응답 (HTTP 200 OK)**:
  `GET /api/purchase-requests/9?test_run_id=BOB-VERIFY-TC-03-1791797504227`
  POST 응답 데이터와 100% 동일함 확인.

---

### 3.4. [NEG-01 ~ NEG-02] 네거티브 예외 처리 검증
1. **잘못된 Test Run ID (NEG-01)**:
   - 요청: `test_run_id: "invalid@run!id"`
   - 응답: `HTTP 400 Bad Request` (`Invalid test_run_id`)
2. **존재하지 않는 Request ID (NEG-02)**:
   - 요청: `GET /api/purchase-requests/999999`
   - 응답: `HTTP 404 Not Found` (`Not found`)

---

## 4. 브라우저 E2E 화면 검증 및 스크린샷 기록

Playwright 브라우저 E2E 테스트를 통해 생성된 스크린샷과 상태 배지 렌더링 내역입니다.

| 시나리오 | 캡처 파일 경로 | 화면 렌더링 검증 결과 |
|---|---|---|
| **E2E-TC-01** | `docs/screenshots/e2e-verification/TC-01_02_created.png`<br>`docs/screenshots/e2e-verification/TC-01_03_looked_up.png` | • **Green Tag**: `AUTO_APPROVED (자동 승인)`<br>• Request ID `10` 및 Run ID 자동 입력 확인 |
| **E2E-TC-02** | `docs/screenshots/e2e-verification/TC-02_02_created.png`<br>`docs/screenshots/e2e-verification/TC-02_03_looked_up.png` | • **Blue Tag**: `PENDING_APPROVAL (결재 대기)`<br>• Request ID `11` 및 Run ID 자동 입력 확인 |
| **E2E-TC-03** | `docs/screenshots/e2e-verification/TC-03_02_created.png`<br>`docs/screenshots/e2e-verification/TC-03_03_looked_up.png` | • **Red Tag**: `REJECTED (예산 초과 반려)`<br>• Request ID `12` 및 Run ID 자동 입력 확인 |
| **E2E-NEG-01** | `docs/screenshots/e2e-verification/NEG_01_client_validation.png` | • `요청자 이름을 입력해주세요.` 인라인 에러 노출<br>• 미입력 상태에서 API 호출 방지 |
| **E2E-NEG-02** | `docs/screenshots/e2e-verification/NEG_02_404_error_display.png` | • 회색 `ERROR` 배지 및 붉은색 에러 알림 표시<br>• 비즈니스 `REJECTED`와 명확히 구분 |

---

## 5. 정적 분석 및 아키텍처/보안 검토

1. **승인 비즈니스 로직 위치**:
   - 프런트엔드는 어떠한 승인 판정 계산도 수행하지 않으며, 오직 Spring Boot의 `PurchaseApprovalService`가 반환하는 `status` 값에 따라 시각적 UI 컴포넌트(Tag, Color)만 렌더링합니다.
2. **에러 상태 분리**:
   - 시스템/API 오류(400, 404, 500) 발생 시 `renderStatusBadge('ERROR')`를 호출하여 정상 비즈니스 반려(`REJECTED`)와 명확하게 구분 처리되었습니다.
3. **XSS 및 인젝션 방어**:
   - `replaceChildren()` 및 `textContent`를 통한 안전한 DOM 노드 주입 방식을 채택하여 스크립트 인젝션을 원천 차단하였습니다.
4. **Air-gap 및 무의존성 완결**:
   - 외부 CDN을 일체 사용하지 않고 로컬 CSS(`/css/purchases.css`) 및 JS(`/js/purchases.js`)로만 구성되어 폐쇄망 환경에서도 100% 완결 동작합니다.

---

## 6. 발견된 결함 및 수정 권고사항

- **발견된 결함**: 없음 (모든 Happy Path 및 Negative Path 테스트 100% 정상 통과)
- **개선 권고사항**:
  1. *네트워크 타임아웃 방어*: 현재 `fetch`에 기본 타임아웃이 설정되어 있지 않으므로, 장기 지연 시를 대비하여 `AbortController` 기반 10초 타임아웃을 적용하는 것을 권장합니다.
  2. *다국어 i18n 확장*: Thymeleaf 메시지 번들(`messages.properties`)을 연동하면 추후 글로벌 언어 확장이 용이합니다.

---

## 7. 최종 결론

본 구매 승인 UI 및 Spring Boot 백엔드는 **IBM Carbon Design System v11** 표준과 **REST API Contract**를 완벽하게 준수하며, 모든 비즈니스 승인 규칙(`AUTO_APPROVED`, `PENDING_APPROVAL`, `REJECTED`) 및 예외 처리가 무결하게 동작함을 확인하였습니다. **프로덕션 검증 및 배포 준비가 완료되었습니다.**
