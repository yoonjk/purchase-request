-- Step 5: Test Result Collector schema.
-- Execute once on the TEST MySQL 8 database only (never on production).
-- Requires modernization_application (step3-modernization.sql) and these rows,
-- registered through POST /api/modernization/applications (not by SQL):
--   APP-004 Purchase Management  (module PURCHASE)
--   APP-005 HR Management        (module HR)
-- Module -> application_id mapping is configured in tests/publish-results.js (HUB_APP_ID_PURCHASE / HUB_APP_ID_HR).

CREATE TABLE IF NOT EXISTS modernization_test_run (
    run_id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    execution_id     VARCHAR(100) NOT NULL,
    application_id   VARCHAR(40)  NOT NULL,
    module           VARCHAR(30)  NOT NULL,
    framework        VARCHAR(30)  NOT NULL,
    test_type        VARCHAR(10)  NOT NULL,
    started_at       DATETIME(3)  NOT NULL,
    finished_at      DATETIME(3)  NOT NULL,
    duration_ms      BIGINT       NOT NULL DEFAULT 0,
    total_count      INT          NOT NULL DEFAULT 0,
    passed_count     INT          NOT NULL DEFAULT 0,
    failed_count     INT          NOT NULL DEFAULT 0,
    skipped_count    INT          NOT NULL DEFAULT 0,
    execution_status VARCHAR(20)  NOT NULL,
    content_hash     CHAR(64)     NOT NULL,
    created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT uq_test_run_execution_id UNIQUE (execution_id),
    CONSTRAINT fk_test_run_application FOREIGN KEY (application_id) REFERENCES modernization_application(application_id),
    CONSTRAINT chk_test_run_module CHECK (module IN ('PURCHASE','HR')),
    CONSTRAINT chk_test_run_framework CHECK (framework IN ('NEWMAN','PLAYWRIGHT')),
    CONSTRAINT chk_test_run_type CHECK (test_type IN ('API','UI')),
    CONSTRAINT chk_test_run_status CHECK (execution_status IN ('PASSED','FAILED')),
    CONSTRAINT chk_test_run_counts CHECK (total_count = passed_count + failed_count + skipped_count),
    INDEX idx_test_run_app (application_id, started_at),
    INDEX idx_test_run_module (module, test_type, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS modernization_test_result (
    result_id     BIGINT        AUTO_INCREMENT PRIMARY KEY,
    run_id        BIGINT        NOT NULL,
    test_case_key VARCHAR(100)  NOT NULL,
    test_name     VARCHAR(500)  NOT NULL,
    status        VARCHAR(10)   NOT NULL,
    duration_ms   BIGINT,
    http_method   VARCHAR(10),
    http_status   INT,
    error_summary VARCHAR(2000),
    skip_reason   VARCHAR(500),
    CONSTRAINT fk_test_result_run FOREIGN KEY (run_id) REFERENCES modernization_test_run(run_id) ON DELETE CASCADE,
    CONSTRAINT chk_test_result_status CHECK (status IN ('passed','failed','skipped')),
    INDEX idx_test_result_run (run_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
