/// Schema migration: tasks table.
pub const CREATE_TASKS_TABLE: &str = "
CREATE TABLE IF NOT EXISTS tasks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    action_type   TEXT    NOT NULL,
    action_value  TEXT    NOT NULL,
    schedule_type TEXT    NOT NULL,
    schedule_conf TEXT    NOT NULL DEFAULT '{}',
    enabled       INTEGER NOT NULL DEFAULT 1,
    next_run_at   TEXT
);
";

/// Schema migration: execution logs table.
pub const CREATE_LOGS_TABLE: &str = "
CREATE TABLE IF NOT EXISTS logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id      INTEGER NOT NULL,
    task_name    TEXT    NOT NULL,
    action_type  TEXT    NOT NULL,
    action_value TEXT    NOT NULL,
    status       TEXT    NOT NULL,
    message      TEXT    NOT NULL DEFAULT '',
    executed_at  TEXT    NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
";
