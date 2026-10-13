-- Step 3 schema. Execute once on the existing MySQL 8 database. No sample business data inserted.
CREATE TABLE IF NOT EXISTS modernization_application (
 application_id VARCHAR(40) PRIMARY KEY, application_name VARCHAR(160) NOT NULL,
 owner_team VARCHAR(120), current_java VARCHAR(40), current_spring VARCHAR(60), current_was VARCHAR(100), build_tool VARCHAR(50),
 target_java VARCHAR(40) DEFAULT '21', target_spring VARCHAR(60) DEFAULT '6.x', target_jakarta VARCHAR(80) DEFAULT 'Jakarta EE',
 risk_level VARCHAR(30) DEFAULT 'NOT_ASSESSED', notes TEXT, deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_app_name(application_name), INDEX idx_app_risk(risk_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS modernization_library (
 library_id BIGINT AUTO_INCREMENT PRIMARY KEY, library_name VARCHAR(200) NOT NULL,
 library_type VARCHAR(30) NOT NULL, group_id VARCHAR(200), artifact_id VARCHAR(200), repository_source VARCHAR(200),
 current_version VARCHAR(100) NOT NULL, target_version VARCHAR(100), version_policy VARCHAR(20) NOT NULL DEFAULT 'ASSESS',
 compatibility_status VARCHAR(30) NOT NULL DEFAULT 'NOT_TESTED', owner_team VARCHAR(120), assessment_notes TEXT,
 deleted_yn CHAR(1) NOT NULL DEFAULT 'N', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_lib_type(library_type), INDEX idx_lib_name(library_name), INDEX idx_lib_status(compatibility_status),
 CONSTRAINT chk_lib_type CHECK(library_type IN ('MAVEN_CENTRAL','INTERNAL','SOLUTION')),
 CONSTRAINT chk_internal_keep CHECK(library_type <> 'INTERNAL' OR version_policy <> 'KEEP' OR target_version = current_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS modernization_application_library (
 application_id VARCHAR(40) NOT NULL, library_id BIGINT NOT NULL, used_version VARCHAR(100),
 PRIMARY KEY(application_id,library_id), INDEX idx_al_library(library_id),
 FOREIGN KEY(application_id) REFERENCES modernization_application(application_id),
 FOREIGN KEY(library_id) REFERENCES modernization_library(library_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
