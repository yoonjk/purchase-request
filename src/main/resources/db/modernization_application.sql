INSERT INTO modernization_application (
    application_id, application_name, owner_team,
    current_java, current_spring, current_was, build_tool,
    target_java, target_spring, target_jakarta,
    risk_level, notes
)
VALUES
('APP-001', 'MemberWebApp', '고객업무팀',
 '6', '2.5.6', 'Tomcat 6', 'Ant',
 '21', '6.x', 'Jakarta EE', 'HIGH',
 'Java 6 legacy modernization'),

('APP-002', 'LoanManagement', '여신개발팀',
 '7', '3.2.18', 'WebLogic 12c', 'Maven',
 '21', '6.x', 'Jakarta EE', 'HIGH',
 'Spring upgrade and WAS compatibility'),

('APP-003', 'AccountService', '계정계개발팀',
 '8', '5.3.20', 'Tomcat 9', 'Maven',
 '21', '6.x', 'Jakarta EE', 'MEDIUM',
 'Java 21 migration')
ON DUPLICATE KEY UPDATE
    application_name = VALUES(application_name),
    owner_team = VALUES(owner_team),
    deleted_yn = 'N';
    