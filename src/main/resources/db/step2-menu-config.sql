-- Execute once on the existing application database. No existing tables are dropped.
CREATE TABLE IF NOT EXISTS app_menu_config (
  menu_code VARCHAR(40) NOT NULL PRIMARY KEY,
  menu_name VARCHAR(100) NOT NULL,
  visible_yn CHAR(1) NOT NULL DEFAULT 'Y',
  sort_order INT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_app_menu_visible CHECK (visible_yn IN ('Y','N'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO app_menu_config(menu_code,menu_name,visible_yn,sort_order) VALUES
('PORTFOLIO','Application Portfolio','Y',10),
('PROGRESS','Modernization Progress','Y',20),
('REPORTS','Reports & Analytics','Y',30),
('TEST_AUTOMATION','Test Automation','Y',40),
('TEST_APPLICATIONS','Test Applications','Y',50),
('PURCHASE','구매 관리','Y',60),
('HR','HR 인사 관리','Y',70)
ON DUPLICATE KEY UPDATE menu_name=VALUES(menu_name), sort_order=VALUES(sort_order);
-- Modernization Dashboard is mandatory; Configuration is ADMIN-only, not configurable.
