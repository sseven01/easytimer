#[tauri::command]
pub fn check_update() -> String {
    "no updates available".to_string()
}
