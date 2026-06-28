mod commands;
mod config;
mod db;
mod error;
mod services;
mod tray;
mod updater;

use std::sync::{Arc, Mutex};

use config::AppConfig;
use db::Database;
use log::info;
use tauri::Manager;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn hide_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
pub fn run() {
    let config = AppConfig::default();
    std::fs::create_dir_all(&config.data_dir).expect("Failed to create data directory");

    let database = Database::new(&config.db_path).expect("Failed to open database");
    database
        .init_tables()
        .expect("Failed to initialise database tables");

    info!(
        "EasyTimer started – database at: {}",
        config.db_path.display()
    );

    let db_arc = Arc::new(Mutex::new(database));
    let state = AppState { db: db_arc.clone() };

    let mut scheduler = services::scheduler::Scheduler::new(db_arc.clone());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(state)
        .manage(db_arc.clone())
        .invoke_handler(tauri::generate_handler![
            commands::task::get_tasks,
            commands::task::get_task,
            commands::task::create_task,
            commands::task::update_task,
            commands::task::delete_task,
            commands::task::toggle_task,
            commands::task::get_logs,
            commands::task::clear_logs,
            commands::task::get_setting,
            commands::task::set_setting,
            commands::task::toggle_autostart,
            commands::task::get_triggers,
            commands::task::add_trigger,
            commands::task::update_trigger,
            commands::task::delete_trigger,
            commands::task::toggle_trigger,
            commands::task::validate_cron,
            commands::task::preview_cron,
            quit,
            show_main_window,
            hide_main_window,
            updater::check_update,
        ])
        .setup(move |app| {
            tray::setup_tray(app.handle())?;

            // 创建通知窗口（无边框、置顶、深色背景）
            match tauri::WebviewWindowBuilder::new(
                app,
                "notification",
                tauri::WebviewUrl::App("notification.html".into()),
            )
            .title("EasyTimer Notification")
            .inner_size(400.0, 200.0)
            .resizable(false)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .visible(false)
            .build()
            {
                Ok(_) => info!("通知窗口创建成功"),
                Err(e) => log::error!("创建通知窗口失败: {}", e),
            }

            scheduler.set_app_handle(app.handle().clone());
            scheduler.start();

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let db = window.state::<Arc<Mutex<Database>>>();
                let should_minimize = {
                    let db = db.lock().unwrap_or_else(|e| e.into_inner());
                    services::task_service::TaskService::get_setting(&db, "minimize_to_tray")
                        .ok()
                        .flatten()
                        .map(|v| v == "true")
                        .unwrap_or(false)
                };
                if should_minimize {
                    api.prevent_close();
                    let _ = window.hide();
                } else {
                    window.app_handle().exit(0);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
