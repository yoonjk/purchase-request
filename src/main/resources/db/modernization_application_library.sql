INSERT INTO modernization_application_library (
    application_id,
    library_id,
    used_version
)
SELECT
    CASE
        WHEN l.library_type = 'INTERNAL' THEN 'APP-001'
        WHEN l.library_type = 'SOLUTION' THEN 'APP-002'
        ELSE 'APP-003'
    END,
    l.library_id,
    l.current_version
FROM modernization_library l
WHERE l.deleted_yn = 'N'
  AND l.library_name IN (
      'Spring Framework', 'MyBatis', 'Apache Commons Lang',
      'Hibernate ORM', 'Log4j', 'Jackson Databind',
      'SLF4J API', 'Apache HttpClient', 'JUnit',
      'Spring Security', 'company-common-core.jar',
      'company-security.jar', 'company-database.jar',
      'company-logging.jar', 'company-batch.jar',
      'company-auth.jar', 'company-file.jar',
      'company-message.jar', 'Vendor Transaction SDK',
      'Vendor Messaging Client', 'Vendor Report Engine',
      'Vendor Encryption SDK', 'Vendor Scheduler',
      'Vendor Document SDK'
  )
ON DUPLICATE KEY UPDATE
    used_version = VALUES(used_version);