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
    TaskService::toggle_task(&db, id, enabled)
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
