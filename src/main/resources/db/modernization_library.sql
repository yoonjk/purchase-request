INSERT INTO modernization_library (
    library_name,
    library_type,
    group_id,
    artifact_id,
    repository_source,
    current_version,
    target_version,
    version_policy,
    compatibility_status,
    owner_team,
    assessment_notes
)
SELECT
    src.library_name,
    src.library_type,
    src.group_id,
    src.artifact_id,
    src.repository_source,
    src.current_version,
    src.target_version,
    src.version_policy,
    src.compatibility_status,
    src.owner_team,
    src.assessment_notes
FROM (
    SELECT
        'Spring Framework' library_name,
        'MAVEN_CENTRAL' library_type,
        'org.springframework' group_id,
        'spring-core' artifact_id,
        'Maven Central' repository_source,
        '5.3.20' current_version,
        '6.x' target_version,
        'ASSESS' version_policy,
        'NOT_TESTED' compatibility_status,
        'OSS' owner_team,
        'Java 21 and Jakarta assessment required' assessment_notes
    UNION ALL SELECT
        'MyBatis', 'MAVEN_CENTRAL',
        'org.mybatis', 'mybatis', 'Maven Central',
        '3.5.10', '3.5.x', 'ASSESS',
        'NOT_TESTED', 'OSS', 'Mapper compatibility test'
    UNION ALL SELECT
        'Apache Commons Lang', 'MAVEN_CENTRAL',
        'commons-lang', 'commons-lang', 'Maven Central',
        '2.6', NULL, 'ASSESS',
        'NOT_TESTED', 'OSS', 'API compatibility review'
    UNION ALL SELECT
        'Hibernate ORM', 'MAVEN_CENTRAL',
        'org.hibernate', 'hibernate-core', 'Maven Central',
        '5.6.15.Final', NULL, 'ASSESS',
        'NOT_TESTED', 'OSS', 'Jakarta persistence review'
    UNION ALL SELECT
        'Log4j', 'MAVEN_CENTRAL',
        'log4j', 'log4j', 'Maven Central',
        '1.2.17', NULL, 'ASSESS',
        'NOT_TESTED', 'OSS', 'Legacy logging replacement review'
    UNION ALL SELECT
        'Jackson Databind', 'MAVEN_CENTRAL',
        'com.fasterxml.jackson.core', 'jackson-databind',
        'Maven Central', '2.12.7', NULL,
        'ASSESS', 'NOT_TESTED', 'OSS', 'Security and API review'
    UNION ALL SELECT
        'SLF4J API', 'MAVEN_CENTRAL',
        'org.slf4j', 'slf4j-api', 'Maven Central',
        '1.7.36', NULL, 'ASSESS',
        'NOT_TESTED', 'OSS', 'Logging compatibility review'
    UNION ALL SELECT
        'Apache HttpClient', 'MAVEN_CENTRAL',
        'org.apache.httpcomponents', 'httpclient', 'Maven Central',
        '4.5.13', NULL, 'ASSESS',
        'NOT_TESTED', 'OSS', 'HTTP client compatibility review'
    UNION ALL SELECT
        'JUnit', 'MAVEN_CENTRAL',
        'junit', 'junit', 'Maven Central',
        '4.13.2', NULL, 'ASSESS',
        'NOT_TESTED', 'OSS', 'JUnit 5 migration review'
    UNION ALL SELECT
        'Spring Security', 'MAVEN_CENTRAL',
        'org.springframework.security', 'spring-security-core',
        'Maven Central', '5.8.0', NULL,
        'ASSESS', 'NOT_TESTED', 'OSS', 'Spring Security upgrade review'
    UNION ALL SELECT
        'company-common-core.jar', 'INTERNAL',
        'com.company.common', 'common-core', 'Internal Nexus',
        '1.4.2', '1.4.2', 'KEEP',
        'NOT_TESTED', '공통기술팀', 'Keep current version'
    UNION ALL SELECT
        'company-security.jar', 'INTERNAL',
        'com.company.security', 'security-core', 'Internal Nexus',
        '2.1.0', '2.1.0', 'KEEP',
        'NOT_TESTED', '보안개발팀', 'Keep current version'
    UNION ALL SELECT
        'company-database.jar', 'INTERNAL',
        'com.company.database', 'database-core', 'Internal Nexus',
        '1.8.0', '1.8.0', 'KEEP',
        'NOT_TESTED', '공통기술팀', 'JDBC compatibility test'
    UNION ALL SELECT
        'company-logging.jar', 'INTERNAL',
        'com.company.logging', 'logging-core', 'Internal Nexus',
        '1.3.5', '1.3.5', 'KEEP',
        'NOT_TESTED', '공통기술팀', 'Logging compatibility test'
    UNION ALL SELECT
        'company-batch.jar', 'INTERNAL',
        'com.company.batch', 'batch-core', 'Internal Nexus',
        '3.2.1', '3.2.1', 'KEEP',
        'NOT_TESTED', '배치개발팀', 'Batch compatibility test'
    UNION ALL SELECT
        'company-auth.jar', 'INTERNAL',
        'com.company.auth', 'auth-core', 'Internal Nexus',
        '2.4.0', '2.4.0', 'KEEP',
        'NOT_TESTED', '보안개발팀', 'Authentication API review'
    UNION ALL SELECT
        'company-file.jar', 'INTERNAL',
        'com.company.file', 'file-core', 'Internal Nexus',
        '1.6.0', '1.6.0', 'KEEP',
        'NOT_TESTED', '공통기술팀', 'File processing test'
    UNION ALL SELECT
        'company-message.jar', 'INTERNAL',
        'com.company.message', 'message-core', 'Internal Nexus',
        '2.0.3', '2.0.3', 'KEEP',
        'NOT_TESTED', '인터페이스팀', 'Messaging API review'
    UNION ALL SELECT
        'Vendor Transaction SDK', 'SOLUTION',
        'com.vendor.transaction', 'transaction-sdk',
        'Vendor Repository', '3.0', NULL,
        'ASSESS', 'VENDOR_CHECK',
        '솔루션운영팀', 'Confirm Java 21 support with vendor'
    UNION ALL SELECT
        'Vendor Messaging Client', 'SOLUTION',
        'com.vendor.messaging', 'messaging-client',
        'Vendor Repository', '5.0', NULL,
        'ASSESS', 'VENDOR_CHECK',
        '솔루션운영팀', 'Confirm Jakarta messaging compatibility'
    UNION ALL SELECT
        'Vendor Report Engine', 'SOLUTION',
        'com.vendor.report', 'report-engine',
        'Vendor Repository', '4.2', NULL,
        'ASSESS', 'VENDOR_CHECK',
        '솔루션운영팀', 'Confirm Java 21 support'
    UNION ALL SELECT
        'Vendor Encryption SDK', 'SOLUTION',
        'com.vendor.crypto', 'encryption-sdk',
        'Vendor Repository', '2.5', NULL,
        'ASSESS', 'VENDOR_CHECK',
        '보안솔루션팀', 'Confirm cryptographic provider support'
    UNION ALL SELECT
        'Vendor Scheduler', 'SOLUTION',
        'com.vendor.scheduler', 'scheduler',
        'Vendor Repository', '6.1', NULL,
        'ASSESS', 'VENDOR_CHECK',
        '솔루션운영팀', 'Confirm scheduler compatibility'
    UNION ALL SELECT
        'Vendor Document SDK', 'SOLUTION',
        'com.vendor.document', 'document-sdk',
        'Vendor Repository', '3.8', NULL,
        'ASSESS', 'VENDOR_CHECK',
        '솔루션운영팀', 'Confirm Java 21 compatibility'
) src
WHERE NOT EXISTS (
    SELECT 1
    FROM modernization_library l
    WHERE l.library_type = src.library_type
      AND l.library_name = src.library_name
      AND l.current_version = src.current_version
);