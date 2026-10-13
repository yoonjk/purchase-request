-- Step 4: run against the same MySQL schema as Step 3. No seed data.
CREATE TABLE IF NOT EXISTS modernization_progress (
 application_id VARCHAR(40) PRIMARY KEY,
 phase VARCHAR(30) NOT NULL DEFAULT 'ANALYSIS',
 status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',
 progress_percent INT NOT NULL DEFAULT 0,
 owner_name VARCHAR(120), planned_end_date DATE, notes TEXT,
 updated_by VARCHAR(120) NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_progress_application FOREIGN KEY (application_id) REFERENCES modernization_application(application_id),
 CONSTRAINT chk_progress_percent CHECK (progress_percent BETWEEN 0 AND 100),
 CONSTRAINT chk_progress_phase CHECK (phase IN ('ANALYSIS','PLANNING','TRANSFORMATION','TESTING','DEPLOYMENT')),
 CONSTRAINT chk_progress_status CHECK (status IN ('NOT_STARTED','IN_PROGRESS','BLOCKED','COMPLETED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS modernization_progress_history (
 history_id BIGINT AUTO_INCREMENT PRIMARY KEY, application_id VARCHAR(40) NOT NULL,
 old_phase VARCHAR(30), new_phase VARCHAR(30) NOT NULL,
 old_status VARCHAR(30), new_status VARCHAR(30) NOT NULL,
 old_percent INT, new_percent INT NOT NULL,
 changed_by VARCHAR(120) NOT NULL, changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_progress_history_app(application_id,changed_at),
 CONSTRAINT fk_progress_history_application FOREIGN KEY(application_id) REFERENCES modernization_application(application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
