use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use tower::ServiceExt;

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();

    // Run schema creation
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS accounts (
            account_id TEXT PRIMARY KEY,
            customer_name TEXT,
            account_type TEXT DEFAULT 'Savings',
            created_at TEXT,
            initial_balance REAL DEFAULT 10000.0,
            current_balance REAL DEFAULT 10000.0,
            status TEXT DEFAULT 'Active',
            risk_score REAL DEFAULT 0.0,
            risk_level TEXT DEFAULT 'Low',
            prediction_confidence REAL DEFAULT 1.0,
            is_ground_truth_mule INTEGER DEFAULT 0,
            total_incoming REAL DEFAULT 0.0,
            total_outgoing REAL DEFAULT 0.0,
            in_degree INTEGER DEFAULT 0,
            out_degree INTEGER DEFAULT 0,
            unique_counterparties INTEGER DEFAULT 0,
            avg_txn_interval_hours REAL DEFAULT 24.0,
            turnover_ratio REAL DEFAULT 0.0,
            flags_json TEXT DEFAULT '[]',
            embedding_json TEXT DEFAULT '[]',
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id TEXT PRIMARY KEY,
            sender_account TEXT NOT NULL,
            receiver_account TEXT NOT NULL,
            amount REAL NOT NULL,
            timestamp TEXT NOT NULL,
            status TEXT DEFAULT 'Completed',
            transaction_type TEXT DEFAULT 'IMPS',
            description TEXT,
            is_suspicious INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS complaints (
            complaint_id TEXT PRIMARY KEY,
            date_reported TEXT,
            complainant_name TEXT,
            description TEXT,
            reported_account_id TEXT,
            transaction_id TEXT,
            amount_lost REAL NOT NULL,
            status TEXT DEFAULT 'New',
            source TEXT DEFAULT 'National Cyber Crime Portal',
            created_at TEXT,
            category TEXT DEFAULT 'Cyber Fraud',
            assigned_to TEXT DEFAULT 'Unassigned',
            linked_case_id TEXT,
            correlation_data_json TEXT DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS cases (
            case_id TEXT PRIMARY KEY,
            case_number TEXT,
            title TEXT NOT NULL,
            priority TEXT DEFAULT 'High',
            assigned_investigator TEXT DEFAULT 'Lead Financial Crime Specialist',
            status TEXT DEFAULT 'New',
            primary_account_id TEXT,
            created_at TEXT,
            updated_at TEXT,
            created_by TEXT DEFAULT 'INV-7809-DELHI',
            source_type TEXT DEFAULT 'Manual',
            source_reference_id TEXT,
            summary TEXT,
            findings TEXT,
            closure_reason TEXT,
            version INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS case_evidence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            evidence_type TEXT NOT NULL,
            reference_id TEXT NOT NULL,
            description TEXT NOT NULL,
            metadata_json TEXT DEFAULT '{}',
            status TEXT DEFAULT 'Active',
            attached_by TEXT DEFAULT 'Investigator',
            integrity_hash TEXT,
            file_path TEXT,
            file_name TEXT,
            file_size INTEGER DEFAULT 0,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS case_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            role TEXT DEFAULT 'Suspect Account',
            notes TEXT,
            linked_at TEXT NOT NULL,
            linked_by TEXT DEFAULT 'Investigator',
            UNIQUE(case_id, account_id)
        );

        CREATE TABLE IF NOT EXISTS case_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            transaction_id TEXT NOT NULL,
            relevance TEXT DEFAULT 'Flagged Layering Transfer',
            notes TEXT,
            linked_at TEXT NOT NULL,
            linked_by TEXT DEFAULT 'Investigator',
            UNIQUE(case_id, transaction_id)
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

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            badge_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Investigator',
            created_at TEXT NOT NULL
        );
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Insert test seed accounts and transactions
    sqlx::query(
        "INSERT INTO accounts (account_id, customer_name, risk_level, risk_score, current_balance) VALUES ('ACC_MULE_TEST', 'Suspect Entity Test', 'High', 0.89, 50000.0)"
    ).execute(&pool).await.unwrap();

    sqlx::query(
        "INSERT INTO accounts (account_id, customer_name, risk_level, risk_score, current_balance) VALUES ('ACC_VICTIM_TEST', 'Victim Entity Test', 'Low', 0.05, 12000.0)"
    ).execute(&pool).await.unwrap();

    sqlx::query(
        "INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, is_suspicious) VALUES ('TXN_TEST_101', 'ACC_VICTIM_TEST', 'ACC_MULE_TEST', 45000.0, '2026-10-21T09:00:00Z', 1)"
    ).execute(&pool).await.unwrap();

    sqlx::query(
        "INSERT INTO users (id, badge_id, name, email, password_hash, role, created_at) VALUES ('usr-1', 'INV-7809-DELHI', 'Special Investigator Rajesh Verma', 'r.verma@fiu-ind.gov.in', 'hash', 'Investigator', datetime('now'))"
    ).execute(&pool).await.unwrap();

    pool
}

#[tokio::test]
async fn test_case_creation_and_unique_case_number() {
    let pool = setup_test_db().await;
    let app = fintrace_backend::cases::router(pool.clone());

    let payload = json!({
        "title": "Mule Ring Conduit Infiltration",
        "priority": "Critical",
        "assigned_investigator": "Special Investigator Rajesh Verma",
        "primary_account_id": "ACC_MULE_TEST",
        "summary": "Rapid transfer of 45,000 INR from victim account to suspect conduit.",
        "source_type": "GNN Alert",
        "source_reference_id": "ALERT-GNN-8812",
        "initial_evidence": [
            {
                "evidence_type": "ACCOUNT",
                "reference_id": "ACC_MULE_TEST",
                "description": "Primary suspect conduit account"
            }
        ]
    });

    let req = Request::builder()
        .method("POST")
        .uri("/")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let created: Value = serde_json::from_slice(&bytes).unwrap();

    assert!(created["case_id"].as_str().unwrap().starts_with("CASE-"));
    assert_eq!(created["title"], "Mule Ring Conduit Infiltration");
    assert_eq!(created["priority"], "Critical");
    assert_eq!(created["primary_account_id"], "ACC_MULE_TEST");
    assert_eq!(created["version"], 1);

    let case_id = created["case_id"].as_str().unwrap();

    // Verify case was stored in database
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM cases WHERE case_id = $1")
        .bind(case_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);

    // Verify audit log exists
    let audit_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM audit_logs WHERE target_id = $1 AND action = 'CASE_CREATED'")
        .bind(case_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(audit_count, 1);

    // Verify initial evidence was recorded with SHA-256 hash
    let ev_hash: Option<String> = sqlx::query_scalar("SELECT integrity_hash FROM case_evidence WHERE case_id = $1 AND reference_id = 'ACC_MULE_TEST'")
        .bind(case_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(ev_hash.is_some());
    assert_eq!(ev_hash.unwrap().len(), 64);
}

#[tokio::test]
async fn test_case_validation_rejects_nonexistent_account() {
    let pool = setup_test_db().await;
    let app = fintrace_backend::cases::router(pool.clone());

    let payload = json!({
        "title": "Invalid Case with Fake Account",
        "primary_account_id": "NON_EXISTENT_ACC_9999"
    });

    let req = Request::builder()
        .method("POST")
        .uri("/")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_case_findings_and_concurrency_versioning() {
    let pool = setup_test_db().await;
    let app = fintrace_backend::cases::router(pool.clone());

    // Create case
    let create_payload = json!({
        "title": "Concurrency Test Case",
        "priority": "High"
    });
    let req = Request::builder()
        .method("POST")
        .uri("/")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&create_payload).unwrap()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let created: Value = serde_json::from_slice(&bytes).unwrap();
    let case_id = created["case_id"].as_str().unwrap();

    // Update findings with expected version 1
    let update_payload = json!({
        "summary": "Updated allegation summary.",
        "findings": "Verified rapid fund pass-through across accounts.",
        "version": 1
    });
    let req2 = Request::builder()
        .method("POST")
        .uri(format!("/{}/findings", case_id))
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&update_payload).unwrap()))
        .unwrap();
    let res2 = app.clone().oneshot(req2).await.unwrap();
    assert_eq!(res2.status(), StatusCode::OK);
    let bytes2 = to_bytes(res2.into_body(), usize::MAX).await.unwrap();
    let updated: Value = serde_json::from_slice(&bytes2).unwrap();
    assert_eq!(updated["version"], 2);

    // Stale update: attempting to update with version 1 again must be rejected (version mismatch)
    let stale_payload = json!({
        "title": "Stale Title Overwrite",
        "version": 1
    });
    let req3 = Request::builder()
        .method("PUT")
        .uri(format!("/{}", case_id))
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&stale_payload).unwrap()))
        .unwrap();
    let res3 = app.clone().oneshot(req3).await.unwrap();
    assert_eq!(res3.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_evidence_attachment_and_soft_removal() {
    let pool = setup_test_db().await;
    let app = fintrace_backend::cases::router(pool.clone());

    // Create case
    let create_payload = json!({
        "title": "Evidence Lifecycle Test",
        "priority": "High"
    });
    let req = Request::builder()
        .method("POST")
        .uri("/")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&create_payload).unwrap()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let created: Value = serde_json::from_slice(&bytes).unwrap();
    let case_id = created["case_id"].as_str().unwrap();

    // Attach valid transaction evidence
    let ev_payload = json!({
        "evidence_type": "TRANSACTION",
        "reference_id": "TXN_TEST_101",
        "description": "Crucial illicit transfer of funds"
    });
    let req_ev = Request::builder()
        .method("POST")
        .uri(format!("/{}/evidence", case_id))
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&ev_payload).unwrap()))
        .unwrap();
    let res_ev = app.clone().oneshot(req_ev).await.unwrap();
    assert_eq!(res_ev.status(), StatusCode::OK);
    let bytes_ev = to_bytes(res_ev.into_body(), usize::MAX).await.unwrap();
    let attached: Value = serde_json::from_slice(&bytes_ev).unwrap();
    let evidence_id = attached["id"].as_i64().unwrap();

    // Verify evidence exists in active evidence list
    let req_list = Request::builder()
        .method("GET")
        .uri(format!("/{}/evidence", case_id))
        .body(Body::empty())
        .unwrap();
    let res_list = app.clone().oneshot(req_list).await.unwrap();
    let bytes_list = to_bytes(res_list.into_body(), usize::MAX).await.unwrap();
    let list_json: Value = serde_json::from_slice(&bytes_list).unwrap();
    assert_eq!(list_json["count"], 1);

    // Remove evidence (soft-delete)
    let req_del = Request::builder()
        .method("DELETE")
        .uri(format!("/{}/evidence/{}", case_id, evidence_id))
        .body(Body::empty())
        .unwrap();
    let res_del = app.clone().oneshot(req_del).await.unwrap();
    assert_eq!(res_del.status(), StatusCode::OK);

    // Verify evidence is removed from active list
    let req_list2 = Request::builder()
        .method("GET")
        .uri(format!("/{}/evidence", case_id))
        .body(Body::empty())
        .unwrap();
    let res_list2 = app.clone().oneshot(req_list2).await.unwrap();
    let bytes_list2 = to_bytes(res_list2.into_body(), usize::MAX).await.unwrap();
    let list_json2: Value = serde_json::from_slice(&bytes_list2).unwrap();
    assert_eq!(list_json2["count"], 0);

    // Verify record still exists in database with status = 'Removed' (Audit preserved)
    let raw_status: String = sqlx::query_scalar("SELECT status FROM case_evidence WHERE id = $1")
        .bind(evidence_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(raw_status, "Removed");
}

#[tokio::test]
async fn test_export_dossier_json() {
    let pool = setup_test_db().await;
    let app = fintrace_backend::cases::router(pool.clone());

    // Create case with primary account
    let create_payload = json!({
        "title": "Syndicate Prosecution Dossier Test",
        "primary_account_id": "ACC_MULE_TEST",
        "summary": "Complete dossier summary",
        "findings": "Detailed multi-hop flow findings"
    });
    let req = Request::builder()
        .method("POST")
        .uri("/")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&create_payload).unwrap()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let created: Value = serde_json::from_slice(&bytes).unwrap();
    let case_id = created["case_id"].as_str().unwrap();

    // Request full judicial dossier export
    let req_dos = Request::builder()
        .method("GET")
        .uri(format!("/{}/dossier", case_id))
        .body(Body::empty())
        .unwrap();
    let res_dos = app.clone().oneshot(req_dos).await.unwrap();
    assert_eq!(res_dos.status(), StatusCode::OK);

    let bytes_dos = to_bytes(res_dos.into_body(), usize::MAX).await.unwrap();
    let dossier: Value = serde_json::from_slice(&bytes_dos).unwrap();

    assert_eq!(dossier["case_id"], case_id);
    assert_eq!(dossier["title"], "Syndicate Prosecution Dossier Test");
    assert!(dossier["integrity_seal"].as_str().unwrap().starts_with("SHA256:"));
    assert!(dossier["legal_attestation"].as_str().unwrap().contains("OFFICIAL LAW ENFORCEMENT & FIU DOSSIER"));
    assert_eq!(dossier["primary_account"]["account_id"], "ACC_MULE_TEST");
    assert!(dossier["audit_history"].as_array().unwrap().len() >= 1);
}
