use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;
use tracing::info;

pub type DbPool = SqlitePool;

pub async fn init_db(database_url: &str) -> Result<DbPool, sqlx::Error> {
    info!("Connecting to SQLite database: {}", database_url);

    let connection_options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(20)
        .connect_with(connection_options)
        .await?;

    // Create tables if not existing
    create_tables(&pool).await?;

    // Seed default investigator user if not existing
    seed_default_users(&pool).await?;

    Ok(pool)
}

async fn create_tables(pool: &DbPool) -> Result<(), sqlx::Error> {
    info!("Ensuring database tables exist...");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS accounts (
            account_id TEXT PRIMARY KEY,
            customer_name TEXT,
            account_type TEXT DEFAULT 'Savings',
            created_at TEXT,
            initial_balance REAL DEFAULT 1000.0,
            current_balance REAL DEFAULT 1000.0,
            status TEXT DEFAULT 'Active',
            risk_score REAL DEFAULT 0.0,
            risk_level TEXT DEFAULT 'Low',
            prediction_confidence REAL DEFAULT 0.0,
            is_ground_truth_mule INTEGER DEFAULT 0,
            total_incoming REAL DEFAULT 0.0,
            total_outgoing REAL DEFAULT 0.0,
            in_degree INTEGER DEFAULT 0,
            out_degree INTEGER DEFAULT 0,
            unique_counterparties INTEGER DEFAULT 0,
            avg_txn_interval_hours REAL DEFAULT 0.0,
            turnover_ratio REAL DEFAULT 0.0,
            flags_json TEXT DEFAULT '[]',
            embedding_json TEXT,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id TEXT PRIMARY KEY,
            sender_account TEXT NOT NULL,
            receiver_account TEXT NOT NULL,
            amount REAL NOT NULL,
            timestamp TEXT,
            status TEXT DEFAULT 'COMPLETED',
            transaction_type TEXT DEFAULT 'IMPS',
            description TEXT,
            is_suspicious INTEGER DEFAULT 0,
            flag_reason TEXT,
            FOREIGN KEY (sender_account) REFERENCES accounts (account_id),
            FOREIGN KEY (receiver_account) REFERENCES accounts (account_id)
        );

        CREATE INDEX IF NOT EXISTS idx_txn_sender ON transactions(sender_account);
        CREATE INDEX IF NOT EXISTS idx_txn_receiver ON transactions(receiver_account);
        CREATE INDEX IF NOT EXISTS idx_txn_timestamp ON transactions(timestamp);

        CREATE TABLE IF NOT EXISTS complaints (
            complaint_id TEXT PRIMARY KEY,
            date_reported TEXT,
            complainant_name TEXT NOT NULL,
            description TEXT NOT NULL,
            reported_account_id TEXT NOT NULL,
            transaction_id TEXT,
            amount_lost REAL NOT NULL,
            status TEXT DEFAULT 'New',
            source TEXT DEFAULT 'National Cyber Crime Portal',
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS cases (
            case_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            priority TEXT DEFAULT 'High',
            assigned_investigator TEXT DEFAULT 'Lead Financial Crime Specialist',
            status TEXT DEFAULT 'New',
            primary_account_id TEXT,
            created_at TEXT,
            updated_at TEXT,
            summary TEXT,
            findings TEXT
        );

        CREATE TABLE IF NOT EXISTS case_evidence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            evidence_type TEXT NOT NULL,
            reference_id TEXT NOT NULL,
            description TEXT NOT NULL,
            metadata_json TEXT DEFAULT '{}',
            created_at TEXT,
            FOREIGN KEY (case_id) REFERENCES cases(case_id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            user TEXT DEFAULT 'Investigator',
            action TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            details TEXT
        );

        CREATE TABLE IF NOT EXISTS model_runs (
            run_id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            model_name TEXT DEFAULT 'GraphSAGE (PyG SAGEConv)',
            architecture TEXT DEFAULT '2-layer GraphSAGE with Mean Aggregator',
            num_nodes INTEGER DEFAULT 0,
            num_edges INTEGER DEFAULT 0,
            epochs INTEGER DEFAULT 100,
            train_loss REAL,
            val_loss REAL,
            accuracy REAL,
            precision REAL,
            recall REAL,
            f1_score REAL,
            confusion_matrix_json TEXT,
            is_trained_on_ground_truth INTEGER DEFAULT 0,
            hyperparameters_json TEXT,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            badge_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Investigator',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS alerts (
            alert_id TEXT PRIMARY KEY,
            target_type TEXT NOT NULL,
            target_id TEXT NOT NULL,
            severity TEXT NOT NULL,
            reason_code TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'New',
            assigned_to TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'INFO',
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

async fn seed_default_users(pool: &DbPool) -> Result<(), sqlx::Error> {
    let exists: Option<String> = sqlx::query_scalar("SELECT badge_id FROM users WHERE badge_id = 'INV-7809-DELHI'")
        .fetch_optional(pool)
        .await?;

    if exists.is_none() {
        info!("Seeding default investigator: INV-7809-DELHI");
        // Hash for demo password using Argon2
        let salt = "fintrace_demo_salt_2026";
        let default_hash = crate::auth::hash_password("admin123", salt);

        sqlx::query(
            r#"
            INSERT INTO users (id, badge_id, name, email, password_hash, role, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, datetime('now'))
            "#,
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind("INV-7809-DELHI")
        .bind("Special Investigator Rajesh Verma")
        .bind("r.verma@fiu-ind.gov.in")
        .bind(default_hash)
        .bind("Investigator")
        .execute(pool)
        .await?;
    }

    Ok(())
}
