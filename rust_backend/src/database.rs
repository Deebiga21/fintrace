use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;
use tracing::info;

pub type DbPool = SqlitePool;

pub async fn init_db(database_url: &str) -> Result<DbPool, sqlx::Error> {
    info!("Connecting to SQLite database: {}", database_url);

    let connection_options = SqliteConnectOptions::from_str(database_url)?.create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(20)
        .connect_with(connection_options)
        .await?;

    // Create tables if not existing
    create_tables(&pool).await?;
    // Drop legacy password hashes from databases created by earlier versions.
    let _ = sqlx::query("ALTER TABLE users DROP COLUMN password_hash")
        .execute(&pool)
        .await;

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

        CREATE TABLE IF NOT EXISTS datasets (
            dataset_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            filename TEXT NOT NULL,
            total_rows INTEGER DEFAULT 0,
            valid_rows INTEGER DEFAULT 0,
            invalid_rows INTEGER DEFAULT 0,
            readiness_score REAL DEFAULT 10.0,
            status TEXT DEFAULT 'COMPLETED',
            fingerprint TEXT,
            metadata_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jobs (
            job_id TEXT PRIMARY KEY,
            job_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'COMPLETED',
            progress REAL DEFAULT 100.0,
            result_json TEXT DEFAULT '{}',
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS money_trails (
            trail_id TEXT PRIMARY KEY,
            target_account TEXT NOT NULL,
            inbound_hops_json TEXT DEFAULT '[]',
            outbound_hops_json TEXT DEFAULT '[]',
            total_inbound REAL DEFAULT 0.0,
            total_outbound REAL DEFAULT 0.0,
            summary TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ingestion_jobs (
            job_id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            file_path TEXT,
            file_size INTEGER DEFAULT 0,
            stage TEXT NOT NULL DEFAULT 'UPLOADED',
            detected_columns_json TEXT DEFAULT '[]',
            column_mapping_json TEXT DEFAULT '{}',
            total_rows INTEGER DEFAULT 0,
            valid_rows INTEGER DEFAULT 0,
            invalid_rows INTEGER DEFAULT 0,
            duplicate_rows INTEGER DEFAULT 0,
            readiness_score REAL DEFAULT 0.0,
            quality_report_json TEXT DEFAULT '{}',
            preview_json TEXT DEFAULT '[]',
            fraud_distribution_json TEXT DEFAULT '{}',
            quarantine_sample_json TEXT DEFAULT '[]',
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_acc_risk_score ON accounts(risk_score);
        CREATE INDEX IF NOT EXISTS idx_acc_risk_level ON accounts(risk_level);
        CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(job_type);

        "#,
    )
    .execute(pool)
    .await?;

    // Safe schema additions for complaints and money trails
    let _ = sqlx::query("ALTER TABLE complaints ADD COLUMN category TEXT DEFAULT 'Cyber Fraud'")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE complaints ADD COLUMN assigned_to TEXT DEFAULT 'Unassigned'")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE complaints ADD COLUMN linked_case_id TEXT")
        .execute(pool)
        .await;
    let _ =
        sqlx::query("ALTER TABLE complaints ADD COLUMN correlation_data_json TEXT DEFAULT '{}'")
            .execute(pool)
            .await;

    let _ = sqlx::query("ALTER TABLE money_trails ADD COLUMN source_account TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE money_trails ADD COLUMN paths_json TEXT DEFAULT '[]'")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE money_trails ADD COLUMN patterns_json TEXT DEFAULT '[]'")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE money_trails ADD COLUMN report_json TEXT DEFAULT '{}'")
        .execute(pool)
        .await;

    let _ = sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS complaint_correlations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_id TEXT NOT NULL,
            matched_type TEXT NOT NULL,
            matched_id TEXT NOT NULL,
            confidence_score REAL DEFAULT 0.0,
            explanation TEXT NOT NULL,
            evidence_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id)
        );
        "#,
    )
    .execute(pool)
    .await;

    // Safe schema additions for Cases and Evidentiary Locker (Phase 2)
    let _ = sqlx::query("ALTER TABLE cases ADD COLUMN case_number TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE cases ADD COLUMN created_by TEXT DEFAULT 'INV-DEMO-LOCAL'")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE cases ADD COLUMN source_type TEXT DEFAULT 'Manual'")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE cases ADD COLUMN source_reference_id TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE cases ADD COLUMN closure_reason TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE cases ADD COLUMN version INTEGER DEFAULT 1")
        .execute(pool)
        .await;

    // Backfill case_number and version for existing cases
    let _ = sqlx::query(
        "UPDATE cases SET case_number = case_id WHERE case_number IS NULL OR case_number = ''",
    )
    .execute(pool)
    .await;
    let _ = sqlx::query("UPDATE cases SET version = 1 WHERE version IS NULL")
        .execute(pool)
        .await;
    let _ =
        sqlx::query("UPDATE cases SET created_by = assigned_investigator WHERE created_by IS NULL")
            .execute(pool)
            .await;
    let _ = sqlx::query("UPDATE cases SET source_type = 'Manual' WHERE source_type IS NULL")
        .execute(pool)
        .await;

    // Safe schema additions for Case Evidence
    let _ = sqlx::query("ALTER TABLE case_evidence ADD COLUMN status TEXT DEFAULT 'Active'")
        .execute(pool)
        .await;
    let _ =
        sqlx::query("ALTER TABLE case_evidence ADD COLUMN attached_by TEXT DEFAULT 'Investigator'")
            .execute(pool)
            .await;
    let _ = sqlx::query("ALTER TABLE case_evidence ADD COLUMN integrity_hash TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE case_evidence ADD COLUMN file_path TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE case_evidence ADD COLUMN file_name TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE case_evidence ADD COLUMN file_size INTEGER DEFAULT 0")
        .execute(pool)
        .await;
    let _ = sqlx::query(
        "UPDATE case_evidence SET status = 'Active' WHERE status IS NULL OR status = ''",
    )
    .execute(pool)
    .await;

    // Create case_accounts and case_transactions junction tables
    let _ = sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS case_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            role TEXT DEFAULT 'Suspect Account',
            notes TEXT,
            linked_at TEXT NOT NULL,
            linked_by TEXT DEFAULT 'Investigator',
            UNIQUE(case_id, account_id),
            FOREIGN KEY (case_id) REFERENCES cases(case_id)
        );

        CREATE TABLE IF NOT EXISTS case_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            transaction_id TEXT NOT NULL,
            relevance TEXT DEFAULT 'Flagged Layering Transfer',
            notes TEXT,
            linked_at TEXT NOT NULL,
            linked_by TEXT DEFAULT 'Investigator',
            UNIQUE(case_id, transaction_id),
            FOREIGN KEY (case_id) REFERENCES cases(case_id)
        );

        CREATE INDEX IF NOT EXISTS idx_case_accounts_case ON case_accounts(case_id);
        CREATE INDEX IF NOT EXISTS idx_case_transactions_case ON case_transactions(case_id);
        CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON case_evidence(case_id);
        "#,
    )
    .execute(pool)
    .await;

    Ok(())
}
