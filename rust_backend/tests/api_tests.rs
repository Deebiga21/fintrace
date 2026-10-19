use fintrace_backend::{
    auth::{create_jwt, hash_password, verify_password, verify_jwt},
    config::Config,
    database::init_db,
    models::{
        account::Account,
        case::{CaseEvidence, CreateCaseRequest, InvestigationCase},
        complaint::Complaint,
        transaction::Transaction,
        user::User,
    },
};

#[tokio::test]
async fn test_auth_argon2_and_jwt() {
    let secret = "test-secret-key-12345678901234567890";
    let password = "TestPassword@2026";
    let hash = hash_password(password, "salt");

    assert!(verify_password(password, &hash), "Argon2 password verification must succeed");
    assert!(!verify_password("WrongPassword", &hash), "Argon2 wrong password must fail");

    let user = User {
        id: "usr-test-01".to_string(),
        badge_id: "INV-TEST-01".to_string(),
        name: "Test Investigator".to_string(),
        email: Some("test@fiu-ind.gov.in".to_string()),
        password_hash: hash,
        role: "Investigator".to_string(),
        created_at: "2026-10-19T00:00:00Z".to_string(),
    };

    let token = create_jwt(&user, secret).expect("JWT encoding must succeed");
    assert!(!token.is_empty(), "Token must not be empty");

    let claims = verify_jwt(&token, secret).expect("JWT decoding must succeed");
    assert_eq!(claims.sub, "usr-test-01");
    assert_eq!(claims.badge_id, "INV-TEST-01");
    assert_eq!(claims.role, "Investigator");
}

#[tokio::test]
async fn test_database_and_transaction_flow() {
    // In-memory SQLite database for isolated testing
    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // 1. Verify default user seeded
    let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await
        .expect("Users query");
    assert!(user_count >= 1, "Default investigator must be seeded");

    // 2. Insert test accounts
    sqlx::query(
        "INSERT INTO accounts (account_id, customer_name, risk_score, risk_level, status) VALUES ('ACC_VICTIM_01', 'Victim Alice', 0.1, 'Low', 'Active')"
    )
    .execute(&pool)
    .await
    .expect("Insert account 1");

    sqlx::query(
        "INSERT INTO accounts (account_id, customer_name, risk_score, risk_level, status) VALUES ('ACC_MULE_01', 'Mule Bob', 0.88, 'High', 'Flagged')"
    )
    .execute(&pool)
    .await
    .expect("Insert account 2");

    // 3. Insert transaction
    sqlx::query(
        "INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, is_suspicious) VALUES ('TXN_001', 'ACC_VICTIM_01', 'ACC_MULE_01', 50000.0, '2026-10-19 10:00:00', 'COMPLETED', 'UPI', 1)"
    )
    .execute(&pool)
    .await
    .expect("Insert transaction");

    // 4. Test duplicate prevention (idempotent insert)
    let dup_res = sqlx::query(
        "INSERT OR IGNORE INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, is_suspicious) VALUES ('TXN_001', 'ACC_VICTIM_01', 'ACC_MULE_01', 50000.0, '2026-10-19 10:00:00', 'COMPLETED', 'UPI', 1)"
    )
    .execute(&pool)
    .await
    .expect("Duplicate insert");
    assert_eq!(dup_res.rows_affected(), 0, "Duplicate transaction must be ignored");

    // 5. Test Case Creation & Evidence Attachment
    sqlx::query(
        "INSERT INTO cases (case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary) VALUES ('CASE-TEST-01', 'Mule Ring Alpha', 'Critical', 'Special Investigator', 'Under_Investigation', 'ACC_MULE_01', datetime('now'), datetime('now'), 'Phishing funds diversion')"
    )
    .execute(&pool)
    .await
    .expect("Insert case");

    sqlx::query(
        "INSERT INTO case_evidence (case_id, evidence_type, reference_id, description, metadata_json, created_at) VALUES ('CASE-TEST-01', 'TRANSACTION', 'TXN_001', 'Initial victim diversion', '{}', datetime('now'))"
    )
    .execute(&pool)
    .await
    .expect("Insert case evidence");

    let ev_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM case_evidence WHERE case_id = 'CASE-TEST-01'")
        .fetch_one(&pool)
        .await
        .expect("Query evidence");
    assert_eq!(ev_count, 1, "Case must have 1 attached evidence item");

    // 6. Test Alert Creation & Status Transition
    sqlx::query(
        "INSERT INTO alerts (alert_id, target_type, target_id, severity, reason_code, status, assigned_to, notes, created_at, updated_at) VALUES ('ALT-001', 'ACCOUNT', 'ACC_MULE_01', 'Critical', 'RAPID_PASS_THROUGH', 'New', NULL, 'Flagged by GNN', datetime('now'), datetime('now'))"
    )
    .execute(&pool)
    .await
    .expect("Insert alert");

    sqlx::query(
        "UPDATE alerts SET status = 'Investigating', assigned_to = 'Special Investigator' WHERE alert_id = 'ALT-001'"
    )
    .execute(&pool)
    .await
    .expect("Update alert");

    let alert_status: String = sqlx::query_scalar("SELECT status FROM alerts WHERE alert_id = 'ALT-001'")
        .fetch_one(&pool)
        .await
        .expect("Query alert status");
    assert_eq!(alert_status, "Investigating", "Alert status must transition to Investigating");
}
