use fintrace_backend::{
    auth::{create_jwt, hash_password, verify_jwt, verify_password},
    database::init_db,
    models::user::User,
};

#[tokio::test]
async fn test_auth_argon2_and_jwt() {
    let secret = "test-secret-key-12345678901234567890";
    let password = "TestPassword@2026";
    let hash = hash_password(password, "salt");

    assert!(
        verify_password(password, &hash),
        "Argon2 password verification must succeed"
    );
    assert!(
        !verify_password("WrongPassword", &hash),
        "Argon2 wrong password must fail"
    );

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
    assert_eq!(
        dup_res.rows_affected(),
        0,
        "Duplicate transaction must be ignored"
    );

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

    let ev_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM case_evidence WHERE case_id = 'CASE-TEST-01'")
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

    let alert_status: String =
        sqlx::query_scalar("SELECT status FROM alerts WHERE alert_id = 'ALT-001'")
            .fetch_one(&pool)
            .await
            .expect("Query alert status");
    assert_eq!(
        alert_status, "Investigating",
        "Alert status must transition to Investigating"
    );
}

#[tokio::test]
async fn test_analytics_overview_empty_db() {
    use axum::http::Request;
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    let app = fintrace_backend::analytics::router(pool);

    let req = Request::builder()
        .uri("/overview")
        .body(axum::body::Body::empty())
        .unwrap();

    let res = app.oneshot(req).await.expect("Request should succeed");
    assert_eq!(res.status(), 200);

    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .expect("Body read");
    let json: serde_json::Value = serde_json::from_slice(&bytes).expect("JSON parse");

    assert_eq!(json["total_accounts"], 0);
    assert_eq!(json["total_transactions"], 0);
    assert_eq!(json["total_volume"], 0.0);
    assert_eq!(json["high_risk_accounts"], 0);
    assert_eq!(json["medium_risk_accounts"], 0);
    assert_eq!(json["low_risk_accounts"], 0);
    assert_eq!(json["flagged_accounts"], 0);
    assert_eq!(json["active_alerts"], 0);
    assert_eq!(json["open_cases"], 0);
    assert_eq!(json["closed_cases"], 0);

    // Risk distribution percentages must safely be "0.0%"
    let risk_dist = json["risk_distribution"]
        .as_array()
        .expect("risk_distribution array");
    assert_eq!(risk_dist.len(), 3);
    for r in risk_dist {
        assert_eq!(r["value"], 0);
        assert_eq!(r["percentage"], "0.0%");
    }

    assert_eq!(
        json["top_suspicious_patterns"].as_object().unwrap().len(),
        0
    );
    assert_eq!(
        json["recent_suspicious_accounts"].as_array().unwrap().len(),
        0
    );
    assert_eq!(
        json["transaction_volume_by_day"].as_array().unwrap().len(),
        0
    );
}

#[tokio::test]
async fn test_analytics_overview_populated_db() {
    use axum::http::Request;
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // 1. Insert 4 accounts with distinct risk scores (including NULL) and flags
    sqlx::query(
        r#"
        INSERT INTO accounts (account_id, customer_name, risk_score, risk_level, total_incoming, total_outgoing, flags_json)
        VALUES ('ACC_HIGH_01', 'High Risk Entity', 0.95, 'High', 100000.0, 95000.0, '["Smurfing Fan-In", "High Turnover Drain"]'),
               ('ACC_MED_01', 'Medium Entity', 0.55, 'Medium', 40000.0, 10000.0, '["Rapid Fund Movement"]'),
               ('ACC_LOW_01', 'Low Entity', 0.15, 'Low', 10000.0, 5000.0, '[]'),
               ('ACC_NULL_01', 'Unscored Entity', NULL, NULL, 5000.0, 1000.0, '[]')
        "#
    )
    .execute(&pool)
    .await
    .expect("Insert test accounts");

    // 2. Insert alerts with different lifecycle statuses
    sqlx::query(
        r#"
        INSERT INTO alerts (alert_id, target_type, target_id, severity, reason_code, status, created_at, updated_at)
        VALUES ('ALT_1', 'ACCOUNT', 'ACC_HIGH_01', 'Critical', 'SMURFING', 'New', datetime('now'), datetime('now')),
               ('ALT_2', 'ACCOUNT', 'ACC_HIGH_01', 'High', 'RAPID_DRAIN', 'Investigating', datetime('now'), datetime('now')),
               ('ALT_3', 'ACCOUNT', 'ACC_MED_01', 'Medium', 'ANOMALY', 'Resolved', datetime('now'), datetime('now')),
               ('ALT_4', 'ACCOUNT', 'ACC_LOW_01', 'Low', 'FALSE_POS', 'Dismissed', datetime('now'), datetime('now'))
        "#
    )
    .execute(&pool)
    .await
    .expect("Insert test alerts");

    // 3. Insert cases (open and closed)
    sqlx::query(
        r#"
        INSERT INTO cases (case_id, title, status, created_at, updated_at)
        VALUES ('CASE_1', 'Open Investigation', 'Under_Investigation', datetime('now'), datetime('now')),
               ('CASE_2', 'Closed Investigation', 'Closed', datetime('now'), datetime('now'))
        "#
    )
    .execute(&pool)
    .await
    .expect("Insert test cases");

    // 4. Insert complaints
    sqlx::query(
        r#"
        INSERT INTO complaints (complaint_id, complainant_name, description, reported_account_id, amount_lost, date_reported, created_at)
        VALUES ('CMP_1', 'Victim V', 'Phishing scam', 'ACC_HIGH_01', 50000.0, datetime('now'), datetime('now'))
        "#
    )
    .execute(&pool)
    .await
    .expect("Insert test complaints");

    // 5. Insert transactions spanning two days
    sqlx::query(
        r#"
        INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, is_suspicious)
        VALUES ('T1', 'ACC_LOW_01', 'ACC_HIGH_01', 50000.0, '2026-10-18T10:00:00', 1),
               ('T2', 'ACC_NULL_01', 'ACC_HIGH_01', 25000.0, '2026-10-18T14:00:00', 0),
               ('T3', 'ACC_HIGH_01', 'ACC_MED_01', 15000.0, '2026-10-19T09:00:00', 1)
        "#
    )
    .execute(&pool)
    .await
    .expect("Insert test transactions");

    let app = fintrace_backend::analytics::router(pool);

    let req = Request::builder()
        .uri("/overview")
        .body(axum::body::Body::empty())
        .unwrap();

    let res = app.oneshot(req).await.expect("Request should succeed");
    assert_eq!(res.status(), 200);

    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .expect("Body read");
    let json: serde_json::Value = serde_json::from_slice(&bytes).expect("JSON parse");

    // KPI validations
    assert_eq!(json["total_accounts"], 4);
    assert_eq!(json["high_risk_accounts"], 1);
    assert_eq!(json["medium_risk_accounts"], 1);
    assert_eq!(json["low_risk_accounts"], 2); // Unscored (NULL) safely mapped to Low
    assert_eq!(json["flagged_accounts"], 2);
    assert_eq!(json["active_alerts"], 2); // Only 'New' and 'Investigating'
    assert_eq!(json["open_cases"], 1);
    assert_eq!(json["closed_cases"], 1);
    assert_eq!(json["total_complaints"], 1);
    assert_eq!(json["total_complaint_amount"], 50000.0);
    assert_eq!(json["total_transactions"], 3);
    assert_eq!(json["total_volume"], 90000.0);

    // Mutual exclusivity check: low + med + high must equal total_accounts
    assert_eq!(
        json["low_risk_accounts"].as_i64().unwrap()
            + json["medium_risk_accounts"].as_i64().unwrap()
            + json["high_risk_accounts"].as_i64().unwrap(),
        json["total_accounts"].as_i64().unwrap()
    );

    // Risk distribution percentages check
    let risk_dist = json["risk_distribution"]
        .as_array()
        .expect("risk_distribution array");
    assert_eq!(risk_dist[0]["name"], "Low Risk");
    assert_eq!(risk_dist[0]["value"], 2);
    assert_eq!(risk_dist[0]["percentage"], "50.0%");

    assert_eq!(risk_dist[1]["name"], "Medium Risk");
    assert_eq!(risk_dist[1]["value"], 1);
    assert_eq!(risk_dist[1]["percentage"], "25.0%");

    assert_eq!(risk_dist[2]["name"], "High Risk Mules");
    assert_eq!(risk_dist[2]["value"], 1);
    assert_eq!(risk_dist[2]["percentage"], "25.0%");

    // Typology breakdown check
    let patterns = json["top_suspicious_patterns"]
        .as_object()
        .expect("patterns object");
    assert_eq!(patterns["Smurfing Fan-In"], 1);
    assert_eq!(patterns["High Turnover Drain"], 1);
    assert_eq!(patterns["Rapid Fund Movement"], 1);

    // Priority Action Table check
    let suspect_accs = json["recent_suspicious_accounts"]
        .as_array()
        .expect("suspect accounts array");
    assert_eq!(suspect_accs.len(), 4);
    assert_eq!(suspect_accs[0]["account_id"], "ACC_HIGH_01");
    assert_eq!(suspect_accs[0]["risk_score"], 0.95);
    let top_flags = suspect_accs[0]["flags"].as_array().unwrap();
    assert_eq!(top_flags.len(), 2);

    // Timeline check: sorted chronologically
    let timeline = json["transaction_volume_by_day"]
        .as_array()
        .expect("timeline array");
    assert_eq!(timeline.len(), 2);
    assert_eq!(timeline[0]["date"], "2026-10-18");
    assert_eq!(timeline[0]["volume"], 75000.0);
    assert_eq!(timeline[1]["date"], "2026-10-19");
    assert_eq!(timeline[1]["volume"], 15000.0);

    // Backward compatibility metrics object check
    assert_eq!(json["metrics"]["total_accounts"], 4);
    assert_eq!(json["metrics"]["high_risk_mules"], 1);
    assert_eq!(json["metrics"]["active_alerts"], 2);
}

#[tokio::test]
async fn test_accounts_module_integration() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    sqlx::query(
        r#"
        INSERT INTO accounts (account_id, customer_name, account_type, risk_score, risk_level, prediction_confidence, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, turnover_ratio, flags_json)
        VALUES ('ACC_ALICE', 'Alice Smith', 'Savings', 0.12, 'Low', 0.91, 5000.0, 1000.0, 1, 1, 2, 0.20, '[]'),
               ('ACC_BOB', 'Bob Conduit', 'Current', 0.88, 'High', 0.78, 250000.0, 245000.0, 5, 1, 6, 0.98, '["Aggregator Funneling", "High Turnover Drain"]'),
               ('ACC_CHARLIE', 'Charlie Brown', 'Savings', 0.55, 'Medium', NULL, 30000.0, 15000.0, 2, 2, 4, 0.50, '["Rapid Fund Movement"]')
        "#
    )
    .execute(&pool)
    .await
    .expect("Insert test accounts");

    let app = fintrace_backend::accounts::router(pool);

    // 1. List accounts - filter by risk_level HIGH
    let req = Request::builder()
        .uri("/?risk_level=HIGH")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["total"], 1);
    let accs = json["accounts"].as_array().unwrap();
    assert_eq!(accs.len(), 1);
    assert_eq!(accs[0]["account_id"], "ACC_BOB");
    assert_eq!(accs[0]["risk_level"], "High");
    let flags = accs[0]["flags"].as_array().unwrap();
    assert_eq!(flags.len(), 2);

    // 2. Search by customer name
    let req = Request::builder()
        .uri("/?search=Alice")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["total"], 1);
    assert_eq!(json["accounts"][0]["account_id"], "ACC_ALICE");

    // 3. Get single account
    let req = Request::builder()
        .uri("/ACC_BOB")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["account_id"], "ACC_BOB");
    assert_eq!(json["turnover_ratio"], 0.98);

    // 4. Get explanation with explainable structural signals
    let req = Request::builder()
        .uri("/ACC_BOB/explanation")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["account_id"], "ACC_BOB");
    assert_eq!(json["confidence"], 0.78);
    assert_eq!(json["structural_signals"]["is_smurfing_aggregator"], true);
    assert_eq!(json["structural_signals"]["is_rapid_pass_through"], true);

    // 5. Account not found returns 404
    let req = Request::builder()
        .uri("/NONEXISTENT_ACCOUNT")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_graph_and_cycle_detection_integration() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // 1. Create a 3-node ring: RING_A -> RING_B -> RING_C -> RING_A
    sqlx::query(
        r#"
        INSERT INTO accounts (account_id, customer_name, risk_score, risk_level, total_incoming, total_outgoing, turnover_ratio)
        VALUES ('RING_A', 'Ring Node A', 0.82, 'High', 100000.0, 99000.0, 0.99),
               ('RING_B', 'Ring Node B', 0.85, 'High', 99000.0, 98000.0, 0.99),
               ('RING_C', 'Ring Node C', 0.80, 'High', 98000.0, 97000.0, 0.99)
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, is_suspicious)
        VALUES ('TX_AB', 'RING_A', 'RING_B', 99000.0, '2026-10-19T10:00:00', 1),
               ('TX_BC', 'RING_B', 'RING_C', 98000.0, '2026-10-19T11:00:00', 1),
               ('TX_CA', 'RING_C', 'RING_A', 97000.0, '2026-10-19T12:00:00', 1)
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    let app = fintrace_backend::graph::router(pool);

    // Test /overview
    let req = Request::builder()
        .uri("/overview")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["total_nodes"], 3);
    assert_eq!(json["total_edges"], 3);
    assert_eq!(json["nodes"].as_array().unwrap().len(), 3);
    assert_eq!(json["edges"].as_array().unwrap().len(), 3);

    // Test /subgraph with radius=2
    let req = Request::builder()
        .uri("/subgraph/RING_A?radius=2")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["center_account"], "RING_A");
    assert_eq!(json["total_nodes"], 3);

    // Test 404 on nonexistent node subgraph
    let req = Request::builder()
        .uri("/subgraph/NONEXISTENT_NODE")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // Test /cycles detection
    let req = Request::builder()
        .uri("/cycles")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["total_cycles_detected"], 1);
    let cycle = &json["cycles"][0];
    assert_eq!(cycle["cycle_length"], 3);
    assert_eq!(cycle["risk_flag"], "CIRCULAR_MONEY_LAUNDERING_RING");
    // Verify dynamic explainable confidence based on high risk scores (avg ~0.82)
    let conf = cycle["confidence"].as_f64().unwrap();
    assert!(
        conf >= 0.85 && conf <= 0.99,
        "Cycle confidence must be dynamic and reflect risk scores: {}",
        conf
    );
}

#[tokio::test]
async fn test_money_trail_module_integration() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // Multi-hop flow: SRC_01 & SRC_02 -> CONDUIT_01 -> DEST_01 -> DEST_02
    sqlx::query(
        r#"
        INSERT INTO accounts (account_id, customer_name, risk_score, risk_level)
        VALUES ('SRC_01', 'Victim Alpha', 0.1, 'Low'),
               ('SRC_02', 'Victim Beta', 0.1, 'Low'),
               ('CONDUIT_01', 'Primary Conduit', 0.89, 'High'),
               ('DEST_01', 'Layer Conduit', 0.75, 'High'),
               ('DEST_02', 'Cashout ATM', 0.65, 'Medium')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, transaction_type, is_suspicious)
        VALUES ('T_IN_1', 'SRC_01', 'CONDUIT_01', 50000.0, '2026-10-19T10:00:00', 'UPI', 1),
               ('T_IN_2', 'SRC_02', 'CONDUIT_01', 75000.0, '2026-10-19T10:30:00', 'IMPS', 1),
               ('T_OUT_1', 'CONDUIT_01', 'DEST_01', 120000.0, '2026-10-19T11:00:00', 'RTGS', 1),
               ('T_OUT_2', 'DEST_01', 'DEST_02', 115000.0, '2026-10-19T11:45:00', 'ATM', 1)
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    let app = fintrace_backend::money_trail::router(pool);

    // 1. Direct path /:id
    let req = Request::builder()
        .uri("/CONDUIT_01?max_hops=4")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert_eq!(json["target_account"], "CONDUIT_01");
    assert_eq!(json["total_inbound_volume"], 125000.0);
    assert_eq!(json["total_outbound_volume"], 235000.0);

    // Layering analysis checks
    assert_eq!(json["layering_analysis"]["is_potential_conduit"], true);
    assert_eq!(json["layering_analysis"]["total_inflow_nodes"], 2);
    assert_eq!(json["layering_analysis"]["total_outflow_nodes"], 2);

    // Steps verification
    let backward = json["backward_steps"].as_array().unwrap();
    assert_eq!(backward.len(), 2);
    let forward = json["forward_steps"].as_array().unwrap();
    assert_eq!(forward.len(), 2);

    // Graph payload verification for Cytoscape
    assert!(json["graph"]["nodes"].as_array().unwrap().len() >= 4);
    assert!(json["graph"]["edges"].as_array().unwrap().len() >= 4);

    // 2. Query param endpoint /trace?account_id=CONDUIT_01
    let req = Request::builder()
        .uri("/trace?account_id=CONDUIT_01&max_hops=4")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 3. Not found on nonexistent account returns 404
    let req = Request::builder()
        .uri("/NONEXISTENT_ACCOUNT")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_ml_client_unreachable_upstream_handling() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // Point to an unavailable local port so requests fail immediately
    let unreachable_url = "http://127.0.0.1:59998/api/v1".to_string();
    let app = fintrace_backend::ml_client::router(pool, unreachable_url);

    // 1. GET /status should report UNAVAILABLE, not pretend to succeed with fake initialized data
    let req = Request::builder()
        .uri("/status")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["status"], "UNAVAILABLE");
    assert_eq!(json["online"], false);

    // 2. POST /predict/account should fail visibly with BAD_GATEWAY, never return fake prediction
    let req = Request::builder()
        .method("POST")
        .uri("/predict/account")
        .header("content-type", "application/json")
        .body(axum::body::Body::from(r#"{"account_id": "ACC_TEST"}"#))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(
        res.status(),
        StatusCode::BAD_GATEWAY,
        "Failed ML connection must propagate 502 Bad Gateway rather than reporting fake prediction"
    );
}

#[tokio::test]
async fn test_evidence_traceability_and_explanation() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // 1. Create subject account, connected high-risk account, and normal accounts
    sqlx::query(
        r#"
        INSERT INTO accounts (account_id, customer_name, account_type, risk_score, risk_level, prediction_confidence, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, turnover_ratio, flags_json)
        VALUES ('MULE_SUBJECT', 'Conduit Entity', 'Current', 0.88, 'High', 0.82, 100000.0, 95000.0, 3, 1, 4, 0.95, '["High Turnover Drain", "Aggregator Funneling", "Rapid Fund Movement"]'),
               ('MULE_PEER_HIGH', 'High Risk Associate', 'Savings', 0.92, 'High', 0.89, 95000.0, 90000.0, 1, 1, 2, 0.94, '["High Turnover Drain"]'),
               ('SRC_VICTIM_01', 'Victim A', 'Savings', 0.10, 'Low', 0.95, 0.0, 50000.0, 0, 1, 1, 0.0, '[]'),
               ('SRC_VICTIM_02', 'Victim B', 'Savings', 0.10, 'Low', 0.95, 0.0, 50000.0, 0, 1, 1, 0.0, '[]')
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    // 2. Insert connecting transactions
    sqlx::query(
        r#"
        INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, transaction_type, is_suspicious)
        VALUES ('TX_V1', 'SRC_VICTIM_01', 'MULE_SUBJECT', 50000.0, '2026-10-19T09:00:00', 'UPI', 1),
               ('TX_V2', 'SRC_VICTIM_02', 'MULE_SUBJECT', 50000.0, '2026-10-19T09:30:00', 'UPI', 1),
               ('TX_OUT', 'MULE_SUBJECT', 'MULE_PEER_HIGH', 95000.0, '2026-10-19T10:15:00', 'RTGS', 1)
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    // 3. Insert victim complaint
    sqlx::query(
        r#"
        INSERT INTO complaints (complaint_id, complainant_name, description, reported_account_id, amount_lost, date_reported, created_at)
        VALUES ('CMP_MULE_01', 'Aggrieved Complainant', 'Unsolicited phishing debit diverted to suspect', 'MULE_SUBJECT', 50000.0, '2026-10-19T11:00:00', '2026-10-19T11:00:00')
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    let app = fintrace_backend::accounts::router(pool);

    let req = Request::builder()
        .uri("/MULE_SUBJECT/explanation")
        .body(axum::body::Body::empty())
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    // Check account identity and risk metrics
    assert_eq!(json["account_id"], "MULE_SUBJECT");
    assert_eq!(json["risk_level"], "High");
    assert_eq!(json["confidence"], 0.82);

    // Check structural features matching MuleDetectionPage expectations
    assert_eq!(json["structural_features"]["turnover_ratio"], 0.95);
    assert_eq!(json["structural_features"]["in_degree"], 3);
    assert_eq!(json["structural_features"]["out_degree"], 1);

    // Check connected high-risk accounts linking
    let peers = json["connected_high_risk_accounts"].as_array().unwrap();
    assert_eq!(peers.len(), 1);
    assert_eq!(peers[0], "MULE_PEER_HIGH");

    // Check traceable supporting evidence items
    let evidence = json["supporting_evidence"].as_array().unwrap();
    assert!(
        evidence.len() >= 3,
        "Must have multiple traceable evidence indicators: {}",
        evidence.len()
    );

    let signal_names: Vec<&str> = evidence
        .iter()
        .map(|e| e["signal_name"].as_str().unwrap())
        .collect();

    assert!(
        signal_names.iter().any(|&s| s.contains("High Turnover")),
        "Must contain High Turnover evidence"
    );
    assert!(
        signal_names.iter().any(|&s| s.contains("Smurfing")),
        "Must contain Smurfing Fan-In evidence"
    );
    assert!(
        signal_names.iter().any(|&s| s.contains("Victim Complaint")),
        "Must contain correlated victim complaint evidence"
    );

    // Check complaint count & loss volume
    assert_eq!(json["associated_complaints_count"], 1);
    assert_eq!(json["associated_complaints_amount"], 50000.0);
}

#[tokio::test]
async fn test_legacy_gnn_failure_propagation() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    let unreachable_url = "http://127.0.0.1:59997/api/v1".to_string();
    let app = fintrace_backend::ml_client::legacy_gnn_router(pool, unreachable_url);

    // 1. POST /infer when ML microservice is unreachable must return 502, never fake success
    let req = Request::builder()
        .method("POST")
        .uri("/infer")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(
        res.status(),
        StatusCode::BAD_GATEWAY,
        "Failed GNN inference must return 502 Bad Gateway"
    );

    // 2. POST /train when ML microservice is unreachable must return 502, never fake success
    let req = Request::builder()
        .method("POST")
        .uri("/train")
        .header("content-type", "application/json")
        .body(axum::body::Body::from(r#"{"epochs": 10}"#))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(
        res.status(),
        StatusCode::BAD_GATEWAY,
        "Failed GNN training must return 502 Bad Gateway"
    );
}

#[tokio::test]
async fn test_end_to_end_investigation_workflow() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // Step 1: Ingest accounts and transactions
    sqlx::query(
        r#"
        INSERT INTO accounts (account_id, customer_name, risk_score, risk_level, status)
        VALUES ('ACC_VICTIM', 'Victim John', 0.05, 'Low', 'Active'),
               ('ACC_MULE_1', 'Conduit Bob', 0.85, 'High', 'Active'),
               ('ACC_CASHOUT', 'Crypto Drain', 0.75, 'High', 'Active')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, is_suspicious)
        VALUES ('TXN_E2E_1', 'ACC_VICTIM', 'ACC_MULE_1', 80000.0, '2026-10-19T08:00:00', 'COMPLETED', 'UPI', 1),
               ('TXN_E2E_2', 'ACC_MULE_1', 'ACC_CASHOUT', 78000.0, '2026-10-19T09:00:00', 'COMPLETED', 'RTGS', 1)
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    // Step 2: Compute graph topological metrics
    fintrace_backend::transactions::update_account_graph_metrics(&pool)
        .await
        .expect("Graph metrics update must succeed");

    // Step 3: Verify accounts module exposes updated graph signals
    let acc_app = fintrace_backend::accounts::router(pool.clone());
    let req = Request::builder()
        .uri("/ACC_MULE_1")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = acc_app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let acc_json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(acc_json["in_degree"], 1);
    assert_eq!(acc_json["out_degree"], 1);
    assert_eq!(acc_json["total_incoming"], 80000.0);
    assert_eq!(acc_json["total_outgoing"], 78000.0);

    // Step 4: Verify graph overview returns both elements and nodes/edges for Cytoscape
    let graph_app = fintrace_backend::graph::router(pool.clone());
    let req = Request::builder()
        .uri("/overview")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = graph_app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let g_json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(g_json["total_nodes"], 3);
    assert_eq!(g_json["total_edges"], 2);

    // Step 5: Verify money trail traces from victim to cashout
    let trail_app = fintrace_backend::money_trail::router(pool.clone());
    let req = Request::builder()
        .uri("/ACC_MULE_1?max_hops=3")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = trail_app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let trail_json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(trail_json["target_account"], "ACC_MULE_1");
    assert_eq!(trail_json["backward_steps"].as_array().unwrap().len(), 1);
    assert_eq!(trail_json["forward_steps"].as_array().unwrap().len(), 1);
    assert_eq!(
        trail_json["layering_analysis"]["is_potential_conduit"],
        true
    );

    // Step 6: Verify case creation links primary account with initial evidence
    let case_app = fintrace_backend::cases::router(pool.clone());
    let case_payload = serde_json::json!({
        "title": "Mule Ring Operation Delta",
        "priority": "Critical",
        "assigned_investigator": "Lead Investigator",
        "primary_account_id": "ACC_MULE_1",
        "summary": "Flagged conduit with 97% turnover ratio and rapid pass-through.",
        "findings": "Funds from ACC_VICTIM funneled to ACC_CASHOUT.",
        "initial_evidence": [
            {
                "evidence_type": "ACCOUNT",
                "reference_id": "ACC_MULE_1",
                "description": "Primary subject account"
            }
        ]
    });

    let req = Request::builder()
        .method("POST")
        .uri("/")
        .header("content-type", "application/json")
        .body(axum::body::Body::from(
            serde_json::to_vec(&case_payload).unwrap(),
        ))
        .unwrap();
    let res = case_app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let case_res: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(case_res["primary_account_id"], "ACC_MULE_1");
    assert_eq!(case_res["priority"], "Critical");
}

#[tokio::test]
async fn test_mutually_exclusive_risk_classification_with_conflicting_labels() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // Insert 7 accounts testing conflicting scores vs stored labels and NULL combinations:
    // 1. Score 0.85 (High), Label 'Low' -> Must classify as High
    // 2. Score 0.20 (Low), Label 'High' -> Must classify as Low
    // 3. Score 0.55 (Med), Label 'Low' -> Must classify as Medium
    // 4. Score NULL, Label 'High' -> Must classify as High
    // 5. Score NULL, Label 'Medium' -> Must classify as Medium
    // 6. Score NULL, Label 'Low' -> Must classify as Low
    // 7. Score NULL, Label NULL -> Must classify as Low
    sqlx::query(
        r#"
        INSERT INTO accounts (account_id, risk_score, risk_level)
        VALUES ('ACC_CONF_1', 0.85, 'Low'),
               ('ACC_CONF_2', 0.20, 'High'),
               ('ACC_CONF_3', 0.55, 'Low'),
               ('ACC_CONF_4', NULL, 'High'),
               ('ACC_CONF_5', NULL, 'Medium'),
               ('ACC_CONF_6', NULL, 'Low'),
               ('ACC_CONF_7', NULL, NULL)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let app = fintrace_backend::analytics::router(pool);
    let req = Request::builder()
        .uri("/overview")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let overview: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    let total = overview["total_accounts"].as_i64().unwrap();
    let high = overview["high_risk_accounts"].as_i64().unwrap();
    let med = overview["medium_risk_accounts"].as_i64().unwrap();
    let low = overview["low_risk_accounts"].as_i64().unwrap();

    assert_eq!(total, 7, "Total accounts must equal 7");
    assert_eq!(
        high, 2,
        "High risk must be exactly 2 (ACC_CONF_1 and ACC_CONF_4)"
    );
    assert_eq!(
        med, 2,
        "Medium risk must be exactly 2 (ACC_CONF_3 and ACC_CONF_5)"
    );
    assert_eq!(
        low, 3,
        "Low risk must be exactly 3 (ACC_CONF_2, ACC_CONF_6, ACC_CONF_7)"
    );
    assert_eq!(
        high + med + low,
        total,
        "Mutually exclusive risk counts must sum to total accounts"
    );

    // Verify risk distribution array values and percentages
    let dist = overview["risk_distribution"].as_array().unwrap();
    assert_eq!(dist[0]["name"], "Low Risk");
    assert_eq!(dist[0]["value"], 3);
    assert_eq!(dist[1]["name"], "Medium Risk");
    assert_eq!(dist[1]["value"], 2);
    assert_eq!(dist[2]["name"], "High Risk Mules");
    assert_eq!(dist[2]["value"], 2);
}

#[tokio::test]
async fn test_money_trail_graph_nodes_derived_from_database_and_handles_missing() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // Insert accounts with known risk scores and levels, and one with NULL score/level
    sqlx::query(
        r#"
        INSERT INTO accounts (account_id, risk_score, risk_level)
        VALUES ('SRC_ACC_1', 0.15, 'Low'),
               ('TARGET_ACC', 0.88, 'High'),
               ('DEST_UNSCORED', NULL, NULL)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Insert transactions
    sqlx::query(
        r#"
        INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, transaction_type, is_suspicious)
        VALUES ('T_IN', 'SRC_ACC_1', 'TARGET_ACC', 45000.0, '2026-10-18T10:00:00', 'UPI', 1),
               ('T_OUT', 'TARGET_ACC', 'DEST_UNSCORED', 43000.0, '2026-10-18T10:30:00', 'IMPS', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let app = fintrace_backend::money_trail::router(pool.clone());
    let req = Request::builder()
        .uri("/TARGET_ACC?max_hops=2")
        .body(axum::body::Body::empty())
        .unwrap();
    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let trail: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    let graph_nodes = trail["graph"]["nodes"].as_array().unwrap();
    assert_eq!(
        graph_nodes.len(),
        3,
        "Must produce nodes for target, source, and destination"
    );

    let target_node = graph_nodes
        .iter()
        .find(|n| n["data"]["id"] == "TARGET_ACC")
        .unwrap();
    assert_eq!(
        target_node["data"]["risk_score"], 0.88,
        "Target risk score must be derived from database (0.88, not hardcoded 0.85)"
    );
    assert_eq!(target_node["data"]["risk_level"], "High");

    let src_node = graph_nodes
        .iter()
        .find(|n| n["data"]["id"] == "SRC_ACC_1")
        .unwrap();
    assert_eq!(
        src_node["data"]["risk_score"], 0.15,
        "Source risk score must be derived from database (0.15, not hardcoded 0.50)"
    );
    assert_eq!(src_node["data"]["risk_level"], "Low");

    let unscored_node = graph_nodes
        .iter()
        .find(|n| n["data"]["id"] == "DEST_UNSCORED")
        .unwrap();
    assert_eq!(
        unscored_node["data"]["risk_score"], 0.0,
        "Unscored account must safely default to 0.0 score"
    );
    assert_eq!(
        unscored_node["data"]["risk_level"], "Low",
        "Unscored account must safely default to Low risk"
    );

    // Verify querying an account that does NOT exist in accounts table nor in transactions returns 404
    let app2 = fintrace_backend::money_trail::router(pool);
    let req2 = Request::builder()
        .uri("/NON_EXISTENT_ACC?max_hops=2")
        .body(axum::body::Body::empty())
        .unwrap();
    let res2 = app2.oneshot(req2).await.unwrap();
    assert_eq!(
        res2.status(),
        StatusCode::NOT_FOUND,
        "Querying account not in accounts and not in transactions must return 404 Not Found"
    );
}

#[tokio::test]
async fn test_rapid_movement_timestamp_verification_vs_unverified_flag() {
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    let pool = init_db("sqlite::memory:")
        .await
        .expect("Database initialization must succeed");

    // 1. Account A: Has verified transfer pair within 2 hours (0.5 hours / 30 mins)
    // 2. Account B: Has stored "Rapid Fund Movement" flag, but transactions are 10 hours apart (> 2 hours)
    sqlx::query(
        r#"
        INSERT INTO accounts (account_id, risk_score, risk_level, turnover_ratio, flags_json)
        VALUES ('ACC_VERIFIED_RAPID', 0.85, 'High', 0.90, '["Rapid Fund Movement"]'),
               ('ACC_UNVERIFIED_FLAG', 0.70, 'High', 0.90, '["Rapid Fund Movement"]'),
               ('SRC_PEER', 0.10, 'Low', 0.0, '[]'),
               ('DST_PEER', 0.10, 'Low', 0.0, '[]')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Account A: 30 minutes delta (0.5 hours) -> Verified
    sqlx::query(
        r#"
        INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, transaction_type, is_suspicious)
        VALUES ('TX_A_IN', 'SRC_PEER', 'ACC_VERIFIED_RAPID', 10000.0, '2026-10-19T10:00:00', 'UPI', 1),
               ('TX_A_OUT', 'ACC_VERIFIED_RAPID', 'DST_PEER', 9000.0, '2026-10-19T10:30:00', 'UPI', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Account B: 10 hours delta -> Cannot claim verified <= 2 hours, must label as stored flag
    sqlx::query(
        r#"
        INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, transaction_type, is_suspicious)
        VALUES ('TX_B_IN', 'SRC_PEER', 'ACC_UNVERIFIED_FLAG', 10000.0, '2026-10-19T08:00:00', 'UPI', 1),
               ('TX_B_OUT', 'ACC_UNVERIFIED_FLAG', 'DST_PEER', 9000.0, '2026-10-19T18:00:00', 'UPI', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let app = fintrace_backend::accounts::router(pool);

    // Verify Account A gets Verified Rapid Movement evidence with calculated delta
    let req_a = Request::builder()
        .uri("/ACC_VERIFIED_RAPID/explanation")
        .body(axum::body::Body::empty())
        .unwrap();
    let res_a = app.clone().oneshot(req_a).await.unwrap();
    assert_eq!(res_a.status(), StatusCode::OK);
    let bytes_a = axum::body::to_bytes(res_a.into_body(), usize::MAX)
        .await
        .unwrap();
    let json_a: serde_json::Value = serde_json::from_slice(&bytes_a).unwrap();
    let ev_a = json_a["supporting_evidence"].as_array().unwrap();
    let rapid_ev_a = ev_a
        .iter()
        .find(|e| e["signal_name"] == "Rapid Fund Movement Pass-Through (Verified)")
        .unwrap();
    assert!(rapid_ev_a["description"]
        .as_str()
        .unwrap()
        .contains("0.50 hours"));
    assert!(rapid_ev_a["metrics"]
        .as_str()
        .unwrap()
        .contains("0.50 hrs (TX_A_IN -> TX_A_OUT)"));

    // Verify Account B is explicitly labeled as unverified/stored flag
    let req_b = Request::builder()
        .uri("/ACC_UNVERIFIED_FLAG/explanation")
        .body(axum::body::Body::empty())
        .unwrap();
    let res_b = app.oneshot(req_b).await.unwrap();
    assert_eq!(res_b.status(), StatusCode::OK);
    let bytes_b = axum::body::to_bytes(res_b.into_body(), usize::MAX)
        .await
        .unwrap();
    let json_b: serde_json::Value = serde_json::from_slice(&bytes_b).unwrap();
    let ev_b = json_b["supporting_evidence"].as_array().unwrap();
    let rapid_ev_b = ev_b
        .iter()
        .find(|e| {
            e["signal_name"]
                .as_str()
                .unwrap()
                .contains("Stored Model Flag: Rapid Movement")
        })
        .unwrap();
    assert!(rapid_ev_b["description"]
        .as_str()
        .unwrap()
        .contains("no direct <= 2.0-hour inbound-to-outbound transfer pair was confirmed"));
}
