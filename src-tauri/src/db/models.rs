use serde::{Deserialize, Serialize};

/// A scheduled task.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: Option<i64>,
    pub name: String,
    pub action_type: String,
    pub action_value: String,
    pub schedule_type: String,
    pub schedule_conf: serde_json::Value,
    pub enabled: bool,
    pub next_run_at: Option<String>,
}

impl Task {
    /// Construct a `Task` from a rusqlite row.
    ///
    /// Column order must match the SELECT in the calling query:
    /// 0 id, 1 name, 2 action_type, 3 action_value, 4 schedule_type,
    /// 5 schedule_conf, 6 enabled, 7 next_run_at
    pub fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let schedule_conf_str: String = row.get(5)?;
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            action_type: row.get(2)?,
            action_value: row.get(3)?,
            schedule_type: row.get(4)?,
            schedule_conf: serde_json::from_str(&schedule_conf_str).unwrap_or_default(),
            enabled: row.get(6)?,
            next_run_at: row.get(7)?,
        })
    }
}

/// A single execution log entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: Option<i64>,
    pub task_id: i64,
    pub task_name: String,
    pub action_type: String,
    pub action_value: String,
    pub status: String,
    pub message: String,
    pub executed_at: String,
}
