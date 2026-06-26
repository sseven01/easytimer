use serde::Serialize;
use thiserror::Error;

/// Unified error type used across the application.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Custom(String),

    #[error("Not found: {0}")]
    NotFound(String),
}

// Tauri commands must return types that implement Serialize.
// We serialise AppError as its Display string.
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
