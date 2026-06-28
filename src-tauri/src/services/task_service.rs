use crate::db::models::{LogEntry, Task, Trigger};
use crate::db::Database;
use crate::error::AppError;

/// Stateless service that operates on a borrowed [`Database`].
pub struct TaskService;

impl TaskService {
    pub fn get_all_tasks(db: &Database) -> Result<Vec<Task>, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, name, action_type, action_value, enabled, created_at, updated_at FROM tasks ORDER BY id",
        )?;
        let tasks = stmt.query_map([], |row| Task::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }

    pub fn get_enabled_tasks(db: &Database) -> Result<Vec<Task>, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, name, action_type, action_value, enabled, created_at, updated_at FROM tasks WHERE enabled = 1",
        )?;
        let tasks = stmt.query_map([], |row| Task::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }

    pub fn get_task(db: &Database, id: i64) -> Result<Task, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, name, action_type, action_value, enabled, created_at, updated_at FROM tasks WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(rusqlite::params![id], |row| Task::from_row(row))?;
        match rows.next() {
            Some(Ok(task)) => Ok(task),
            Some(Err(e)) => Err(e.into()),
            None => Err(AppError::NotFound(format!("Task with id {} not found", id))),
        }
    }

    pub fn add_task(db: &Database, task: &Task) -> Result<i64, AppError> {
        db.conn().execute(
            "INSERT INTO tasks (name, action_type, action_value, enabled) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![task.name, task.action_type, task.action_value, task.enabled as i32],
        )?;
        Ok(db.conn().last_insert_rowid())
    }

    pub fn update_task(db: &Database, task: &Task) -> Result<(), AppError> {
        let id = task.id.ok_or_else(|| AppError::NotFound("Task id is required".into()))?;
        db.conn().execute(
            "UPDATE tasks SET name=?1, action_type=?2, action_value=?3, enabled=?4, updated_at=CURRENT_TIMESTAMP WHERE id=?5",
            rusqlite::params![task.name, task.action_type, task.action_value, task.enabled as i32, id],
        )?;
        Ok(())
    }

    pub fn delete_task(db: &Database, id: i64) -> Result<(), AppError> {
        db.conn().execute("DELETE FROM tasks WHERE id=?1", rusqlite::params![id])?;
        Ok(())
    }

    pub fn toggle_task(db: &Database, id: i64, enabled: bool) -> Result<(), AppError> {
        db.conn().execute(
            "UPDATE tasks SET enabled = ?1, updated_at = CURRENT_TIMESTAMP WHERE id=?2",
            rusqlite::params![enabled as i32, id],
        )?;
        // Sync trigger enabled state
        db.conn().execute(
            "UPDATE triggers SET enabled = ?1 WHERE task_id = ?2",
            rusqlite::params![enabled as i32, id],
        )?;
        // If disabling, clear next_run_at; if enabling, recalculate
        if !enabled {
            db.conn().execute(
                "UPDATE triggers SET next_run_at = NULL WHERE task_id = ?1",
                rusqlite::params![id],
            )?;
        } else {
            let triggers = Self::get_triggers(db, id)?;
            for trigger in triggers {
                if let Some(next) = crate::db::models::calc_cron_next(&trigger.cron_expression, chrono::Local::now()) {
                    db.conn().execute(
                        "UPDATE triggers SET next_run_at = ?1 WHERE id = ?2",
                        rusqlite::params![next, trigger.id],
                    )?;
                }
            }
        }
        Ok(())
    }

    pub fn get_logs(db: &Database, limit: i64) -> Result<Vec<LogEntry>, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, task_id, task_name, action, status, message, executed_at FROM logs ORDER BY id DESC LIMIT ?1",
        )?;
        let logs = stmt.query_map(rusqlite::params![limit], |row| LogEntry::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(logs)
    }

    pub fn clear_logs(db: &Database) -> Result<(), AppError> {
        db.conn().execute("DELETE FROM logs", [])?;
        Ok(())
    }

    pub fn get_setting(db: &Database, key: &str) -> Result<Option<String>, AppError> {
        let mut stmt = db.conn().prepare("SELECT value FROM settings WHERE key = ?1")?;
        let mut rows = stmt.query_map(rusqlite::params![key], |row| row.get::<_, String>(0))?;
        match rows.next() {
            Some(Ok(val)) => Ok(Some(val)),
            Some(Err(e)) => Err(e.into()),
            None => Ok(None),
        }
    }

    pub fn set_setting(db: &Database, key: &str, value: &str) -> Result<(), AppError> {
        db.conn().execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }

    // ─── Trigger CRUD ─────────────────────────────────────

    pub fn get_triggers(db: &Database, task_id: i64) -> Result<Vec<Trigger>, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, task_id, cron_expression, enabled, next_run_at, created_at FROM triggers WHERE task_id = ?1 ORDER BY id",
        )?;
        let triggers = stmt.query_map(rusqlite::params![task_id], |row| Trigger::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(triggers)
    }

    pub fn get_all_enabled_triggers(db: &Database) -> Result<Vec<(Trigger, Task)>, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT t.id, t.task_id, t.cron_expression, t.enabled, t.next_run_at, t.created_at,
                    k.id, k.name, k.action_type, k.action_value, k.enabled, k.created_at, k.updated_at
             FROM triggers t
             INNER JOIN tasks k ON t.task_id = k.id
             WHERE t.enabled = 1 AND k.enabled = 1
             ORDER BY t.next_run_at"
        )?;
        let rows = stmt.query_map([], |row| {
            let trigger = Trigger::from_row(row)?;
            // Task fields start at column 6
            let task = Task {
                id: row.get(6)?,
                name: row.get(7)?,
                action_type: row.get(8)?,
                action_value: row.get(9)?,
                enabled: row.get::<_, i32>(10)? != 0,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            };
            Ok((trigger, task))
        })?;
        let result = rows.collect::<Result<Vec<_>, _>>()?;
        Ok(result)
    }

    pub fn add_trigger(db: &Database, task_id: i64, cron_expression: &str) -> Result<i64, AppError> {
        // Validate cron expression
        crate::db::models::CronExpr::parse(cron_expression)
            .map_err(|e| AppError::Custom(format!("Cron表达式无效: {}", e)))?;
        // Calculate initial next_run_at
        let next_run = crate::db::models::calc_cron_next(cron_expression, chrono::Local::now());
        db.conn().execute(
            "INSERT INTO triggers (task_id, cron_expression, next_run_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![task_id, cron_expression, next_run],
        )?;
        Ok(db.conn().last_insert_rowid())
    }

    pub fn update_trigger(db: &Database, id: i64, cron_expression: &str, enabled: bool) -> Result<(), AppError> {
        crate::db::models::CronExpr::parse(cron_expression)
            .map_err(|e| AppError::Custom(format!("Cron表达式无效: {}", e)))?;
        let next_run = if enabled {
            crate::db::models::calc_cron_next(cron_expression, chrono::Local::now())
        } else {
            None
        };
        db.conn().execute(
            "UPDATE triggers SET cron_expression=?1, enabled=?2, next_run_at=?3 WHERE id=?4",
            rusqlite::params![cron_expression, enabled as i32, next_run, id],
        )?;
        Ok(())
    }

    pub fn delete_trigger(db: &Database, id: i64) -> Result<(), AppError> {
        db.conn().execute("DELETE FROM triggers WHERE id=?1", rusqlite::params![id])?;
        Ok(())
    }

    pub fn toggle_trigger(db: &Database, id: i64, enabled: bool) -> Result<(), AppError> {
        let trigger = {
            let mut stmt = db.conn().prepare(
                "SELECT id, task_id, cron_expression, enabled, next_run_at, created_at FROM triggers WHERE id = ?1"
            )?;
            let mut rows = stmt.query_map(rusqlite::params![id], |row| Trigger::from_row(row))?;
            rows.next().transpose()?.ok_or_else(|| AppError::NotFound(format!("Trigger {} not found", id)))?
        };
        let next_run = if enabled {
            crate::db::models::calc_cron_next(&trigger.cron_expression, chrono::Local::now())
        } else {
            None
        };
        db.conn().execute(
            "UPDATE triggers SET enabled=?1, next_run_at=?2 WHERE id=?3",
            rusqlite::params![enabled as i32, next_run, id],
        )?;
        Ok(())
    }
}
