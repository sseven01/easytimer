use crate::db::models::Task;
use crate::db::Database;
use crate::error::AppError;

/// Stateless service that operates on a borrowed [`Database`].
pub struct TaskService;

impl TaskService {
    /// Return every task.
    pub fn get_all_tasks(db: &Database) -> Result<Vec<Task>, AppError> {
        let mut stmt = db.conn().prepare(
            "SELECT id, name, action_type, action_value, schedule_type, \
             schedule_conf, enabled, next_run_at FROM tasks",
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
             schedule_conf, enabled, next_run_at FROM tasks WHERE enabled = 1",
        )?;
        let tasks = stmt
            .query_map([], |row| Task::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }

    /// Insert a new task and return its id.
    pub fn add_task(db: &Database, task: &Task) -> Result<i64, AppError> {
        let conf = serde_json::to_string(&task.schedule_conf).unwrap_or_default();
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
                task.enabled,
                task.next_run_at,
            ],
        )?;
        Ok(db.conn().last_insert_rowid())
    }

    /// Update an existing task (must have an `id`).
    pub fn update_task(db: &Database, task: &Task) -> Result<(), AppError> {
        let id = task
            .id
            .ok_or_else(|| AppError::NotFound("Task id is required".into()))?;
        let conf = serde_json::to_string(&task.schedule_conf).unwrap_or_default();
        db.conn().execute(
            "UPDATE tasks SET name=?1, action_type=?2, action_value=?3, \
             schedule_type=?4, schedule_conf=?5, enabled=?6, next_run_at=?7 \
             WHERE id=?8",
            rusqlite::params![
                task.name,
                task.action_type,
                task.action_value,
                task.schedule_type,
                conf,
                task.enabled,
                task.next_run_at,
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

    /// Toggle the `enabled` flag of a task.
    pub fn toggle_task(db: &Database, id: i64) -> Result<(), AppError> {
        db.conn().execute(
            "UPDATE tasks SET enabled = NOT enabled WHERE id=?1",
            rusqlite::params![id],
        )?;
        Ok(())
    }
}
