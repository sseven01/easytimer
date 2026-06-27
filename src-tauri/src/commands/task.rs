use serde_json::Value as JsonValue;
use tauri::State;

use crate::db::models::Task;
use crate::error::AppError;
use crate::services::task_service::TaskService;
use crate::AppState;

/// Helper: lock the database Mutex.
fn lock_db(state: &AppState) -> Result<std::sync::MutexGuard<'_, crate::db::Database>, AppError> {
    state
        .db
        .lock()
        .map_err(|_| AppError::Custom("Failed to lock database".into()))
}

#[tauri::command]
pub fn get_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, AppError> {
    let db = lock_db(&state)?;
    TaskService::get_all_tasks(&db)
}

#[tauri::command]
pub fn get_task(state: State<'_, AppState>, id: i64) -> Result<Task, AppError> {
    let db = lock_db(&state)?;
    TaskService::get_task(&db, id)
}

#[tauri::command]
pub fn create_task(
    state: State<'_, AppState>,
    name: String,
    action_type: String,
    action_value: String,
    schedule_type: String,
    schedule_conf: JsonValue,
) -> Result<i64, AppError> {
    let db = lock_db(&state)?;
    let task = Task {
        id: None,
        name,
        action_type,
        action_value,
        schedule_type,
        schedule_conf,
        enabled: true,
        created_at: None,
        updated_at: None,
        next_run_at: None,
    };
    TaskService::add_task(&db, &task)
}

#[tauri::command]
pub fn update_task(
    state: State<'_, AppState>,
    id: i64,
    name: String,
    action_type: String,
    action_value: String,
    schedule_type: String,
    schedule_conf: JsonValue,
    enabled: bool,
) -> Result<(), AppError> {
    let db = lock_db(&state)?;
    let task = Task {
        id: Some(id),
        name,
        action_type,
        action_value,
        schedule_type,
        schedule_conf,
        enabled,
        created_at: None,
        updated_at: None,
        next_run_at: None,
    };
    TaskService::update_task(&db, &task)
}

#[tauri::command]
pub fn delete_task(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    let db = lock_db(&state)?;
    TaskService::delete_task(&db, id)
}

#[tauri::command]
pub fn toggle_task(state: State<'_, AppState>, id: i64, enabled: bool) -> Result<(), AppError> {
    let db = lock_db(&state)?;
    
    // 切换启用状态
    TaskService::toggle_task(&db, id, enabled)?;
    
    // 如果启用任务，重新计算 next_run_at
    if enabled {
        let task = TaskService::get_task(&db, id)?;
        let next_run = task.calc_next_run();
        db.conn().execute(
            "UPDATE tasks SET next_run_at = ?1 WHERE id = ?2",
            rusqlite::params![next_run, id],
        )?;
        log::info!(
            "任务 {} (ID: {}) 已启用，下次执行时间: {:?}",
            task.name, id, next_run
        );
    } else {
        // 禁用任务时清除 next_run_at
        db.conn().execute(
            "UPDATE tasks SET next_run_at = NULL WHERE id = ?1",
            rusqlite::params![id],
        )?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn get_logs(state: State<'_, AppState>, limit: Option<i64>) -> Result<Vec<crate::db::models::LogEntry>, AppError> {
    let db = lock_db(&state)?;
    TaskService::get_logs(&db, limit.unwrap_or(200))
}

#[tauri::command]
pub fn clear_logs(state: State<'_, AppState>) -> Result<(), AppError> {
    let db = lock_db(&state)?;
    TaskService::clear_logs(&db)
}

#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, AppError> {
    let db = lock_db(&state)?;
    TaskService::get_setting(&db, &key)
}

#[tauri::command]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), AppError> {
    let db = lock_db(&state)?;
    TaskService::set_setting(&db, &key, &value)
}

#[tauri::command]
pub async fn toggle_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), AppError> {
    use tauri_plugin_autostart::ManagerExt;
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| AppError::Custom(format!("启用开机自启失败: {}", e)))?;
    } else {
        autostart.disable().map_err(|e| AppError::Custom(format!("禁用开机自启失败: {}", e)))?;
    }
    Ok(())
}
