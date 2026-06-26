mod commands;
mod config;
mod db;
mod error;
mod services;

use std::sync::{Arc, Mutex};

use config::AppConfig;
use db::Database;
use log::info;

/// Shared application state accessible from all Tauri commands.
pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}

#[cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
pub fn run() {
    // Load config & ensure data directory exists.
    let config = AppConfig::default();
    std::fs::create_dir_all(&config.data_dir).expect("Failed to create data directory");

    // Open (or create) the database and run migrations.
    let database =
        Database::new(&config.db_path).expect("Failed to open database");
    database
        .init_tables()
        .expect("Failed to initialise database tables");

    info!(
        "EasyTimer started – database at: {}",
        config.db_path.display()
    );

    let state = AppState {
        db: Arc::new(Mutex::new(database)),
    };

    tauri::Builder::default()
        // --- plugins -------------------------------------------------------
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        // --- state ---------------------------------------------------------
        .manage(state)
        // --- commands ------------------------------------------------------
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
