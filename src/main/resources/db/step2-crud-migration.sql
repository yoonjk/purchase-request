-- Execute ONCE after the Step 2 menu-config DDL.
-- This migration preserves existing menu rows and settings.
ALTER TABLE app_menu_config ADD COLUMN deleted_yn CHAR(1) NOT NULL DEFAULT 'N';
-- On databases where deleted_yn already exists, skip the ALTER statement.
-- Restored menus default to hidden until an admin explicitly enables them.
