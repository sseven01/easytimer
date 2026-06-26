use chrono::{Datelike, Local, NaiveDate, NaiveTime};
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
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub next_run_at: Option<String>,
}

impl Task {
    /// Construct a `Task` from a rusqlite row.
    ///
    /// Column order must match the SELECT in the calling query:
    /// 0 id, 1 name, 2 action_type, 3 action_value, 4 schedule_type,
    /// 5 schedule_conf, 6 enabled, 7 created_at, 8 updated_at, 9 next_run_at
    pub fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let schedule_conf_str: String = row.get(5)?;
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            action_type: row.get(2)?,
            action_value: row.get(3)?,
            schedule_type: row.get(4)?,
            schedule_conf: serde_json::from_str(&schedule_conf_str).unwrap_or_default(),
            enabled: row.get::<_, i32>(6)? != 0,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            next_run_at: row.get(9)?,
        })
    }

    /// Calculate the next run time based on `schedule_type` and `schedule_conf`.
    ///
    /// Returns the result as an ISO-8601 string (local time).
    pub fn calc_next_run(&self) -> Option<String> {
        let now = Local::now();
        let ts = match self.schedule_type.as_str() {
            "interval" => {
                let seconds = self
                    .schedule_conf
                    .get("interval")?
                    .as_i64()
                    .unwrap_or(60);
                Some(now + chrono::Duration::seconds(seconds))
            }
            "daily" => {
                let time_str = self.schedule_conf.get("time")?.as_str()?;
                let naive_time = NaiveTime::parse_from_str(time_str, "%H:%M").ok()?;
                let today = now.date_naive();
                let dt = today.and_time(naive_time);
                let local_dt = dt.and_local_timezone(Local).single()?;
                if local_dt <= now {
                    // Time already passed today → tomorrow
                    Some((dt + chrono::Duration::days(1)).and_local_timezone(Local).single()?)
                } else {
                    Some(local_dt)
                }
            }
            "weekly" => {
                let time_str = self.schedule_conf.get("time")?.as_str()?;
                let naive_time = NaiveTime::parse_from_str(time_str, "%H:%M").ok()?;
                let weekday_num = self.schedule_conf.get("weekday")?.as_u64()?; // 0=Mon..6=Sun
                let weekdays = [
                    chrono::Weekday::Mon, chrono::Weekday::Tue, chrono::Weekday::Wed,
                    chrono::Weekday::Thu, chrono::Weekday::Fri, chrono::Weekday::Sat, chrono::Weekday::Sun,
                ];
                let target_weekday = weekdays.get((weekday_num % 7) as usize)?;
                let current_weekday = now.weekday();
                let days_ahead = {
                    let diff = (target_weekday.num_days_from_monday() as i64
                        - current_weekday.num_days_from_monday() as i64)
                        .rem_euclid(7);
                    if diff == 0 {
                        // Same weekday – check if time has passed
                        let candidate =
                            now.date_naive().and_time(naive_time);
                        let local_candidate =
                            candidate.and_local_timezone(Local).single()?;
                        if local_candidate <= now {
                            7
                        } else {
                            return Some(local_candidate.to_string());
                        }
                    } else {
                        diff
                    }
                };
                let target_date =
                    now.date_naive() + chrono::Duration::days(days_ahead);
                Some(
                    target_date
                        .and_time(naive_time)
                        .and_local_timezone(Local)
                        .single()?,
                )
            }
            "monthly" => {
                let time_str = self.schedule_conf.get("time")?.as_str()?;
                let naive_time = NaiveTime::parse_from_str(time_str, "%H:%M").ok()?;
                let day = self.schedule_conf.get("day")?.as_u64()? as u32;
                let mut year = now.year();
                let mut month = now.month();
                // If the day has already passed this month, go to next month
                let candidate = NaiveDate::from_ymd_opt(year, month, day);
                if let Some(d) = candidate {
                    let dt = d.and_time(naive_time);
                    let local_dt = dt.and_local_timezone(Local).single()?;
                    if local_dt <= now {
                        month += 1;
                        if month > 12 {
                            month = 1;
                            year += 1;
                        }
                    }
                } else {
                    month += 1;
                    if month > 12 {
                        month = 1;
                        year += 1;
                    }
                }
                let target_date = NaiveDate::from_ymd_opt(year, month, day.min(28))?;
                Some(
                    target_date
                        .and_time(naive_time)
                        .and_local_timezone(Local)
                        .single()?,
                )
            }
            _ => None,
        };
        ts.map(|dt| dt.format("%Y-%m-%dT%H:%M:%S%.f%:z").to_string())
    }
}

/// A single execution log entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: Option<i64>,
    pub task_id: i64,
    pub task_name: String,
    pub action: String,
    pub status: String,
    pub message: String,
    pub executed_at: Option<String>,
}

impl LogEntry {
    /// Construct a `LogEntry` from a rusqlite row.
    ///
    /// Column order: 0 id, 1 task_id, 2 task_name, 3 action, 4 status, 5 message, 6 executed_at
    pub fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            task_id: row.get(1)?,
            task_name: row.get(2)?,
            action: row.get(3)?,
            status: row.get(4)?,
            message: row.get(5)?,
            executed_at: row.get(6)?,
        })
    }
}
