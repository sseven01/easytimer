pub mod migrations;
pub mod models;

use std::path::Path;

use rusqlite::Connection;

/// Thin wrapper around a rusqlite [`Connection`].
pub struct Database {
    conn: Connection,
}

impl Database {
    /// Open (or create) a SQLite database at `path` with WAL mode enabled.
    pub fn new(path: &Path) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        Ok(Self { conn })
    }

    /// Run all pending schema migrations.
    pub fn init_tables(&self) -> rusqlite::Result<()> {
        // Check if old tasks table has schedule_type column (legacy schema)
        let has_legacy = self.conn.prepare("SELECT schedule_type FROM tasks LIMIT 1").is_ok();
        if has_legacy {
            // Migrate: recreate tasks table without old schedule columns
            self.conn.execute_batch(migrations::MIGRATE_TASKS_V2)?;
            // Migrate old schedule data to triggers table
            self.migrate_old_schedules()?;
        }
        self.conn.execute_batch(migrations::CREATE_TASKS_TABLE)?;
        self.conn.execute_batch(migrations::CREATE_TRIGGERS_TABLE)?;
        self.conn.execute_batch(migrations::CREATE_LOGS_TABLE)?;
        self.conn.execute_batch(migrations::CREATE_SETTINGS_TABLE)?;
        self.conn.execute_batch(migrations::SEED_DEFAULT_SETTINGS)?;
        Ok(())
    }

    /// Migrate old schedule_type/schedule_conf to triggers table.
    fn migrate_old_schedules(&self) -> rusqlite::Result<()> {
        // Check if triggers table has data already
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM triggers", [], |r| r.get(0)).unwrap_or(0);
        if count > 0 {
            return Ok(()); // Already migrated
        }

        // Read old tasks with schedule data
        let mut stmt = self.conn.prepare(
            "SELECT id, schedule_type, schedule_conf FROM tasks WHERE schedule_type IS NOT NULL"
        )?;
        let rows: Vec<(i64, String, String)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?.filter_map(|r| r.ok()).collect();

        for (task_id, schedule_type, schedule_conf) in rows {
            if let Some(cron) = self.schedule_to_cron(&schedule_type, &schedule_conf) {
                let _ = self.conn.execute(
                    "INSERT INTO triggers (task_id, cron_expression, enabled) VALUES (?1, ?2, 1)",
                    rusqlite::params![task_id, cron],
                );
            }
        }
        Ok(())
    }

    /// Convert old schedule_type + schedule_conf JSON to a cron expression.
    fn schedule_to_cron(&self, schedule_type: &str, schedule_conf: &str) -> Option<String> {
        let conf: serde_json::Value = serde_json::from_str(schedule_conf).ok()?;
        match schedule_type {
            "once" => {
                let dt = conf.get("datetime")?.as_str()?;
                let parts: Vec<&str> = dt.split('T').collect();
                let time_part = parts.get(1)?;
                let hm: Vec<&str> = time_part.split(':').collect();
                let h = hm.get(0)?;
                let m = hm.get(1)?;
                let date_parts: Vec<&str> = parts[0].split('-').collect();
                let mon = date_parts.get(1)?;
                let day = date_parts.get(2)?;
                Some(format!("0 {} {} {} {} ?", m, h, day, mon))
            }
            "interval" => {
                let interval = conf.get("interval")?.as_i64()?;
                let unit = conf.get("unit")?.as_str()?;
                match unit {
                    "seconds" => Some(format!("0 */{} * * * ?", interval)),
                    "minutes" => Some(format!("0 */{} * * * ?", interval)),
                    "hours" => Some(format!("0 0 */{} * * ?", interval)),
                    _ => None,
                }
            }
            "daily" => {
                let time = conf.get("time")?.as_str()?;
                let parts: Vec<&str> = time.split(':').collect();
                let h = parts.get(0)?;
                let m = parts.get(1)?;
                Some(format!("0 {} {} * * ?", m, h))
            }
            "weekly" => {
                let time = conf.get("time")?.as_str()?;
                let weekdays = conf.get("weekdays")?.as_array()?;
                let parts: Vec<&str> = time.split(':').collect();
                let h = parts.get(0)?;
                let m = parts.get(1)?;
                // Convert 0=Monday to cron format (0=Sunday)
                let cron_weekdays: Vec<String> = weekdays.iter()
                    .filter_map(|v| v.as_i64())
                    .map(|d| ((d + 1) % 7).to_string())
                    .collect();
                Some(format!("0 {} {} * * {}", m, h, cron_weekdays.join(",")))
            }
            "monthly" => {
                let time = conf.get("time")?.as_str()?;
                let days = conf.get("days")?.as_array()?;
                let parts: Vec<&str> = time.split(':').collect();
                let h = parts.get(0)?;
                let m = parts.get(1)?;
                let cron_days: Vec<String> = days.iter()
                    .filter_map(|v| v.as_i64().map(|d| d.to_string()))
                    .collect();
                Some(format!("0 {} {} {} * ?", m, h, cron_days.join(",")))
            }
            _ => None,
        }
    }

    /// Borrow the underlying connection.
    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    /// Close the connection explicitly (optional – also closed on drop).
    pub fn close(self) -> Result<(), rusqlite::Error> {
        self.conn.close().map_err(|(_, e)| e)
    }
}
