use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// Application-wide configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub app_name: String,
    pub version: String,
    pub data_dir: PathBuf,
    pub db_path: PathBuf,
}

impl Default for AppConfig {
    fn default() -> Self {
        let home = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."));

        let data_dir = home.join(".easytimer");
        let db_path = data_dir.join("easytimer.db");

        Self {
            app_name: "EasyTimer".to_string(),
            version: "0.1.0".to_string(),
            data_dir,
            db_path,
        }
    }
}
