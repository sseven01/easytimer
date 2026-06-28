use serde::{Deserialize, Serialize};
use chrono::{Datelike, Timelike};

/// A scheduled task.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: Option<i64>,
    pub name: String,
    pub action_type: String,
    pub action_value: String,
    pub enabled: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

impl Task {
    /// Construct a `Task` from a rusqlite row.
    pub fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            action_type: row.get(2)?,
            action_value: row.get(3)?,
            enabled: row.get::<_, i32>(4)? != 0,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }
}

/// A single trigger (scheduling rule) for a task.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trigger {
    pub id: Option<i64>,
    pub task_id: i64,
    pub cron_expression: String,
    pub enabled: bool,
    pub next_run_at: Option<String>,
    pub created_at: Option<String>,
}

impl Trigger {
    pub fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            task_id: row.get(1)?,
            cron_expression: row.get(2)?,
            enabled: row.get::<_, i32>(3)? != 0,
            next_run_at: row.get(4)?,
            created_at: row.get(5)?,
        })
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

// ─── Cron Parser ────────────────────────────────────────────────

#[derive(Debug, Clone)]
struct CronField {
    values: Vec<u32>,
}

impl CronField {
    fn parse(spec: &str, min: u32, max: u32) -> Result<Self, String> {
        let mut values = Vec::new();
        for part in spec.split(',') {
            if part == "*" || part == "?" {
                values.extend(min..=max);
            } else if let Some((start_s, step_s)) = part.split_once('/') {
                let step: u32 = step_s.parse().map_err(|_| format!("无效步长: {}", step_s))?;
                if step == 0 { return Err("步长不能为0".into()); }
                let start = if start_s == "*" { min } else {
                    start_s.parse().map_err(|_| format!("无效值: {}", start_s))?
                };
                let mut v = start;
                while v <= max { values.push(v); v += step; }
            } else if let Some((a, b)) = part.split_once('-') {
                let from: u32 = a.parse().map_err(|_| format!("无效值: {}", a))?;
                let to: u32 = b.parse().map_err(|_| format!("无效值: {}", b))?;
                values.extend(from..=to);
            } else {
                let v: u32 = part.parse().map_err(|_| format!("无效值: {}", part))?;
                if v < min || v > max { return Err(format!("值 {} 超出范围 {}-{}", v, min, max)); }
                values.push(v);
            }
        }
        values.sort();
        values.dedup();
        if values.is_empty() { return Err("字段为空".into()); }
        Ok(Self { values })
    }

    fn contains(&self, v: u32) -> bool {
        self.values.contains(&v)
    }

    /// Return the smallest value >= after, or None if all values < after.
    fn next_from(&self, after: u32) -> Option<u32> {
        self.values.iter().copied().find(|&v| v >= after)
    }

    fn first(&self) -> u32 {
        self.values[0]
    }
}

#[derive(Debug)]
pub struct CronExpr {
    second: CronField,
    minute: CronField,
    hour: CronField,
    day: CronField,
    month: CronField,
    weekday: CronField,
}

impl CronExpr {
    pub fn parse(expr: &str) -> Result<Self, String> {
        let parts: Vec<&str> = expr.trim().split_whitespace().collect();
        if parts.len() != 6 {
            return Err(format!("需要6个字段（秒 分 时 日 月 星期），当前{}个", parts.len()));
        }
        Ok(Self {
            second: CronField::parse(parts[0], 0, 59)?,
            minute: CronField::parse(parts[1], 0, 59)?,
            hour: CronField::parse(parts[2], 0, 23)?,
            day: CronField::parse(parts[3], 1, 31)?,
            month: CronField::parse(parts[4], 1, 12)?,
            weekday: CronField::parse(parts[5], 0, 6)?,
        })
    }

    /// Calculate the next execution time after `after` using field-jumping (no brute-force loop).
    pub fn next_after(&self, after: chrono::DateTime<chrono::Local>) -> Option<chrono::DateTime<chrono::Local>> {
        let mut dt = after + chrono::Duration::seconds(1);
        dt = dt.with_nanosecond(0)?;

        for _ in 0..400 { // max ~13 months of jumps
            let mon = dt.month();
            let d = dt.day();
            let wd = dt.weekday().num_days_from_sunday();
            let h = dt.hour();
            let m = dt.minute();
            let s = dt.second();

            // Month mismatch → jump to next valid month
            if !self.month.contains(mon) {
                if let Some(next_mon) = self.month.next_from(mon + 1) {
                    dt = dt.with_month(next_mon)?.with_day(self.day.first())?
                        .with_hour(self.hour.first())?.with_minute(self.minute.first())?
                        .with_second(self.second.first())?;
                } else {
                    // Wrap to next year
                    dt = dt.with_month(self.month.first())?.with_day(self.day.first())?
                        .with_hour(self.hour.first())?.with_minute(self.minute.first())?
                        .with_second(self.second.first())?;
                    dt = dt + chrono::Duration::days(365);
                }
                continue;
            }

            // Day/weekday mismatch → jump to next valid day
            if !self.day.contains(d) && !self.weekday.contains(wd) {
                if let Some(next_d) = self.day.next_from(d + 1) {
                    if let Some(new_dt) = dt.with_day(next_d) {
                        dt = new_dt.with_hour(self.hour.first())?
                            .with_minute(self.minute.first())?.with_second(self.second.first())?;
                        continue;
                    }
                }
                // Roll to next month
                if let Some(next_mon) = self.month.next_from(mon + 1) {
                    dt = dt.with_month(next_mon)?.with_day(self.day.first())?
                        .with_hour(self.hour.first())?.with_minute(self.minute.first())?
                        .with_second(self.second.first())?;
                } else {
                    dt = dt.with_month(self.month.first())?.with_day(self.day.first())?
                        .with_hour(self.hour.first())?.with_minute(self.minute.first())?
                        .with_second(self.second.first())?;
                    dt = dt + chrono::Duration::days(365);
                }
                continue;
            }

            // Hour mismatch
            if !self.hour.contains(h) {
                if let Some(next_h) = self.hour.next_from(h + 1) {
                    dt = dt.with_hour(next_h)?.with_minute(self.minute.first())?
                        .with_second(self.second.first())?;
                } else {
                    // Roll to next day
                    dt = Self::next_day_start(dt)
                        .with_hour(self.hour.first())?.with_minute(self.minute.first())?
                        .with_second(self.second.first())?;
                }
                continue;
            }

            // Minute mismatch
            if !self.minute.contains(m) {
                if let Some(next_m) = self.minute.next_from(m + 1) {
                    dt = dt.with_minute(next_m)?.with_second(self.second.first())?;
                } else {
                    // Roll to next hour
                    if let Some(next_h) = self.hour.next_from(h + 1) {
                        dt = dt.with_hour(next_h)?.with_minute(self.minute.first())?
                            .with_second(self.second.first())?;
                    } else {
                        dt = Self::next_day_start(dt)
                            .with_hour(self.hour.first())?.with_minute(self.minute.first())?
                            .with_second(self.second.first())?;
                    }
                }
                continue;
            }

            // Second mismatch
            if !self.second.contains(s) {
                if let Some(next_s) = self.second.next_from(s + 1) {
                    dt = dt.with_second(next_s)?;
                } else {
                    // Roll to next minute
                    if let Some(next_m) = self.minute.next_from(m + 1) {
                        dt = dt.with_minute(next_m)?.with_second(self.second.first())?;
                    } else if let Some(next_h) = self.hour.next_from(h + 1) {
                        dt = dt.with_hour(next_h)?.with_minute(self.minute.first())?
                            .with_second(self.second.first())?;
                    } else {
                        dt = Self::next_day_start(dt)
                            .with_hour(self.hour.first())?.with_minute(self.minute.first())?
                            .with_second(self.second.first())?;
                    }
                }
                continue;
            }

            return Some(dt);
        }
        None
    }

    fn next_day_start(dt: chrono::DateTime<chrono::Local>) -> chrono::DateTime<chrono::Local> {
        let next = dt.date_naive() + chrono::Duration::days(1);
        next.and_hms_opt(0, 0, 0)
            .map(|naive| naive.and_local_timezone(chrono::Local).single().unwrap_or(dt + chrono::Duration::days(1)))
            .unwrap_or(dt + chrono::Duration::days(1))
    }
}

/// Calculate next run for a cron expression.
pub fn calc_cron_next(cron_expr: &str, after: chrono::DateTime<chrono::Local>) -> Option<String> {
    let cron = CronExpr::parse(cron_expr).ok()?;
    let next = cron.next_after(after)?;
    Some(next.format("%Y-%m-%dT%H:%M:%S%.f%:z").to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cron_every_minute() {
        let cron = CronExpr::parse("0 * * * * ?").unwrap();
        let base = chrono::Local.with_ymd_and_hms(2024, 1, 1, 12, 0, 30).unwrap();
        let next = cron.next_after(base).unwrap();
        assert_eq!(next.format("%H:%M:%S").to_string(), "12:01:00");
    }

    #[test]
    fn test_cron_specific_time() {
        let cron = CronExpr::parse("0 30 12 * * ?").unwrap();
        let base = chrono::Local.with_ymd_and_hms(2024, 1, 1, 12, 0, 0).unwrap();
        let next = cron.next_after(base).unwrap();
        assert_eq!(next.format("%H:%M:%S").to_string(), "12:30:00");
    }

    #[test]
    fn test_cron_past_time_tomorrow() {
        let cron = CronExpr::parse("0 30 12 * * ?").unwrap();
        let base = chrono::Local.with_ymd_and_hms(2024, 1, 1, 13, 0, 0).unwrap();
        let next = cron.next_after(base).unwrap();
        assert_eq!(next.format("%H:%M:%S").to_string(), "12:30:00");
        // Should be next day
        assert_eq!(next.day(), 2);
    }
}
