use tauri::State;

use crate::db::models::Task;
use crate::error::AppError;
use crate::services::task_service::TaskService;
use crate::AppState;

#[tauri::command]
pub fn get_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Custom("Failed to lock database".into()))?;
    TaskService::get_all_tasks(&db)
}

#[tauri::command]
pub fn create_task(state: State<'_, AppState>, task: Task) -> Result<i64, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Custom("Failed to lock database".into()))?;
    TaskService::add_task(&db, &task)
}

#[tauri::command]
pub fn update_task(state: State<'_, AppState>, task: Task) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Custom("Failed to lock database".into()))?;
    TaskService::update_task(&db, &task)
}

#[tauri::command]
pub fn delete_task(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Custom("Failed to lock database".into()))?;
    TaskService::delete_task(&db, id)
}

#[tauri::command]
pub fn toggle_task(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|_| AppError::Custom("Failed to lock database".into()))?;
    TaskService::toggle_task(&db, id)
}
