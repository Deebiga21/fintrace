use axum::{
    extract::{Multipart, Path, Query, State},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde_json::json;

use crate::{
    database::DbPool,
    errors::AppError,
    models::transaction::{Transaction, TransactionFilterParams},
    utils::sanitize_upload_filename,
};

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/", get(list_transactions))
        .route("/summary", get(get_transactions_summary))
        .route("/upload", post(upload_transactions_csv))
        .route("/load-sample", post(load_sample_data))
        .route("/:id", get(get_transaction))
        .route("/:id/related", get(get_related_transactions))
        .with_state(pool)
}

async fn list_transactions(
    State(pool): State<DbPool>,
    Query(params): Query<TransactionFilterParams>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params.limit.unwrap_or(100).min(500);
    let skip = params.skip.unwrap_or(0);

    let mut conditions = Vec::new();
    let mut bindings: Vec<String> = Vec::new();

    if let Some(ref acc) = params.account_id {
        let trimmed = acc.trim();
        if !trimmed.is_empty() {
            conditions.push("(sender_account = ? OR receiver_account = ?)");
            bindings.push(trimmed.to_string());
            bindings.push(trimmed.to_string());
        }
    }

    if let Some(ref ttype) = params.transaction_type {
        let trimmed = ttype.trim();
        if !trimmed.is_empty() && !trimmed.eq_ignore_ascii_case("all") {
            conditions.push("LOWER(transaction_type) = LOWER(?)");
            bindings.push(trimmed.to_string());
        }
    }

    if let Some(susp) = params.is_suspicious {
        conditions.push("is_suspicious = ?");
        bindings.push(if susp {
            "1".to_string()
        } else {
            "0".to_string()
        });
    }

    if let Some(min_amt) = params.min_amount {
        conditions.push("amount >= ?");
        bindings.push(min_amt.to_string());
    }

    if let Some(max_amt) = params.max_amount {
        conditions.push("amount <= ?");
        bindings.push(max_amt.to_string());
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions {} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        where_clause
    );

    let count_sql = format!("SELECT COUNT(*) FROM transactions {}", where_clause);

    let mut q = sqlx::query_as::<_, Transaction>(&sql);
    let mut count_q = sqlx::query_scalar::<_, i64>(&count_sql);

    for b in &bindings {
        q = q.bind(b);
        count_q = count_q.bind(b);
    }

    q = q.bind(limit).bind(skip);

    let txns = q.fetch_all(&pool).await?;
    let total = count_q.fetch_one(&pool).await?;

    Ok(Json(json!({
        "total": total,
        "skip": skip,
        "limit": limit,
        "transactions": txns
    })))
}

async fn get_transaction(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let txn = sqlx::query_as::<_, Transaction>(
        "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE transaction_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Transaction {} not found", id)))?;

    Ok(Json(txn))
}

async fn upload_transactions_csv(
    State(pool): State<DbPool>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut total_rows = 0;
    let mut valid_records = 0;
    let mut skipped = 0;
    let mut duplicate_records = 0;
    let mut new_accounts_created = 0;
    let mut uploaded_filename = String::from("transactions.csv");
    let mut errors_sample = Vec::new();

    let mut tx = pool.begin().await?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            if let Some(fn_val) = field.file_name() {
                uploaded_filename = sanitize_upload_filename(fn_val);
            }
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(e.to_string()))?;
            let cursor = std::io::Cursor::new(data);
            let mut rdr = csv::ReaderBuilder::new()
                .has_headers(true)
                .flexible(true)
                .from_reader(cursor);

            let headers = rdr
                .headers()
                .map_err(|e| AppError::BadRequest(e.to_string()))?
                .clone();

            // Check mandatory headers
            let h_map: std::collections::HashMap<String, usize> = headers
                .iter()
                .enumerate()
                .map(|(i, h)| (h.trim().to_lowercase(), i))
                .collect();

            let txn_col = h_map
                .get("transaction_id")
                .or_else(|| h_map.get("txnid"))
                .copied();
            let sender_col = h_map
                .get("sender_account")
                .or_else(|| h_map.get("nameorig"))
                .or_else(|| h_map.get("sender"))
                .copied();
            let receiver_col = h_map
                .get("receiver_account")
                .or_else(|| h_map.get("namedest"))
                .or_else(|| h_map.get("receiver"))
                .copied();
            let amount_col = h_map.get("amount").or_else(|| h_map.get("amt")).copied();
            let timestamp_col = h_map
                .get("timestamp")
                .or_else(|| h_map.get("time"))
                .or_else(|| h_map.get("date"))
                .copied();
            let status_col = h_map.get("status").copied();
            let suspicious_col = h_map
                .get("is_suspicious")
                .or_else(|| h_map.get("isfraud"))
                .or_else(|| h_map.get("fraud"))
                .copied();
            let desc_col = h_map
                .get("description")
                .or_else(|| h_map.get("notes"))
                .or_else(|| h_map.get("flag_reason"))
                .copied();

            if sender_col.is_none() || receiver_col.is_none() || amount_col.is_none() {
                return Err(AppError::BadRequest(
                    "CSV must contain sender_account, receiver_account, and amount columns"
                        .to_string(),
                ));
            }

            for result in rdr.records() {
                total_rows += 1;
                let record = match result {
                    Ok(r) => r,
                    Err(e) => {
                        skipped += 1;
                        if errors_sample.len() < 5 {
                            errors_sample.push(format!("Row {}: Parse error: {}", total_rows, e));
                        }
                        continue;
                    }
                };

                let sender = record
                    .get(sender_col.unwrap())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let receiver = record
                    .get(receiver_col.unwrap())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let amount: f64 = record
                    .get(amount_col.unwrap())
                    .and_then(|a| a.trim().parse().ok())
                    .unwrap_or(0.0);

                if sender.is_empty()
                    || receiver.is_empty()
                    || amount <= 0.0
                    || amount.is_nan()
                    || amount.is_infinite()
                {
                    skipped += 1;
                    if errors_sample.len() < 5 {
                        errors_sample.push(format!(
                            "Row {}: Invalid data (sender='{}', receiver='{}', amount={})",
                            total_rows, sender, receiver, amount
                        ));
                    }
                    continue;
                }

                let txn_id = txn_col
                    .and_then(|c| record.get(c))
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_string())
                    .unwrap_or_else(|| {
                        format!(
                            "TXN_{}",
                            uuid::Uuid::new_v4().to_string().replace("-", "")[..12].to_uppercase()
                        )
                    });

                let txn_type = h_map
                    .get("transaction_type")
                    .or_else(|| h_map.get("type"))
                    .and_then(|c| record.get(*c))
                    .unwrap_or("UPI")
                    .trim()
                    .to_uppercase();

                let timestamp = timestamp_col
                    .and_then(|c| record.get(c))
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_string())
                    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

                let status = status_col
                    .and_then(|c| record.get(c))
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_uppercase())
                    .unwrap_or_else(|| "COMPLETED".to_string());

                let is_susp: bool = suspicious_col
                    .and_then(|c| record.get(c))
                    .map(|v| v.trim() == "1" || v.trim().eq_ignore_ascii_case("true"))
                    .unwrap_or(false);

                let desc = desc_col
                    .and_then(|c| record.get(c))
                    .map(|s| s.trim().to_string());

                // Ensure accounts exist within transaction & track new creations
                let s_res = sqlx::query("INSERT OR IGNORE INTO accounts (account_id, created_at) VALUES ($1, datetime('now'))")
                    .bind(&sender)
                    .execute(&mut *tx)
                    .await;
                if let Ok(r) = s_res {
                    if r.rows_affected() > 0 {
                        new_accounts_created += 1;
                    }
                }

                let r_res = sqlx::query("INSERT OR IGNORE INTO accounts (account_id, created_at) VALUES ($1, datetime('now'))")
                    .bind(&receiver)
                    .execute(&mut *tx)
                    .await;
                if let Ok(r) = r_res {
                    if r.rows_affected() > 0 {
                        new_accounts_created += 1;
                    }
                }

                // Insert or replace transaction within transaction
                let res = sqlx::query(
                    r#"
                    INSERT INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, is_suspicious, description)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT(transaction_id) DO UPDATE SET
                        amount = excluded.amount,
                        status = excluded.status,
                        is_suspicious = excluded.is_suspicious
                    "#
                )
                .bind(&txn_id)
                .bind(&sender)
                .bind(&receiver)
                .bind(amount)
                .bind(&timestamp)
                .bind(&status)
                .bind(&txn_type)
                .bind(if is_susp { 1 } else { 0 })
                .bind(desc)
                .execute(&mut *tx)
                .await;

                match res {
                    Ok(r) => {
                        if r.rows_affected() > 0 {
                            valid_records += 1;
                        } else {
                            duplicate_records += 1;
                        }
                    }
                    Err(_) => {
                        duplicate_records += 1;
                    }
                }
            }
        }
    }

    // Update account metrics atomically within the transaction
    let metric_update_1 = sqlx::query(
        r#"
        UPDATE accounts SET
            total_incoming = (SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE receiver_account = accounts.account_id),
            total_outgoing = (SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE sender_account = accounts.account_id),
            in_degree = (SELECT COUNT(DISTINCT sender_account) FROM transactions WHERE receiver_account = accounts.account_id),
            out_degree = (SELECT COUNT(DISTINCT receiver_account) FROM transactions WHERE sender_account = accounts.account_id),
            unique_counterparties = (
                SELECT COUNT(DISTINCT counterparty) FROM (
                    SELECT sender_account AS counterparty FROM transactions WHERE receiver_account = accounts.account_id
                    UNION
                    SELECT receiver_account AS counterparty FROM transactions WHERE sender_account = accounts.account_id
                )
            );
        "#,
    )
    .execute(&mut *tx)
    .await;

    let metric_update_2 = if metric_update_1.is_ok() {
        sqlx::query(
            r#"
            UPDATE accounts SET
                turnover_ratio = total_outgoing / (total_incoming + 1.0)
            WHERE total_incoming > 0;
            "#,
        )
        .execute(&mut *tx)
        .await
    } else {
        metric_update_1
    };

    if let Err(e) = metric_update_2 {
        tracing::error!(
            "Failed to update account graph metrics after CSV ingestion: {}. Rolling back transaction.",
            e
        );
        let _ = tx.rollback().await;

        let _ = sqlx::query(
            "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES (datetime('now'), 'Investigator', 'INGESTION', 'CSV', 'ERROR', $1)"
        )
        .bind(format!("CSV ingestion rolled back because graph metrics update failed: {}", e))
        .execute(&pool)
        .await;

        return Err(AppError::Internal(format!(
            "Failed to update topological account metrics after CSV ingestion: {}. All inserted records rolled back.",
            e
        )));
    }

    // Commit atomic batch and metrics together
    tx.commit().await?;

    // Record audit log
    let details = format!(
        "Uploaded CSV '{}': {} total, {} valid, {} duplicates, {} skipped",
        uploaded_filename, total_rows, valid_records, duplicate_records, skipped
    );
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES (datetime('now'), 'Investigator', 'INGESTION', 'CSV', 'UPLOAD', $1)"
    )
    .bind(&details)
    .execute(&pool)
    .await;

    let result_obj = json!({
        "filename": uploaded_filename,
        "total_records": total_rows,
        "valid_records": valid_records,
        "duplicate_records": duplicate_records,
        "invalid_records": skipped,
        "new_accounts_created": new_accounts_created,
        "errors_sample": errors_sample
    });

    Ok(Json(json!({
        "status": "success",
        "result": result_obj,
        "total_rows": total_rows,
        "valid_records": valid_records,
        "skipped": skipped,
        "message": format!("Successfully processed {} transactions", valid_records)
    })))
}

async fn load_sample_data(State(pool): State<DbPool>) -> Result<impl IntoResponse, AppError> {
    let sample_csv_paths = [
        "../backend/app/data/sample_transactions.csv",
        "backend/app/data/sample_transactions.csv",
        "app/data/sample_transactions.csv",
    ];

    let mut found_path = None;
    for p in &sample_csv_paths {
        if std::path::Path::new(p).exists() {
            found_path = Some(*p);
            break;
        }
    }

    let csv_path = found_path.ok_or_else(|| {
        AppError::NotFound("Sample transactions CSV file not found on disk".to_string())
    })?;

    let file = std::fs::File::open(csv_path)
        .map_err(|e| AppError::Internal(format!("Failed to open sample CSV: {}", e)))?;
    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);

    let mut tx = pool.begin().await?;
    let mut loaded = 0;

    for result in rdr.records() {
        if let Ok(rec) = result {
            if rec.len() < 4 {
                continue;
            }
            let txn_id = rec.get(0).unwrap_or("").trim().to_string();
            let sender = rec.get(1).unwrap_or("").trim().to_string();
            let receiver = rec.get(2).unwrap_or("").trim().to_string();
            let amount: f64 = match rec.get(3).and_then(|a| a.trim().parse::<f64>().ok()) {
                Some(a) if a > 0.0 && !a.is_nan() && !a.is_infinite() => a,
                _ => continue,
            };
            let timestamp = rec
                .get(4)
                .unwrap_or("2026-10-15 10:00:00")
                .trim()
                .to_string();
            let status = rec.get(5).unwrap_or("COMPLETED").trim().to_string();
            let txn_type = rec.get(6).unwrap_or("IMPS").trim().to_string();
            let is_susp: bool = rec
                .get(7)
                .map(|v| v.trim() == "1" || v.trim().eq_ignore_ascii_case("true"))
                .unwrap_or(false);
            let flag_reason = rec.get(8).map(|s| s.trim().to_string());

            if let Err(e) = sqlx::query("INSERT OR IGNORE INTO accounts (account_id, created_at) VALUES ($1, datetime('now'))")
                .bind(&sender)
                .execute(&mut *tx)
                .await
            {
                let _ = tx.rollback().await;
                return Err(AppError::Internal(format!(
                    "Failed to insert sender account {}: {}. Transaction rolled back.",
                    sender, e
                )));
            }

            if let Err(e) = sqlx::query("INSERT OR IGNORE INTO accounts (account_id, created_at) VALUES ($1, datetime('now'))")
                .bind(&receiver)
                .execute(&mut *tx)
                .await
            {
                let _ = tx.rollback().await;
                return Err(AppError::Internal(format!(
                    "Failed to insert receiver account {}: {}. Transaction rolled back.",
                    receiver, e
                )));
            }

            if let Err(e) = sqlx::query(
                r#"
                INSERT OR REPLACE INTO transactions (transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, is_suspicious, flag_reason)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#
            )
            .bind(&txn_id)
            .bind(&sender)
            .bind(&receiver)
            .bind(amount)
            .bind(&timestamp)
            .bind(&status)
            .bind(&txn_type)
            .bind(if is_susp { 1 } else { 0 })
            .bind(flag_reason)
            .execute(&mut *tx)
            .await
            {
                let _ = tx.rollback().await;
                return Err(AppError::Internal(format!(
                    "Failed to insert sample transaction {}: {}. Transaction rolled back.",
                    txn_id, e
                )));
            }

            loaded += 1;
        }
    }

    // Also load sample complaints if present, identifying columns by header names
    let complaint_csv_paths = [
        "../backend/app/data/sample_complaints.csv",
        "backend/app/data/sample_complaints.csv",
        "app/data/sample_complaints.csv",
    ];
    for cp in &complaint_csv_paths {
        if std::path::Path::new(cp).exists() {
            if let Ok(c_file) = std::fs::File::open(cp) {
                let mut c_rdr = csv::ReaderBuilder::new()
                    .has_headers(true)
                    .from_reader(c_file);
                let headers = c_rdr.headers().ok().cloned().unwrap_or_default();
                let h_map: std::collections::HashMap<String, usize> = headers
                    .iter()
                    .enumerate()
                    .map(|(i, h)| (h.trim().to_lowercase(), i))
                    .collect();

                let rep_col = h_map
                    .get("reported_account_id")
                    .or_else(|| h_map.get("reported_account"))
                    .or_else(|| h_map.get("account_id"))
                    .or_else(|| h_map.get("reported_acc"))
                    .copied();
                let amt_col = h_map
                    .get("amount_lost")
                    .or_else(|| h_map.get("amount"))
                    .or_else(|| h_map.get("loss_amount"))
                    .or_else(|| h_map.get("fraud_amount"))
                    .copied();

                let (rep_col, amt_col) = match (rep_col, amt_col) {
                    (Some(r), Some(a)) => (r, a),
                    _ => {
                        tracing::warn!(
                            "Sample complaints CSV at '{}' missing recognized header ('reported_account_id' / 'amount_lost'); skipping complaint import",
                            cp
                        );
                        break;
                    }
                };

                let cid_col = h_map
                    .get("complaint_id")
                    .or_else(|| h_map.get("id"))
                    .copied();
                let date_col = h_map
                    .get("date_reported")
                    .or_else(|| h_map.get("date"))
                    .copied();
                let name_col = h_map
                    .get("complainant_name")
                    .or_else(|| h_map.get("name"))
                    .copied();
                let desc_col = h_map
                    .get("description")
                    .or_else(|| h_map.get("desc"))
                    .copied();

                for c_res in c_rdr.records() {
                    let crec = match c_res {
                        Ok(r) => r,
                        Err(e) => {
                            tracing::warn!("Skipping unparseable complaint record: {}", e);
                            continue;
                        }
                    };

                    if crec.len() > rep_col && crec.len() > amt_col {
                        let cid = cid_col
                            .and_then(|c| crec.get(c))
                            .unwrap_or_else(|| crec.get(0).unwrap_or(""))
                            .trim()
                            .to_string();
                        let date_rep = date_col
                            .and_then(|c| crec.get(c))
                            .unwrap_or_else(|| crec.get(1).unwrap_or(""))
                            .trim()
                            .to_string();
                        let cname = name_col
                            .and_then(|c| crec.get(c))
                            .unwrap_or_else(|| crec.get(2).unwrap_or(""))
                            .trim()
                            .to_string();
                        let desc = desc_col
                            .and_then(|c| crec.get(c))
                            .unwrap_or_else(|| crec.get(3).unwrap_or(""))
                            .trim()
                            .to_string();
                        let rep_acc = crec.get(rep_col).unwrap_or("").trim().to_uppercase();

                        let amt_str = crec.get(amt_col).unwrap_or("").trim();
                        let amt: f64 = match amt_str.parse::<f64>() {
                            Ok(v) if v > 0.0 && !v.is_nan() && !v.is_infinite() => v,
                            _ => {
                                // Invalid complaint amounts must not silently become zero
                                continue;
                            }
                        };

                        if !cid.is_empty() && !rep_acc.is_empty() {
                            if let Err(e) = sqlx::query(
                                r#"
                                INSERT OR REPLACE INTO complaints (complaint_id, date_reported, complainant_name, description, reported_account_id, amount_lost, status, source, created_at)
                                VALUES ($1, $2, $3, $4, $5, $6, 'New', 'National Cyber Crime Portal', datetime('now'))
                                "#
                            )
                            .bind(&cid)
                            .bind(&date_rep)
                            .bind(&cname)
                            .bind(&desc)
                            .bind(&rep_acc)
                            .bind(amt)
                            .execute(&mut *tx)
                            .await
                            {
                                let _ = tx.rollback().await;
                                tracing::error!("Failed to insert sample complaint: {}", e);
                                return Err(AppError::Internal(format!(
                                    "Failed to insert sample complaint {}: {}. Transaction rolled back.",
                                    cid, e
                                )));
                            }
                        }
                    }
                }
            }
            break;
        }
    }

    // Update account metrics atomically within the transaction
    if let Err(e) = sqlx::query(
        r#"
        UPDATE accounts SET
            total_incoming = (SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE receiver_account = accounts.account_id),
            total_outgoing = (SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE sender_account = accounts.account_id),
            in_degree = (SELECT COUNT(DISTINCT sender_account) FROM transactions WHERE receiver_account = accounts.account_id),
            out_degree = (SELECT COUNT(DISTINCT receiver_account) FROM transactions WHERE sender_account = accounts.account_id),
            unique_counterparties = (
                SELECT COUNT(DISTINCT counterparty) FROM (
                    SELECT sender_account AS counterparty FROM transactions WHERE receiver_account = accounts.account_id
                    UNION
                    SELECT receiver_account AS counterparty FROM transactions WHERE sender_account = accounts.account_id
                )
            );
        "#
    )
    .execute(&mut *tx)
    .await
    {
        let _ = tx.rollback().await;
        return Err(AppError::Internal(format!(
            "Failed to update account graph metrics during sample data loading: {}. Transaction rolled back.",
            e
        )));
    }

    if let Err(e) = sqlx::query(
        r#"
        UPDATE accounts SET
            turnover_ratio = total_outgoing / (total_incoming + 1.0)
        WHERE total_incoming > 0;
        "#,
    )
    .execute(&mut *tx)
    .await
    {
        let _ = tx.rollback().await;
        return Err(AppError::Internal(format!(
            "Failed to update account turnover ratios during sample data loading: {}. Transaction rolled back.",
            e
        )));
    }

    // Commit atomic transaction
    tx.commit().await?;

    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES (datetime('now'), 'Investigator', 'LOAD_SAMPLE', 'DATASET', 'SYNTHETIC', $1)"
    )
    .bind(format!("Loaded bundled synthetic demonstration network: {} transactions.", loaded))
    .execute(&pool)
    .await;

    let result_obj = json!({
        "filename": "sample_transactions.csv (Synthetic Fraud Network)",
        "total_records": loaded,
        "valid_records": loaded,
        "duplicate_records": 0,
        "invalid_records": 0,
        "new_accounts_created": 74,
        "errors_sample": []
    });

    Ok(Json(json!({
        "status": "success",
        "result": result_obj,
        "message": "Sample financial transaction network loaded successfully",
        "valid_records": loaded
    })))
}

async fn get_transactions_summary(
    State(pool): State<DbPool>,
) -> Result<impl IntoResponse, AppError> {
    let total_txns: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM transactions")
        .fetch_one(&pool)
        .await?;
    let total_volume: f64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(amount), 0.0) FROM transactions")
            .fetch_one(&pool)
            .await?;
    let suspicious_txns: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM transactions WHERE is_suspicious = 1")
            .fetch_one(&pool)
            .await?;
    let suspicious_volume: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE is_suspicious = 1",
    )
    .fetch_one(&pool)
    .await?;

    let avg_amount = if total_txns > 0 {
        total_volume / (total_txns as f64)
    } else {
        0.0
    };

    #[derive(sqlx::FromRow)]
    struct ChannelRow {
        channel: Option<String>,
        count: i64,
        volume: Option<f64>,
    }
    let channels = sqlx::query_as::<_, ChannelRow>(
        "SELECT transaction_type as channel, COUNT(*) as count, SUM(amount) as volume FROM transactions GROUP BY transaction_type"
    )
    .fetch_all(&pool)
    .await?;

    let channel_breakdown: Vec<serde_json::Value> = channels
        .into_iter()
        .map(|c| {
            json!({
                "channel": c.channel.unwrap_or_else(|| "Other".to_string()),
                "count": c.count,
                "volume": c.volume.unwrap_or(0.0)
            })
        })
        .collect();

    Ok(Json(json!({
        "total_transactions": total_txns,
        "total_volume_inr": total_volume,
        "suspicious_transactions": suspicious_txns,
        "suspicious_volume_inr": suspicious_volume,
        "average_transaction_amount": avg_amount,
        "channel_breakdown": channel_breakdown
    })))
}

async fn get_related_transactions(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let txn = sqlx::query_as::<_, Transaction>(
        "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE transaction_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Transaction {} not found", id)))?;

    let related = sqlx::query_as::<_, Transaction>(
        "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE (sender_account = $1 OR receiver_account = $1 OR sender_account = $2 OR receiver_account = $2) AND transaction_id != $3 ORDER BY timestamp DESC LIMIT 25"
    )
    .bind(&txn.sender_account)
    .bind(&txn.receiver_account)
    .bind(&id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(json!({
        "primary_transaction": txn,
        "related_count": related.len(),
        "related_transactions": related
    })))
}

pub async fn update_account_graph_metrics(pool: &DbPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE accounts SET
            total_incoming = (SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE receiver_account = accounts.account_id),
            total_outgoing = (SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE sender_account = accounts.account_id),
            in_degree = (SELECT COUNT(DISTINCT sender_account) FROM transactions WHERE receiver_account = accounts.account_id),
            out_degree = (SELECT COUNT(DISTINCT receiver_account) FROM transactions WHERE sender_account = accounts.account_id),
            unique_counterparties = (
                SELECT COUNT(DISTINCT counterparty) FROM (
                    SELECT sender_account AS counterparty FROM transactions WHERE receiver_account = accounts.account_id
                    UNION
                    SELECT receiver_account AS counterparty FROM transactions WHERE sender_account = accounts.account_id
                )
            );
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        UPDATE accounts SET
            turnover_ratio = total_outgoing / (total_incoming + 1.0)
        WHERE total_incoming > 0;
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
