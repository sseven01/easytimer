use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use crate::db::models::Task;
use crate::db::Database;
use crate::services::task_service::TaskService;
use log::{error, info};
use serde_json::json;
use tauri::{Emitter, Manager};

/// 调度器：基于触发器的定时调度
pub struct Scheduler {
    db: Arc<Mutex<Database>>,
    app_handle: Option<tauri::AppHandle>,
}

impl Scheduler {
    pub fn new(db: Arc<Mutex<Database>>) -> Self {
        Self { db, app_handle: None }
    }

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
                thread::sleep(Duration::from_secs(5));

                let triggers = {
                    let db_guard = match db.lock() {
                        Ok(g) => g,
                        Err(e) => { error!("获取数据库锁失败: {}", e); continue; }
                    };
                    match TaskService::get_all_enabled_triggers(&db_guard) {
                        Ok(t) => t,
                        Err(e) => { error!("获取触发器列表失败: {}", e); continue; }
                    }
                };

                let now = chrono::Local::now();
                for (trigger, task) in triggers {
                    if let Some(ref next_run) = trigger.next_run_at {
                        if let Some(dt) = Self::parse_datetime(next_run) {
                            if now >= dt {
                                info!("触发器 {} 执行任务: {} (ID: {:?})", trigger.id.unwrap_or(0), task.name, task.id);
                                Self::execute_task(&db, &task, &app_handle);
                                // Recalculate next_run_at for this trigger
                                if let Some(next) = crate::db::models::calc_cron_next(&trigger.cron_expression, now) {
                                    if let Ok(db_guard) = db.lock() {
                                        let _ = db_guard.conn().execute(
                                            "UPDATE triggers SET next_run_at = ?1 WHERE id = ?2",
                                            rusqlite::params![next, trigger.id],
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    fn parse_datetime(s: &str) -> Option<chrono::DateTime<chrono::Local>> {
        if let Ok(dt) = chrono::DateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f%:z") {
            return Some(dt.with_timezone(&chrono::Local));
        }
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

    fn execute_task(db: &Arc<Mutex<Database>>, task: &Task, app_handle: &Option<tauri::AppHandle>) {
        let result = match task.action_type.as_str() {
            "webpage" => Self::execute_webpage(&task.action_value),
            "reminder" => Self::execute_reminder(task, app_handle),
            "shutdown" => Self::execute_shutdown(),
            "restart" => Self::execute_restart(),
            "hibernate" => Self::execute_hibernate(),
            "lock" => Self::execute_lock(),
            "open_folder" => Self::execute_open_folder(&task.action_value),
            "open_file" => Self::execute_open_file(&task.action_value),
            "run_command" => Self::execute_run_command(&task.action_value),
            "run_script" => Self::execute_run_script(&task.action_value),
            "monitor_off" => Self::execute_monitor_off(),
            "empty_recycle" => Self::execute_empty_recycle(),
            "logoff" => Self::execute_logoff(),
            "close_program" => Self::execute_close_program(&task.action_value),
            "send_udp" => Self::execute_send_udp(&task.action_value),
            "auto_screenshot" => Self::execute_auto_screenshot(&task.action_value),
            _ => { error!("未知的动作类型: {}", task.action_type); Err("未知的动作类型".into()) }
        };

        let (status, message) = match result {
            Ok(_) => ("success", "执行成功".to_string()),
            Err(e) => ("failed", format!("执行失败: {}", e)),
        };

        if let Ok(db_guard) = db.lock() {
            let _ = Self::log_execution(&db_guard, task, status, &message);
        }
    }

    // ─── Action Handlers ─────────────────────────────────

    fn execute_webpage(url: &str) -> Result<(), String> {
        if url.is_empty() { return Err("URL为空".into()); }
        open::that(url).map_err(|e| format!("打开网页失败: {}", e))
    }

    fn execute_reminder(task: &Task, app_handle: &Option<tauri::AppHandle>) -> Result<(), String> {
        if let Some(handle) = app_handle {
            let payload = json!({
                "title": "EasyTimer 提醒",
                "body": task.action_value,
                "task_id": task.id
            });
            if Self::should_play_sound(handle) { Self::play_sound(); }
            if let Some(notif_window) = handle.get_webview_window("notification") {
                let direction = Self::get_notification_direction(handle);
                let _ = notif_window.emit("set-direction", &direction);
                let _ = Self::position_notification_window(&notif_window, &direction);
                let _ = notif_window.show();
                let _ = notif_window.set_focus();
                let _ = notif_window.emit("show-notification", payload);
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

    fn should_play_sound(handle: &tauri::AppHandle) -> bool {
        let state = handle.state::<Arc<Mutex<Database>>>();
        if let Ok(db) = state.lock() {
            if let Ok(Some(val)) = TaskService::get_setting(&db, "notification_sound") {
                return val == "true";
            }
        }
        false
    }

    fn play_sound() {
        #[cfg(target_os = "windows")]
        {
            extern "system" { fn MessageBeep(uType: u32) -> i32; }
            const MB_ICONEXCLAMATION: u32 = 0x00000030;
            unsafe { MessageBeep(MB_ICONEXCLAMATION); }
        }
    }

    fn get_notification_direction(handle: &tauri::AppHandle) -> String {
        let state = handle.state::<Arc<Mutex<Database>>>();
        if let Ok(db) = state.lock() {
            if let Ok(Some(dir)) = TaskService::get_setting(&db, "notification_direction") {
                return dir;
            }
        }
        "right".to_string()
    }

    fn position_notification_window(window: &tauri::WebviewWindow, direction: &str) -> Result<(), String> {
        if let Some(monitor) = window.current_monitor().ok().flatten() {
            let scale = monitor.scale_factor();
            let physical_size = monitor.size();
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
            window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
                .map_err(|e| format!("设置窗口位置失败: {}", e))?;
        }
        Ok(())
    }

    fn execute_shutdown() -> Result<(), String> {
        std::process::Command::new("shutdown").args(["/s", "/t", "0"])
            .spawn().map_err(|e| format!("关机失败: {}", e))?;
        Ok(())
    }

    fn execute_restart() -> Result<(), String> {
        std::process::Command::new("shutdown").args(["/r", "/t", "0"])
            .spawn().map_err(|e| format!("重启失败: {}", e))?;
        Ok(())
    }

    fn execute_hibernate() -> Result<(), String> {
        std::process::Command::new("rundll32.exe").args(["powrprof.dll,SetSuspendState", "0", "1", "0"])
            .spawn().map_err(|e| format!("休眠失败: {}", e))?;
        Ok(())
    }

    fn execute_lock() -> Result<(), String> {
        std::process::Command::new("rundll32.exe").args(["user32.dll,LockWorkStation"])
            .spawn().map_err(|e| format!("锁屏失败: {}", e))?;
        Ok(())
    }

    fn execute_open_folder(path: &str) -> Result<(), String> {
        if path.is_empty() { return Err("路径为空".into()); }
        open::that(path).map_err(|e| format!("打开文件夹失败: {}", e))
    }

    fn execute_open_file(path: &str) -> Result<(), String> {
        if path.is_empty() { return Err("路径为空".into()); }
        open::that(path).map_err(|e| format!("打开文件失败: {}", e))
    }

    fn execute_run_command(cmd: &str) -> Result<(), String> {
        if cmd.is_empty() { return Err("命令为空".into()); }
        std::process::Command::new("cmd").args(["/c", cmd])
            .spawn().map_err(|e| format!("执行命令失败: {}", e))?;
        Ok(())
    }

    fn execute_run_script(path: &str) -> Result<(), String> {
        if path.is_empty() { return Err("脚本路径为空".into()); }
        std::process::Command::new("cmd").args(["/c", path])
            .spawn().map_err(|e| format!("执行脚本失败: {}", e))?;
        Ok(())
    }

    fn execute_monitor_off() -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            extern "system" { fn SendMessageA(hwnd: isize, msg: u32, wparam: usize, lparam: isize) -> isize; }
            const HWND_BROADCAST: isize = 0xFFFF;
            const WM_SYSCOMMAND: u32 = 0x0112;
            const SC_MONITORPOWER: usize = 0xF170;
            unsafe { SendMessageA(HWND_BROADCAST, WM_SYSCOMMAND, SC_MONITORPOWER, 2); }
            return Ok(());
        }
        #[allow(unreachable_code)]
        Err("当前系统不支持关闭显示器".into())
    }

    fn execute_empty_recycle() -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            extern "system" { fn SHEmptyRecycleBinW(hwnd: isize, pszrootpath: *const u16, dwflags: u32) -> i32; }
            let ret = unsafe { SHEmptyRecycleBinW(0, std::ptr::null(), 0x0007) };
            if ret == 0 { return Ok(()); }
            return Err(format!("清空回收站失败, 错误码: {}", ret));
        }
        #[allow(unreachable_code)]
        Err("当前系统不支持清空回收站".into())
    }

    fn execute_logoff() -> Result<(), String> {
        std::process::Command::new("shutdown").args(["/l"])
            .spawn().map_err(|e| format!("注销失败: {}", e))?;
        Ok(())
    }

    fn execute_close_program(name: &str) -> Result<(), String> {
        if name.is_empty() { return Err("进程名为空".into()); }
        std::process::Command::new("taskkill").args(["/IM", name, "/F"])
            .spawn().map_err(|e| format!("关闭程序失败: {}", e))?;
        Ok(())
    }

    fn execute_send_udp(value: &str) -> Result<(), String> {
        let parts: Vec<&str> = value.splitn(3, '$').collect();
        if parts.len() < 3 { return Err("格式错误，应为: host$port$message".into()); }
        let host = parts[0];
        let port: u16 = parts[1].parse().map_err(|_| "端口号无效".to_string())?;
        let message = parts[2];
        let addr = format!("{}:{}", host, port);
        let socket = std::net::UdpSocket::bind("0.0.0.0:0")
            .map_err(|e| format!("创建UDP socket失败: {}", e))?;
        socket.send_to(message.as_bytes(), &addr)
            .map_err(|e| format!("发送UDP消息失败: {}", e))?;
        Ok(())
    }

    fn execute_auto_screenshot(save_path: &str) -> Result<(), String> {
        let path = if save_path.is_empty() {
            let home = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".into());
            format!("{}\\Pictures\\screenshot_{}.png", home, chrono::Local::now().format("%Y%m%d_%H%M%S"))
        } else {
            let filename = format!("screenshot_{}.png", chrono::Local::now().format("%Y%m%d_%H%M%S"));
            let dir = std::path::Path::new(save_path);
            if !dir.exists() { std::fs::create_dir_all(dir).map_err(|e| format!("创建目录失败: {}", e))?; }
            format!("{}\\{}", save_path, filename)
        };
        let screenshot = screenshots::Screen::all()
            .map_err(|e| format!("获取屏幕信息失败: {}", e))?
            .into_iter().next().ok_or("未找到显示器")?;
        let buffer = screenshot.capture().map_err(|e| format!("截屏失败: {}", e))?;
        buffer.save(&path).map_err(|e| format!("保存截图失败: {}", e))?;
        info!("截屏已保存: {}", path);
        Ok(())
    }

    fn log_execution(db: &Database, task: &Task, status: &str, message: &str) -> Result<(), rusqlite::Error> {
        db.conn().execute(
            "INSERT INTO logs (task_id, task_name, action, status, message) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![task.id, task.name, task.action_type, status, message],
        )?;
        Ok(())
    }
}
