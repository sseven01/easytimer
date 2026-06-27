use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use crate::db::models::Task;
use crate::db::Database;
use crate::services::task_service::TaskService;
use log::{error, info};
use serde_json::json;
use tauri::{Emitter, Manager};

/// 调度器：定时检查并执行到期任务
pub struct Scheduler {
    db: Arc<Mutex<Database>>,
    app_handle: Option<tauri::AppHandle>,
}

impl Scheduler {
    pub fn new(db: Arc<Mutex<Database>>) -> Self {
        Self {
            db,
            app_handle: None,
        }
    }

    /// 设置 AppHandle 用于发送事件
    pub fn set_app_handle(&mut self, handle: tauri::AppHandle) {
        self.app_handle = Some(handle);
    }

    /// 启动调度器后台线程
    pub fn start(&self) {
        let db = self.db.clone();
        let app_handle = self.app_handle.clone();
        thread::spawn(move || {
            info!("调度器已启动");
            loop {
                thread::sleep(Duration::from_secs(5)); // 每5秒检查一次

                let tasks = {
                    let db_guard = match db.lock() {
                        Ok(guard) => guard,
                        Err(e) => {
                            error!("获取数据库锁失败: {}", e);
                            continue;
                        }
                    };
                    match TaskService::get_enabled_tasks(&db_guard) {
                        Ok(tasks) => tasks,
                        Err(e) => {
                            error!("获取任务列表失败: {}", e);
                            continue;
                        }
                    }
                };

                let now = chrono::Local::now();
                for task in tasks {
                    if let Some(next_run) = &task.next_run_at {
                        // 尝试多种格式解析
                        let next_run_dt = Self::parse_datetime(next_run);

                        if let Some(dt) = next_run_dt {
                            if now >= dt {
                                info!("执行任务: {} (ID: {:?})", task.name, task.id);
                                Self::execute_task(&db, &task, &app_handle);
                            }
                        }
                    }
                }
            }
        });
    }

    /// 解析日期时间字符串
    fn parse_datetime(s: &str) -> Option<chrono::DateTime<chrono::Local>> {
        // 尝试带时区的格式
        if let Ok(dt) = chrono::DateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f%:z") {
            return Some(dt.with_timezone(&chrono::Local));
        }
        // 尝试不带时区的格式（视为本地时间）
        if let Ok(naive_dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f") {
            return naive_dt.and_local_timezone(chrono::Local).single();
        }
        if let Ok(naive_dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
            return naive_dt.and_local_timezone(chrono::Local).single();
        }
        if let Ok(naive_dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M") {
            return naive_dt.and_local_timezone(chrono::Local).single();
        }
        None
    }

    /// 执行单个任务
    fn execute_task(
        db: &Arc<Mutex<Database>>,
        task: &Task,
        app_handle: &Option<tauri::AppHandle>,
    ) {
        let result = match task.action_type.as_str() {
            "webpage" => Self::execute_webpage(&task.action_value),
            "reminder" => Self::execute_reminder(task, app_handle),
            "shutdown" => Self::execute_shutdown(),
            "restart" => Self::execute_restart(),
            "hibernate" => Self::execute_hibernate(),
            "lock" => Self::execute_lock(),
            _ => {
                error!("未知的动作类型: {}", task.action_type);
                Err("未知的动作类型".into())
            }
        };

        // 记录日志
        let (status, message) = match result {
            Ok(_) => ("success", "执行成功".to_string()),
            Err(e) => ("failed", format!("执行失败: {}", e)),
        };

        if let Ok(db_guard) = db.lock() {
            let _ = Self::log_execution(&db_guard, task, status, &message);

            // 重新计算下次执行时间
            let next_run = task.calc_next_run();

            if let Some(id) = task.id {
                let _ = db_guard.conn().execute(
                    "UPDATE tasks SET next_run_at = ?1 WHERE id = ?2",
                    rusqlite::params![next_run, id],
                );
                info!(
                    "任务 {} (ID: {}) 下次执行时间: {:?}",
                    task.name, id, next_run
                );
            }
        }
    }

    /// 执行打开网页
    fn execute_webpage(url: &str) -> Result<(), String> {
        if url.is_empty() {
            return Err("URL为空".into());
        }
        open::that(url).map_err(|e| format!("打开网页失败: {}", e))
    }

    /// 执行弹窗提醒 - 通过Tauri事件发送到通知窗口
    fn execute_reminder(
        task: &Task,
        app_handle: &Option<tauri::AppHandle>,
    ) -> Result<(), String> {
        if let Some(handle) = app_handle {
            let payload = json!({
                "title": "EasyTimer 提醒",
                "body": task.action_value,
                "task_id": task.id
            });

            // 检查是否需要播放提醒声音
            if Self::should_play_sound(handle) {
                Self::play_sound();
            }

            // 显示通知窗口
            if let Some(notif_window) = handle.get_webview_window("notification") {
                // 获取设置的弹窗方向
                let direction = Self::get_notification_direction(handle);
                let _ = notif_window.emit("set-direction", &direction);

                // 设置窗口位置
                let _ = Self::position_notification_window(&notif_window, &direction);

                // 显示窗口
                let _ = notif_window.show();
                let _ = notif_window.set_focus();

                // 发送通知内容
                let _ = notif_window.emit("show-notification", payload);

                // 5秒后隐藏
                let window_clone = notif_window.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_secs(5));
                    let _ = window_clone.hide();
                });
            }
        } else {
            error!("AppHandle 未设置，无法发送通知");
        }
        Ok(())
    }

    /// 检查是否需要播放提醒声音
    fn should_play_sound(handle: &tauri::AppHandle) -> bool {
        let state = handle.state::<Arc<Mutex<Database>>>();
        if let Ok(db) = state.lock() {
            if let Ok(Some(val)) = TaskService::get_setting(&db, "notification_sound") {
                return val == "true";
            }
        }
        false
    }

    /// 播放系统提示音
    fn play_sound() {
        #[cfg(target_os = "windows")]
        {
            extern "system" {
                fn MessageBeep(uType: u32) -> i32;
            }
            const MB_ICONEXCLAMATION: u32 = 0x00000030;
            unsafe {
                MessageBeep(MB_ICONEXCLAMATION);
            }
        }
    }

    /// 获取通知方向设置
    fn get_notification_direction(handle: &tauri::AppHandle) -> String {
        // 尝试从数据库获取设置
        let state = handle.state::<Arc<Mutex<Database>>>();
        if let Ok(db) = state.lock() {
            if let Ok(Some(dir)) = TaskService::get_setting(&db, "notification_direction") {
                return dir;
            }
        }
        "right".to_string()
    }

    /// 定位通知窗口到屏幕边缘
    fn position_notification_window(
        window: &tauri::WebviewWindow,
        direction: &str,
    ) -> Result<(), String> {
        if let Some(monitor) = window.current_monitor().ok().flatten() {
            let scale = monitor.scale_factor();
            let physical_size = monitor.size();
            // 转为逻辑像素，与窗口 inner_size 一致
            let screen_w = physical_size.width as f64 / scale;
            let screen_h = physical_size.height as f64 / scale;
            let window_w = 400.0;
            let window_h = 200.0;
            let offset = 20.0;

            let (x, y) = match direction {
                "top" => ((screen_w - window_w) / 2.0, offset),
                "bottom" => ((screen_w - window_w) / 2.0, screen_h - window_h - offset),
                "left" => (offset, (screen_h - window_h) / 2.0),
                "right" => (screen_w - window_w - offset, (screen_h - window_h) / 2.0),
                "center" => ((screen_w - window_w) / 2.0, (screen_h - window_h) / 2.0),
                _ => (screen_w - window_w - offset, (screen_h - window_h) / 2.0),
            };

            window
                .set_position(tauri::Position::Logical(tauri::LogicalPosition {
                    x,
                    y,
                }))
                .map_err(|e| format!("设置窗口位置失败: {}", e))?;
        }
        Ok(())
    }

    /// 执行关机
    fn execute_shutdown() -> Result<(), String> {
        std::process::Command::new("shutdown")
            .args(["/s", "/t", "0"])
            .spawn()
            .map_err(|e| format!("关机失败: {}", e))?;
        Ok(())
    }

    /// 执行重启
    fn execute_restart() -> Result<(), String> {
        std::process::Command::new("shutdown")
            .args(["/r", "/t", "0"])
            .spawn()
            .map_err(|e| format!("重启失败: {}", e))?;
        Ok(())
    }

    /// 执行休眠
    fn execute_hibernate() -> Result<(), String> {
        std::process::Command::new("rundll32.exe")
            .args(["powrprof.dll,SetSuspendState", "0", "1", "0"])
            .spawn()
            .map_err(|e| format!("休眠失败: {}", e))?;
        Ok(())
    }

    /// 执行锁屏
    fn execute_lock() -> Result<(), String> {
        std::process::Command::new("rundll32.exe")
            .args(["user32.dll,LockWorkStation"])
            .spawn()
            .map_err(|e| format!("锁屏失败: {}", e))?;
        Ok(())
    }

    /// 记录执行日志
    fn log_execution(
        db: &Database,
        task: &Task,
        status: &str,
        message: &str,
    ) -> Result<(), rusqlite::Error> {
        db.conn().execute(
            "INSERT INTO logs (task_id, task_name, action, status, message) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![task.id, task.name, task.action_type, status, message],
        )?;
        Ok(())
    }
}
