/// Schema migration: tasks table.
pub const CREATE_TASKS_TABLE: &str = "
CREATE TABLE IF NOT EXISTS tasks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    action_type   TEXT    NOT NULL,
    action_value  TEXT    DEFAULT '',
    schedule_type TEXT    NOT NULL,
    schedule_conf TEXT    NOT NULL DEFAULT '{}',
    enabled       INTEGER DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_run_at   TIMESTAMP
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
INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_start', '0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('minimize_to_tray', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('sound_enabled', '0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('log_retain_days', '30');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notif_duration', '5');
";
