pub mod migrations;
pub mod models;

use std::path::Path;

use rusqlite::Connection;

/// Thin wrapper around a rusqlite [`Connection`].
pub struct Database {
    conn: Connection,
}

impl Database {
    /// Open (or create) a SQLite database at `path` with WAL mode enabled.
    pub fn new(path: &Path) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        Ok(Self { conn })
    }

    /// Run all pending schema migrations.
    pub fn init_tables(&self) -> rusqlite::Result<()> {
        self.conn.execute_batch(migrations::CREATE_TASKS_TABLE)?;
        self.conn.execute_batch(migrations::CREATE_LOGS_TABLE)?;
        Ok(())
    }

    /// Borrow the underlying connection.
    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    /// Close the connection explicitly (optional – also closed on drop).
    pub fn close(self) -> Result<(), rusqlite::Error> {
        self.conn.close().map_err(|(_, e)| e)
    }
}
