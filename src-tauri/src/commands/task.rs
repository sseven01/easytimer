use tauri::State;

use crate::db::models::Task;
use crate::error::AppError;
use crate::services::task_service::TaskService;
use crate::AppState;

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
) -> Result<i64, AppError> {
    let db = lock_db(&state)?;
    let task = Task {
        id: None,
        name,
        action_type,
        action_value,
        enabled: true,
        created_at: None,
        updated_at: None,
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
    enabled: bool,
) -> Result<(), AppError> {
    let db = lock_db(&state)?;
    let task = Task {
        id: Some(id),
        name,
        action_type,
        action_value,
        enabled,
        created_at: None,
        updated_at: None,
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

// ─── Trigger Commands ─────────────────────────────────────

#[tauri::command]
pub fn get_triggers(state: State<'_, AppState>, task_id: i64) -> Result<Vec<crate::db::models::Trigger>, AppError> {
    let db = lock_db(&state)?;
    TaskService::get_triggers(&db, task_id)
}

#[tauri::command]
pub fn add_trigger(state: State<'_, AppState>, task_id: i64, cron_expression: String) -> Result<i64, AppError> {
    let db = lock_db(&state)?;
    TaskService::add_trigger(&db, task_id, &cron_expression)
}

#[tauri::command]
pub fn update_trigger(state: State<'_, AppState>, id: i64, cron_expression: String, enabled: bool) -> Result<(), AppError> {
    let db = lock_db(&state)?;
    TaskService::update_trigger(&db, id, &cron_expression, enabled)
}

#[tauri::command]
pub fn delete_trigger(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    let db = lock_db(&state)?;
    TaskService::delete_trigger(&db, id)
}

#[tauri::command]
pub fn toggle_trigger(state: State<'_, AppState>, id: i64, enabled: bool) -> Result<(), AppError> {
    let db = lock_db(&state)?;
    TaskService::toggle_trigger(&db, id, enabled)
}

#[tauri::command]
pub fn validate_cron(expression: String) -> Result<bool, AppError> {
    crate::db::models::CronExpr::parse(&expression)
        .map(|_| true)
        .map_err(|e| AppError::Custom(e))
}

#[tauri::command]
pub fn preview_cron(expression: String, count: Option<i32>) -> Result<Vec<String>, AppError> {
    let cron = crate::db::models::CronExpr::parse(&expression)
        .map_err(|e| AppError::Custom(e))?;
    let n = count.unwrap_or(5).min(20) as usize;
    let mut results = Vec::new();
    let mut after = chrono::Local::now();
    for _ in 0..n {
        if let Some(next) = cron.next_after(after) {
            results.push(next.format("%Y-%m-%d %H:%M:%S").to_string());
            after = next;
        } else {
            break;
        }
    }
    Ok(results)
}
