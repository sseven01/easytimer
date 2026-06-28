/// Schema migration: tasks table.
pub const CREATE_TASKS_TABLE: &str = "
CREATE TABLE IF NOT EXISTS tasks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    action_type   TEXT    NOT NULL,
    action_value  TEXT    DEFAULT '',
    enabled       INTEGER DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
";

/// Migration: recreate tasks table without old schedule columns.
/// This is needed because SQLite doesn't support ALTER TABLE DROP COLUMN
/// and the old table had NOT NULL constraints on schedule_type.
pub const MIGRATE_TASKS_V2: &str = "
CREATE TABLE IF NOT EXISTS tasks_new (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    action_type   TEXT    NOT NULL,
    action_value  TEXT    DEFAULT '',
    enabled       INTEGER DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO tasks_new (id, name, action_type, action_value, enabled, created_at, updated_at)
    SELECT id, name, action_type, action_value, enabled, created_at, updated_at FROM tasks;
DROP TABLE IF EXISTS tasks;
ALTER TABLE tasks_new RENAME TO tasks;
";

/// Schema migration: triggers table (schedule rules per task).
pub const CREATE_TRIGGERS_TABLE: &str = "
CREATE TABLE IF NOT EXISTS triggers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER NOT NULL,
    cron_expression TEXT    NOT NULL,
    enabled         INTEGER DEFAULT 1,
    next_run_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
";

/// Schema migration: execution logs table.
pub const CREATE_LOGS_TABLE: &str = "
CREATE TABLE IF NOT EXISTS logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id      INTEGER NOT NULL,
    task_name    TEXT    NOT NULL,
    action       TEXT    NOT NULL,
    status       TEXT    NOT NULL,
    message      TEXT    DEFAULT '',
    executed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
";

/// Schema migration: key-value settings table.
pub const CREATE_SETTINGS_TABLE: &str = "
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);
";

/// Default settings to insert on first run.
pub const SEED_DEFAULT_SETTINGS: &str = "
INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_start', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('minimize_to_tray', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notification_sound', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notification_direction', 'right');
INSERT OR IGNORE INTO settings (key, value) VALUES ('log_retain_days', '30');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notif_duration', '5');
";
