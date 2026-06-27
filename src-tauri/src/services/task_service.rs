

use crate::db::models::{LogEntry, Task};
use crate::db::Database;
use crate::error::AppError;

/// Stateless service that operates on a borrowed [`Database`].
pub struct TaskService;

impl TaskService {
    /// Return every task ordered by id.
    pub fn get_all_tasks(db: &Database) -> Result<Vec<Task>, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, name, action_type, action_value, schedule_type, \
             schedule_conf, enabled, created_at, updated_at, next_run_at \
             FROM tasks ORDER BY id",
        )?;
        let tasks = stmt
            .query_map([], |row| Task::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }

    /// Return only enabled tasks.
    pub fn get_enabled_tasks(db: &Database) -> Result<Vec<Task>, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, name, action_type, action_value, schedule_type, \
             schedule_conf, enabled, created_at, updated_at, next_run_at \
             FROM tasks WHERE enabled = 1",
        )?;
        let tasks = stmt
            .query_map([], |row| Task::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }

    /// Return a single task by id.
    pub fn get_task(db: &Database, id: i64) -> Result<Task, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, name, action_type, action_value, schedule_type, \
             schedule_conf, enabled, created_at, updated_at, next_run_at \
             FROM tasks WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(rusqlite::params![id], |row| Task::from_row(row))?;
        match rows.next() {
            Some(Ok(task)) => Ok(task),
            Some(Err(e)) => Err(e.into()),
            None => Err(AppError::NotFound(format!("Task with id {} not found", id))),
        }
    }

    /// Insert a new task and return its id.  Also calculates `next_run_at`.
    pub fn add_task(db: &Database, task: &Task) -> Result<i64, AppError> {
        let conf = serde_json::to_string(&task.schedule_conf).unwrap_or_else(|_| "{}".into());
        let next_run = task.calc_next_run();
        db.conn().execute(
            "INSERT INTO tasks \
             (name, action_type, action_value, schedule_type, schedule_conf, enabled, next_run_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                task.name,
                task.action_type,
                task.action_value,
                task.schedule_type,
                conf,
                task.enabled as i32,
                next_run,
            ],
        )?;
        Ok(db.conn().last_insert_rowid())
    }

    /// Update an existing task (must have an `id`).  Recalculates `next_run_at`.
    pub fn update_task(db: &Database, task: &Task) -> Result<(), AppError> {
        let id = task
            .id
            .ok_or_else(|| AppError::NotFound("Task id is required".into()))?;
        let conf = serde_json::to_string(&task.schedule_conf).unwrap_or_else(|_| "{}".into());
        let next_run = if task.enabled {
            task.calc_next_run()
        } else {
            None
        };
        db.conn().execute(
            "UPDATE tasks SET name=?1, action_type=?2, action_value=?3, \
             schedule_type=?4, schedule_conf=?5, enabled=?6, next_run_at=?7, \
             updated_at=CURRENT_TIMESTAMP WHERE id=?8",
            rusqlite::params![
                task.name,
                task.action_type,
                task.action_value,
                task.schedule_type,
                conf,
                task.enabled as i32,
                next_run,
                id,
            ],
        )?;
        Ok(())
    }

    /// Delete a task by id.
    pub fn delete_task(db: &Database, id: i64) -> Result<(), AppError> {
        db.conn()
            .execute("DELETE FROM tasks WHERE id=?1", rusqlite::params![id])?;
        Ok(())
    }

    /// Toggle (or explicitly set) the `enabled` flag of a task.
    pub fn toggle_task(db: &Database, id: i64, enabled: bool) -> Result<(), AppError> {
        db.conn().execute(
            "UPDATE tasks SET enabled = ?1, updated_at = CURRENT_TIMESTAMP WHERE id=?2",
            rusqlite::params![enabled as i32, id],
        )?;
        Ok(())
    }

    /// Return the most recent log entries, newest first.
    pub fn get_logs(db: &Database, limit: i64) -> Result<Vec<LogEntry>, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, task_id, task_name, action, status, message, executed_at \
             FROM logs ORDER BY id DESC LIMIT ?1",
        )?;
        let logs = stmt
            .query_map(rusqlite::params![limit], |row| LogEntry::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(logs)
    }

    /// Delete all log entries.
    pub fn clear_logs(db: &Database) -> Result<(), AppError> {
        db.conn().execute("DELETE FROM logs", [])?;
        Ok(())
    }

    /// Retrieve a single setting value by key.
    pub fn get_setting(db: &Database, key: &str) -> Result<Option<String>, AppError> {
        let mut stmt = db.conn().prepare("SELECT value FROM settings WHERE key = ?1")?;
        let mut rows = stmt.query_map(rusqlite::params![key], |row| row.get::<_, String>(0))?;
        match rows.next() {
            Some(Ok(val)) => Ok(Some(val)),
            Some(Err(e)) => Err(e.into()),
            None => Ok(None),
        }
    }

    /// Insert or replace a setting.
    pub fn set_setting(db: &Database, key: &str, value: &str) -> Result<(), AppError> {
        db.conn().execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }
}
