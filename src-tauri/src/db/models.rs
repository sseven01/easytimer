use chrono::{Datelike, Local, NaiveTime};
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
    pub fn calc_next_run(&self) -> Option<String> {
        let now = Local::now();
        let ts = match self.schedule_type.as_str() {
            "once" => {
                let datetime_str = self.schedule_conf.get("datetime")?.as_str()?;
                let naive_dt = chrono::NaiveDateTime::parse_from_str(datetime_str, "%Y-%m-%dT%H:%M").ok()
                    .or_else(|| chrono::NaiveDateTime::parse_from_str(datetime_str, "%Y-%m-%dT%H:%M:%S").ok())?;
                let local_dt = naive_dt.and_local_timezone(Local).single()?;
                if local_dt <= now {
                    return None; // 已过期
                }
                Some(local_dt)
            }
            "interval" => {
                let raw = self
                    .schedule_conf
                    .get("interval")?
                    .as_i64()
                    .unwrap_or(60);
                let unit = self
                    .schedule_conf
                    .get("unit")
                    .and_then(|u| u.as_str())
                    .unwrap_or("seconds");
                let seconds = match unit {
                    "hours" => raw * 3600,
                    "minutes" => raw * 60,
                    _ => raw,
                };
                Some(now + chrono::Duration::seconds(seconds))
            }
            "daily" => {
                let time_str = self.schedule_conf.get("time")?.as_str()?;
                let naive_time = NaiveTime::parse_from_str(time_str, "%H:%M").ok()?;
                let today = now.date_naive();
                let dt = today.and_time(naive_time);
                let local_dt = dt.and_local_timezone(Local).single()?;
                if local_dt <= now {
                    Some((dt + chrono::Duration::days(1)).and_local_timezone(Local).single()?)
                } else {
                    Some(local_dt)
                }
            }
            "weekly" => {
                let time_str = self.schedule_conf.get("time")?.as_str()?;
                let naive_time = NaiveTime::parse_from_str(time_str, "%H:%M").ok()?;
                let weekdays = self.schedule_conf.get("weekdays")?.as_array()?;
                
                // 找到最近的一个匹配的星期几
                let current_weekday = now.weekday().num_days_from_monday() as i64;
                let mut min_days_ahead = 7i64;
                
                for wd in weekdays {
                    let target = wd.as_i64()? as i64;
                    let mut diff = target - current_weekday;
                    if diff <= 0 {
                        diff += 7;
                    }
                    // 如果是今天，检查时间是否已过
                    if diff == 0 {
                        let candidate = now.date_naive().and_time(naive_time);
                        let local_candidate = candidate.and_local_timezone(Local).single()?;
                        if local_candidate <= now {
                            diff = 7;
                        }
                    }
                    if diff < min_days_ahead {
                        min_days_ahead = diff;
                    }
                }
                
                let target_date = now.date_naive() + chrono::Duration::days(min_days_ahead);
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
                let days = self.schedule_conf.get("days")?.as_array()?;

                let mut best: Option<chrono::DateTime<Local>> = None;

                for d in days {
                    let target_day = d.as_i64()? as u32;

                    // Try this month
                    if let Some(naive) = now.date_naive().with_day(target_day) {
                        if let Some(local) = naive.and_time(naive_time).and_local_timezone(Local).single() {
                            if local > now {
                                if best.is_none() || local < best.unwrap() {
                                    best = Some(local);
                                }
                                continue;
                            }
                        }
                    }

                    // Try next month: go to day 1 of next month, then with_day
                    if let Some(next_first) = (now.date_naive() + chrono::Duration::days(32)).with_day(1) {
                        if let Some(naive) = next_first.with_day(target_day) {
                            if let Some(local) = naive.and_time(naive_time).and_local_timezone(Local).single() {
                                if best.is_none() || local < best.unwrap() {
                                    best = Some(local);
                                }
                            }
                        }
                    }
                }

                best
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
