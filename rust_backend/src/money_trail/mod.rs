use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{HashMap, HashSet, VecDeque};

use crate::{
    database::DbPool,
    errors::AppError,
    models::{account::Account, transaction::Transaction},
};

#[derive(Debug, Deserialize)]
pub struct MoneyTrailParams {
    pub max_hops: Option<usize>,
    pub account_id: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct AnalyzeMoneyTrailRequest {
    #[serde(alias = "start_account", default)]
    pub source_account: String,
    #[serde(alias = "dest_account", default)]
    pub destination_account: Option<String>,
    pub target_account: Option<String>,
    pub transaction_id: Option<String>,
    pub max_hops: Option<usize>,
    pub min_amount: Option<f64>,
    pub max_amount: Option<f64>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub direction: Option<String>, // "BOTH", "INBOUND", "OUTBOUND"
    pub suspicious_only: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SaveTrailToCaseRequest {
    pub case_id: Option<String>,
    pub new_case_title: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SavedMoneyTrail {
    pub trail_id: String,
    pub target_account: String,
    pub inbound_hops_json: Option<String>,
    pub outbound_hops_json: Option<String>,
    pub total_inbound: Option<f64>,
    pub total_outbound: Option<f64>,
    pub summary: Option<String>,
    pub paths_json: Option<String>,
    pub patterns_json: Option<String>,
    pub report_json: Option<String>,
    pub created_at: String,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/trace", get(trace_money_trail))
        .route("/analyze", post(analyze_money_trail_handler))
        .route("/", post(analyze_money_trail_handler))
        .route("/saved", get(list_saved_trails))
        .route("/:id", get(get_money_trail_handler))
        .route("/:id/transactions", get(get_trail_transactions))
        .route("/:id/save-to-case", post(save_trail_to_case_handler))
        .route("/:id/report", get(get_trail_report_handler))
        .with_state(pool)
}

pub fn investigations_router(pool: DbPool) -> Router {
    Router::new()
        .route("/money-trails", post(analyze_money_trail_handler))
        .route("/money-trails/:id", get(get_money_trail_handler))
        .route(
            "/money-trails/:id/save-to-case",
            post(save_trail_to_case_handler),
        )
        .route("/money-trails/:id/report", get(get_trail_report_handler))
        .with_state(pool)
}

async fn list_saved_trails(State(pool): State<DbPool>) -> Result<impl IntoResponse, AppError> {
    let trails = sqlx::query_as::<_, SavedMoneyTrail>(
        "SELECT trail_id, target_account, inbound_hops_json, outbound_hops_json, total_inbound, total_outbound, summary, paths_json, patterns_json, report_json, created_at FROM money_trails ORDER BY created_at DESC LIMIT 50"
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(json!({
        "total": trails.len(),
        "trails": trails
    })))
}

async fn trace_money_trail(
    State(pool): State<DbPool>,
    Query(params): Query<MoneyTrailParams>,
) -> Result<impl IntoResponse, AppError> {
    let account_id = params
        .account_id
        .clone()
        .ok_or_else(|| AppError::BadRequest("Missing account_id query parameter".to_string()))?;
    let req = AnalyzeMoneyTrailRequest {
        source_account: account_id,
        destination_account: None,
        target_account: None,
        transaction_id: None,
        max_hops: params.max_hops,
        min_amount: None,
        max_amount: None,
        start_date: None,
        end_date: None,
        direction: Some("BOTH".to_string()),
        suspicious_only: None,
    };
    let result = run_money_trail_analysis(&pool, &req).await?;
    Ok(Json(result))
}

async fn get_money_trail_handler(
    State(pool): State<DbPool>,
    Path(account_or_trail_id): Path<String>,
    Query(params): Query<MoneyTrailParams>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Check if ID exists in saved money_trails table
    let saved = sqlx::query_as::<_, SavedMoneyTrail>(
        "SELECT trail_id, target_account, inbound_hops_json, outbound_hops_json, total_inbound, total_outbound, summary, paths_json, patterns_json, report_json, created_at FROM money_trails WHERE trail_id = $1"
    )
    .bind(&account_or_trail_id)
    .fetch_optional(&pool)
    .await?;

    if let Some(s) = saved {
        if let Some(rep) = s
            .report_json
            .as_deref()
            .and_then(|str_val| serde_json::from_str::<serde_json::Value>(str_val).ok())
        {
            return Ok(Json(rep));
        }
    }

    // 2. Otherwise run live trace on the account
    let max_hops = params.max_hops.unwrap_or(4);
    let req = AnalyzeMoneyTrailRequest {
        source_account: account_or_trail_id,
        destination_account: None,
        target_account: None,
        transaction_id: None,
        max_hops: Some(max_hops),
        min_amount: None,
        max_amount: None,
        start_date: None,
        end_date: None,
        direction: Some("BOTH".to_string()),
        suspicious_only: None,
    };

    let result = run_money_trail_analysis(&pool, &req).await?;
    Ok(Json(result))
}

async fn analyze_money_trail_handler(
    State(pool): State<DbPool>,
    Json(mut payload): Json<AnalyzeMoneyTrailRequest>,
) -> Result<impl IntoResponse, AppError> {
    if payload.source_account.trim().is_empty() {
        if let Some(ref t) = payload.target_account {
            if !t.trim().is_empty() {
                payload.source_account = t.trim().to_uppercase();
            }
        }
    }

    if payload.source_account.trim().is_empty() {
        if let Some(ref txn_id) = payload.transaction_id {
            let txn_opt = sqlx::query_as::<_, Transaction>(
                "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE transaction_id = $1"
            )
            .bind(txn_id.trim())
            .fetch_optional(&pool)
            .await?;

            if let Some(txn) = txn_opt {
                payload.source_account = txn.sender_account;
                if payload.destination_account.is_none() {
                    payload.destination_account = Some(txn.receiver_account);
                }
            }
        }
    }

    if payload.source_account.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Please specify a starting account ID or transaction ID to trace.".to_string(),
        ));
    }

    let result = run_money_trail_analysis(&pool, &payload).await?;
    Ok(Json(result))
}

async fn run_money_trail_analysis(
    pool: &DbPool,
    req: &AnalyzeMoneyTrailRequest,
) -> Result<serde_json::Value, AppError> {
    let source_account = req.source_account.trim().to_uppercase();
    let dest_account = req
        .destination_account
        .as_ref()
        .map(|s| s.trim().to_uppercase());
    let max_hops = req.max_hops.unwrap_or(4).min(6).max(1);
    let min_amt = req.min_amount.unwrap_or(0.0);
    let max_amt = req.max_amount.unwrap_or(1_000_000_000.0);
    let direction = req.direction.as_deref().unwrap_or("BOTH").to_uppercase();
    let suspicious_only = req.suspicious_only.unwrap_or(false);

    let trail_id = format!(
        "TRL-{}",
        uuid::Uuid::new_v4().to_string().replace("-", "")[..8].to_uppercase()
    );
    let now = Utc::now().to_rfc3339();

    // Verify source account exists in accounts or has transactions in the database
    let src_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM accounts WHERE account_id = $1)")
            .bind(&source_account)
            .fetch_one(pool)
            .await?;

    if !src_exists {
        let src_tx_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM transactions WHERE sender_account = $1 OR receiver_account = $1)"
        )
        .bind(&source_account)
        .fetch_one(pool)
        .await?;

        if !src_tx_exists {
            return Err(AppError::NotFound(format!(
                "Account {} not found in financial records",
                source_account
            )));
        }
    }

    // Query relevant transactions and build graph elements
    let mut txns_map: HashMap<String, Transaction> = HashMap::new();
    let mut candidate_paths: Vec<serde_json::Value> = Vec::new();
    let mut backward_steps: Vec<serde_json::Value> = Vec::new();
    let mut forward_steps: Vec<serde_json::Value> = Vec::new();
    let mut inbound_hops: Vec<serde_json::Value> = Vec::new();
    let mut outbound_hops: Vec<serde_json::Value> = Vec::new();

    let mut inflow_source_nodes: HashSet<String> = HashSet::new();
    let mut outflow_destination_nodes: HashSet<String> = HashSet::new();

    // Traversal tracking
    let mut visited_accounts: HashSet<String> = HashSet::new();
    visited_accounts.insert(source_account.clone());

    // 1. INBOUND / BACKWARD TRACE (Funding Sources)
    let mut total_inbound_volume = 0.0;
    if direction == "INBOUND" || direction == "BOTH" {
        let mut in_queue: VecDeque<(String, usize, Vec<String>)> = VecDeque::new();
        in_queue.push_back((source_account.clone(), 1, vec![source_account.clone()]));
        let mut in_visited: HashSet<String> = HashSet::new();
        in_visited.insert(source_account.clone());
        let mut seen_in_txns: HashSet<String> = HashSet::new();

        while let Some((curr, hop, path_accs)) = in_queue.pop_front() {
            if hop > max_hops {
                continue;
            }

            let mut query_str = String::from(
                "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE receiver_account = $1 AND amount >= $2 AND amount <= $3"
            );
            if suspicious_only {
                query_str.push_str(" AND is_suspicious = 1");
            }
            if let Some(ref s_date) = req.start_date {
                query_str.push_str(&format!(" AND timestamp >= '{}'", s_date));
            }
            if let Some(ref e_date) = req.end_date {
                query_str.push_str(&format!(" AND timestamp <= '{}'", e_date));
            }
            query_str.push_str(" ORDER BY timestamp DESC LIMIT 30");

            let upstream = sqlx::query_as::<_, Transaction>(&query_str)
                .bind(&curr)
                .bind(min_amt)
                .bind(max_amt)
                .fetch_all(pool)
                .await?;

            for t in upstream {
                if seen_in_txns.insert(t.transaction_id.clone()) {
                    total_inbound_volume += t.amount;
                    if t.sender_account != source_account {
                        inflow_source_nodes.insert(t.sender_account.clone());
                    }
                    visited_accounts.insert(t.sender_account.clone());
                    txns_map.insert(t.transaction_id.clone(), t.clone());

                    let ttype = t.transaction_type.as_deref().unwrap_or("UPI");
                    let ts = t.timestamp.as_deref().unwrap_or("");
                    let is_susp = t.is_suspicious.unwrap_or(false);

                    inbound_hops.push(json!({
                        "hop_level": hop,
                        "direction": "INBOUND",
                        "source_account": t.sender_account,
                        "destination_account": t.receiver_account,
                        "amount": t.amount,
                        "timestamp": ts,
                        "transaction_type": ttype,
                        "is_suspicious": is_susp
                    }));

                    backward_steps.push(json!({
                        "hop": hop,
                        "sender": t.sender_account,
                        "receiver": t.receiver_account,
                        "amount": t.amount,
                        "timestamp": ts,
                        "transaction_id": t.transaction_id,
                        "type": ttype,
                        "is_suspicious": is_susp
                    }));

                    let mut next_path = path_accs.clone();
                    next_path.insert(0, t.sender_account.clone());

                    if in_visited.insert(t.sender_account.clone()) && hop < max_hops {
                        in_queue.push_back((t.sender_account, hop + 1, next_path));
                    }
                }
            }
        }
    }

    // 2. FORWARD / OUTBOUND TRACE (Layering & Cash-out identification)
    let mut total_outbound_volume = 0.0;
    if direction == "OUTBOUND" || direction == "BOTH" {
        let mut out_queue: VecDeque<(String, usize, Vec<String>)> = VecDeque::new();
        out_queue.push_back((source_account.clone(), 1, vec![source_account.clone()]));
        let mut out_visited: HashSet<String> = HashSet::new();
        out_visited.insert(source_account.clone());
        let mut seen_out_txns: HashSet<String> = HashSet::new();

        while let Some((curr, hop, path_accs)) = out_queue.pop_front() {
            if hop > max_hops {
                continue;
            }

            let mut query_str = String::from(
                "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE sender_account = $1 AND amount >= $2 AND amount <= $3"
            );
            if suspicious_only {
                query_str.push_str(" AND is_suspicious = 1");
            }
            if let Some(ref s_date) = req.start_date {
                query_str.push_str(&format!(" AND timestamp >= '{}'", s_date));
            }
            if let Some(ref e_date) = req.end_date {
                query_str.push_str(&format!(" AND timestamp <= '{}'", e_date));
            }
            query_str.push_str(" ORDER BY timestamp ASC LIMIT 30");

            let downstream = sqlx::query_as::<_, Transaction>(&query_str)
                .bind(&curr)
                .bind(min_amt)
                .bind(max_amt)
                .fetch_all(pool)
                .await?;

            for t in downstream {
                if seen_out_txns.insert(t.transaction_id.clone()) {
                    total_outbound_volume += t.amount;
                    if t.receiver_account != source_account {
                        outflow_destination_nodes.insert(t.receiver_account.clone());
                    }
                    visited_accounts.insert(t.receiver_account.clone());
                    txns_map.insert(t.transaction_id.clone(), t.clone());

                    let ttype = t.transaction_type.as_deref().unwrap_or("IMPS");
                    let ts = t.timestamp.as_deref().unwrap_or("");
                    let is_susp = t.is_suspicious.unwrap_or(false);

                    outbound_hops.push(json!({
                        "hop_level": hop,
                        "direction": "OUTBOUND",
                        "source_account": t.sender_account,
                        "destination_account": t.receiver_account,
                        "amount": t.amount,
                        "timestamp": ts,
                        "transaction_type": ttype,
                        "is_suspicious": is_susp
                    }));

                    forward_steps.push(json!({
                        "hop": hop,
                        "sender": t.sender_account,
                        "receiver": t.receiver_account,
                        "amount": t.amount,
                        "timestamp": ts,
                        "transaction_id": t.transaction_id,
                        "type": ttype,
                        "is_suspicious": is_susp
                    }));

                    let mut next_path = path_accs.clone();
                    next_path.push(t.receiver_account.clone());

                    if let Some(ref target) = dest_account {
                        if &t.receiver_account == target {
                            candidate_paths.push(build_path_json(
                                format!("PATH-OUT-{}", candidate_paths.len() + 1),
                                &next_path,
                                &txns_map,
                            ));
                        }
                    } else if next_path.len() >= 2 {
                        candidate_paths.push(build_path_json(
                            format!("PATH-{}", candidate_paths.len() + 1),
                            &next_path,
                            &txns_map,
                        ));
                    }

                    if out_visited.insert(t.receiver_account.clone()) && hop < max_hops {
                        out_queue.push_back((t.receiver_account, hop + 1, next_path));
                    }
                }
            }
        }
    }

    if candidate_paths.len() > 15 {
        candidate_paths.truncate(15);
    }

    // Fetch account metadata from the database for all visited accounts
    let mut nodes_json = Vec::new();
    let mut graph_elements = Vec::new();

    for acc_id in &visited_accounts {
        let acc_opt = sqlx::query_as::<_, Account>(
            "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
        )
        .bind(acc_id)
        .fetch_optional(pool)
        .await?;

        let is_src = acc_id == &source_account;
        let is_dst = dest_account.as_ref().map_or(false, |d| d == acc_id);

        let role = if is_src {
            "TARGET_SUBJECT"
        } else if inflow_source_nodes.contains(acc_id) {
            "SOURCE_ORIGIN"
        } else if outflow_destination_nodes.contains(acc_id) {
            "DESTINATION_DRAIN"
        } else {
            "INTERMEDIARY"
        };

        let (
            risk_score,
            risk_level,
            customer_name,
            total_incoming,
            total_outgoing,
            in_degree,
            out_degree,
            turnover_ratio,
        ) = if let Some(acc) = acc_opt {
            let s = acc.risk_score.unwrap_or(0.0);
            let l = acc.risk_level.unwrap_or_else(|| {
                if s >= 0.70 {
                    "High".to_string()
                } else if s >= 0.40 {
                    "Medium".to_string()
                } else {
                    "Low".to_string()
                }
            });
            (
                s,
                l,
                acc.customer_name.unwrap_or_else(|| acc.account_id.clone()),
                acc.total_incoming.unwrap_or(0.0),
                acc.total_outgoing.unwrap_or(0.0),
                acc.in_degree.unwrap_or(0),
                acc.out_degree.unwrap_or(0),
                acc.turnover_ratio.unwrap_or(0.0),
            )
        } else {
            // External accounts not indexed in accounts table: safe defaults, not fabricated values
            (0.0, "Low".to_string(), acc_id.clone(), 0.0, 0.0, 0, 0, 0.0)
        };

        let node_data = json!({
            "id": acc_id,
            "label": acc_id,
            "customer_name": customer_name,
            "role": role,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "total_incoming": total_incoming,
            "total_outgoing": total_outgoing,
            "in_degree": in_degree,
            "out_degree": out_degree,
            "turnover_ratio": turnover_ratio,
            "is_source": is_src,
            "is_target": is_dst,
            "is_center": is_src
        });

        let node_el = json!({
            "group": "nodes",
            "data": node_data
        });
        nodes_json.push(node_el.clone());
        graph_elements.push(node_el);
    }

    // Add edges to graph elements
    let mut edges_json = Vec::new();
    for t in txns_map.values() {
        let edge_el = json!({
            "group": "edges",
            "data": {
                "id": t.transaction_id,
                "source": t.sender_account,
                "target": t.receiver_account,
                "amount": t.amount,
                "weight": t.amount,
                "timestamp": t.timestamp.as_deref().unwrap_or(""),
                "transaction_type": t.transaction_type.as_deref().unwrap_or("TRANSFER"),
                "is_suspicious": t.is_suspicious.unwrap_or(false),
                "flag_reason": t.flag_reason.as_deref().unwrap_or("")
            }
        });
        edges_json.push(edge_el.clone());
        graph_elements.push(edge_el);
    }

    // 3. Chronological timeline with elapsed time intervals
    let mut timeline_txns: Vec<Transaction> = txns_map.values().cloned().collect();
    timeline_txns.sort_by(|a, b| {
        a.timestamp
            .as_deref()
            .unwrap_or("")
            .cmp(&b.timestamp.as_deref().unwrap_or(""))
    });

    let mut chronological_timeline = Vec::new();
    let mut prev_time: Option<DateTime<Utc>> = None;

    for t in &timeline_txns {
        let curr_time = t.timestamp.as_deref().and_then(|ts| {
            DateTime::parse_from_rfc3339(ts)
                .ok()
                .map(|d| d.with_timezone(&Utc))
                .or_else(|| {
                    chrono::NaiveDateTime::parse_from_str(ts, "%Y-%m-%d %H:%M:%S")
                        .ok()
                        .map(|dt| DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
                })
        });

        let elapsed_str = match (prev_time, curr_time) {
            (Some(prev), Some(curr)) => {
                let diff_sec = (curr - prev).num_seconds();
                if diff_sec < 0 {
                    "Prior Step".to_string()
                } else if diff_sec < 60 {
                    format!("+ {}s", diff_sec)
                } else if diff_sec < 3600 {
                    format!("+ {}m", diff_sec / 60)
                } else if diff_sec < 86400 {
                    format!("+ {}h {}m", diff_sec / 3600, (diff_sec % 3600) / 60)
                } else {
                    format!("+ {}d", diff_sec / 86400)
                }
            }
            _ => "Initial Step".to_string(),
        };

        if curr_time.is_some() {
            prev_time = curr_time;
        }

        chronological_timeline.push(json!({
            "transaction_id": t.transaction_id,
            "sender": t.sender_account,
            "receiver": t.receiver_account,
            "amount": t.amount,
            "timestamp": t.timestamp.as_deref().unwrap_or(""),
            "elapsed_time": elapsed_str,
            "transaction_type": t.transaction_type.as_deref().unwrap_or("TRANSFER"),
            "is_suspicious": t.is_suspicious.unwrap_or(false)
        }));
    }

    // 4. Suspicious Pattern Detection
    let mut detected_patterns = Vec::new();

    // Pattern 1: Rapid Pass-Through (Turnover ~ 100%)
    let mut in_by_acc: HashMap<String, f64> = HashMap::new();
    let mut out_by_acc: HashMap<String, f64> = HashMap::new();
    for t in &timeline_txns {
        *out_by_acc.entry(t.sender_account.clone()).or_insert(0.0) += t.amount;
        *in_by_acc.entry(t.receiver_account.clone()).or_insert(0.0) += t.amount;
    }

    let mut rapid_count = 0;
    for (acc, in_amt) in &in_by_acc {
        if let Some(&out_amt) = out_by_acc.get(acc) {
            let turnover = out_amt / in_amt.max(1.0);
            if turnover >= 0.85 && turnover <= 1.15 {
                rapid_count += 1;
                detected_patterns.push(json!({
                    "pattern": "RAPID_PASS_THROUGH",
                    "title": "Rapid Conduit Pass-Through",
                    "account": acc,
                    "confidence": 0.88,
                    "severity": "HIGH",
                    "description": format!(
                        "Account {} recorded incoming transfers of INR {:.2} and subsequent outgoing transfers of INR {:.2} ({:.1}% turnover volume).",
                        acc, in_amt, out_amt, turnover * 100.0
                    ),
                    "evidence_note": "A short interval between inbound and outbound transactions demonstrates velocity and turnover, but fungible balance flows do not by themselves establish that identical currency units were forwarded."
                }));
            }
        }
    }

    // Pattern 2: Fan-In (Smurfing Aggregation)
    let mut in_senders_by_acc: HashMap<String, HashSet<String>> = HashMap::new();
    for t in &timeline_txns {
        in_senders_by_acc
            .entry(t.receiver_account.clone())
            .or_default()
            .insert(t.sender_account.clone());
    }
    for (acc, senders) in in_senders_by_acc {
        if senders.len() >= 3 {
            detected_patterns.push(json!({
                "pattern": "FAN_IN_AGGREGATION",
                "title": "Fan-In Smurfing Aggregation",
                "account": acc,
                "confidence": 0.88,
                "severity": "HIGH",
                "description": format!("Account {} funnels inward funds from {} distinct originating accounts.", acc, senders.len())
            }));
        }
    }

    // Pattern 3: Fan-Out (Dispersion)
    let mut out_receivers_by_acc: HashMap<String, HashSet<String>> = HashMap::new();
    for t in &timeline_txns {
        out_receivers_by_acc
            .entry(t.sender_account.clone())
            .or_default()
            .insert(t.receiver_account.clone());
    }
    for (acc, receivers) in out_receivers_by_acc {
        if receivers.len() >= 3 {
            detected_patterns.push(json!({
                "pattern": "FAN_OUT_DISPERSION",
                "title": "Fan-Out Rapid Dispersion",
                "account": acc,
                "confidence": 0.85,
                "severity": "MEDIUM",
                "description": format!("Account {} disperses outward funds to {} distinct recipient entities.", acc, receivers.len())
            }));
        }
    }

    // Pattern 4: Circular Flow / Layering Ring
    let has_loop = timeline_txns.iter().any(|t1| {
        timeline_txns.iter().any(|t2| {
            t1.sender_account == t2.receiver_account && t1.receiver_account == t2.sender_account
        })
    });
    if has_loop {
        detected_patterns.push(json!({
            "pattern": "CIRCULAR_FLOW",
            "title": "Circular Transfer Loop",
            "account": source_account,
            "confidence": 0.95,
            "severity": "CRITICAL",
            "description": "Observed mutual or circular transfer relationships returning funds along previous accounts."
        }));
    }

    // Pattern 5: High Layering Depth
    let in_depth = inbound_hops
        .iter()
        .map(|h| h["hop_level"].as_u64().unwrap_or(0))
        .max()
        .unwrap_or(0);
    let out_depth = outbound_hops
        .iter()
        .map(|h| h["hop_level"].as_u64().unwrap_or(0))
        .max()
        .unwrap_or(0);
    let layering_depth = in_depth + out_depth;

    if layering_depth >= 3 {
        detected_patterns.push(json!({
            "pattern": "DEEP_LAYERING",
            "title": "Multi-Hop Layering Evasion",
            "account": source_account,
            "confidence": 0.89,
            "severity": "HIGH",
            "description": format!("Transaction chain extends across {} layering hops to obscure audit trail.", layering_depth)
        }));
    }

    let total_flow = ((total_inbound_volume + total_outbound_volume) * 100.0).round() / 100.0;
    let accounts_examined = visited_accounts.len();
    let transactions_examined = txns_map.len();

    let earliest_time = chronological_timeline
        .first()
        .and_then(|t| t["timestamp"].as_str())
        .unwrap_or("");
    let latest_time = chronological_timeline
        .last()
        .and_then(|t| t["timestamp"].as_str())
        .unwrap_or("");

    let is_potential_conduit =
        !inflow_source_nodes.is_empty() && !outflow_destination_nodes.is_empty();

    let investigation_summary = json!({
        "trail_id": trail_id,
        "source_account": source_account,
        "destination_account": dest_account,
        "accounts_examined": accounts_examined,
        "transactions_examined": transactions_examined,
        "candidate_paths_count": candidate_paths.len(),
        "total_inbound_volume": (total_inbound_volume * 100.0).round() / 100.0,
        "total_outbound_volume": (total_outbound_volume * 100.0).round() / 100.0,
        "total_flow_volume": total_flow,
        "volume_disclaimer": "Total flow volume represents the cumulative sum of recorded transfers in the analyzed graph slice, not unique traceable money.",
        "layering_depth": layering_depth,
        "time_range": {
            "earliest": earliest_time,
            "latest": latest_time
        },
        "model_version": "GraphSAGE Multi-Task v2.0 (PyG + PyTorch)",
        "graph_engine": "Directed Cytoscape BFS/DFS",
        "generated_at": now
    });

    let layering_analysis = json!({
        "is_potential_conduit": is_potential_conduit,
        "total_inflow_nodes": inflow_source_nodes.len(),
        "total_outflow_nodes": outflow_destination_nodes.len(),
        "detected_layering_hops": layering_depth
    });

    let summary_str = format!(
        "Traced {} inbound transactions (₹{:.2}) and {} outbound flows (₹{:.2}) across {} hops.",
        inbound_hops.len(),
        total_inbound_volume,
        outbound_hops.len(),
        total_outbound_volume,
        layering_depth
    );

    let response_data = json!({
        "trail_id": trail_id,
        "target_account": source_account,
        "account_id": source_account,
        "source_account": source_account,
        "destination_account": dest_account,
        "total_inbound_volume": (total_inbound_volume * 100.0).round() / 100.0,
        "total_outbound_volume": (total_outbound_volume * 100.0).round() / 100.0,
        "layering_depth": layering_depth,
        "max_hops_configured": max_hops,
        "layering_analysis": layering_analysis,
        "investigation_summary": investigation_summary,
        "candidate_paths": candidate_paths,
        "chronological_timeline": chronological_timeline,
        "suspicious_patterns": detected_patterns,
        "backward_steps": backward_steps,
        "forward_steps": forward_steps,
        "inbound_hops": inbound_hops,
        "outbound_hops": outbound_hops,
        "graph": {
            "nodes": nodes_json,
            "edges": edges_json,
            "elements": graph_elements
        },
        "summary": summary_str,
        "created_at": now,
        "status": "COMPLETED"
    });

    // Persist to money_trails table
    let in_json = serde_json::to_string(&backward_steps).unwrap_or_default();
    let out_json = serde_json::to_string(&forward_steps).unwrap_or_default();
    let paths_json_str = serde_json::to_string(&candidate_paths).unwrap_or_default();
    let patterns_json_str = serde_json::to_string(&detected_patterns).unwrap_or_default();
    let report_json_str = serde_json::to_string(&response_data).unwrap_or_default();

    let _ = sqlx::query(
        r#"
        INSERT INTO money_trails (
            trail_id, target_account, inbound_hops_json, outbound_hops_json,
            total_inbound, total_outbound, summary, paths_json, patterns_json, report_json, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#
    )
    .bind(&trail_id)
    .bind(&source_account)
    .bind(&in_json)
    .bind(&out_json)
    .bind(total_inbound_volume)
    .bind(total_outbound_volume)
    .bind(&summary_str)
    .bind(&paths_json_str)
    .bind(&patterns_json_str)
    .bind(&report_json_str)
    .bind(&now)
    .execute(pool)
    .await;

    // Record audit event
    let audit_details = format!(
        "Analyzed money trail for {} (examined {} accs, {} txns, INR {:.2})",
        source_account, accounts_examined, transactions_examined, total_flow
    );
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES ($1, 'Investigator', 'MONEY_TRAIL_ANALYZED', 'ACCOUNT', $2, $3)"
    )
    .bind(&now)
    .bind(&source_account)
    .bind(&audit_details)
    .execute(pool)
    .await;

    Ok(response_data)
}

fn build_path_json(
    path_id: String,
    accounts: &[String],
    txns_map: &HashMap<String, Transaction>,
) -> serde_json::Value {
    let mut total_val = 0.0;
    let mut supporting_txn_ids = Vec::new();
    let mut supporting_txns = Vec::new();
    let mut earliest: Option<String> = None;
    let mut latest: Option<String> = None;

    for i in 0..accounts.len().saturating_sub(1) {
        let u = &accounts[i];
        let v = &accounts[i + 1];

        if let Some(t) = txns_map
            .values()
            .find(|tx| &tx.sender_account == u && &tx.receiver_account == v)
        {
            total_val += t.amount;
            supporting_txn_ids.push(t.transaction_id.clone());
            supporting_txns.push(json!({
                "transaction_id": t.transaction_id,
                "sender": t.sender_account,
                "receiver": t.receiver_account,
                "amount": t.amount,
                "timestamp": t.timestamp.as_deref().unwrap_or(""),
                "is_suspicious": t.is_suspicious.unwrap_or(false)
            }));

            if let Some(ref ts) = t.timestamp {
                if earliest.is_none() || earliest.as_ref().unwrap() > ts {
                    earliest = Some(ts.clone());
                }
                if latest.is_none() || latest.as_ref().unwrap() < ts {
                    latest = Some(ts.clone());
                }
            }
        }
    }

    let start_acc = accounts.first().cloned().unwrap_or_default();
    let end_acc = accounts.last().cloned().unwrap_or_default();
    let hops = accounts.len().saturating_sub(1);

    json!({
        "path_id": path_id,
        "start_account": start_acc,
        "end_account": end_acc,
        "hops": hops,
        "accounts_sequence": accounts,
        "total_transfer_sum": (total_val * 100.0).round() / 100.0,
        "value_label": "Cumulative Transfer Sum",
        "earliest_timestamp": earliest.unwrap_or_default(),
        "latest_timestamp": latest.unwrap_or_default(),
        "supporting_transaction_ids": supporting_txn_ids,
        "transactions": supporting_txns,
        "suspicious_indicators": if total_val > 100_000.0 { vec!["HIGH_VALUE_FLOW", "MULTI_HOP_TRANSFER"] } else { vec!["TRANSFER_SEQUENCE"] }
    })
}

async fn get_trail_transactions(
    State(pool): State<DbPool>,
    Path(trail_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let saved = sqlx::query_as::<_, SavedMoneyTrail>(
        "SELECT trail_id, target_account, inbound_hops_json, outbound_hops_json, total_inbound, total_outbound, summary, paths_json, patterns_json, report_json, created_at FROM money_trails WHERE trail_id = $1"
    )
    .bind(&trail_id)
    .fetch_optional(&pool)
    .await?;

    if let Some(m) = saved {
        let rep: serde_json::Value = m
            .report_json
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(|| json!({}));
        let timeline = rep["chronological_timeline"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        return Ok(Json(json!({
            "trail_id": trail_id,
            "total_transactions": timeline.len(),
            "transactions": timeline
        })));
    }

    Err(AppError::NotFound(format!(
        "Money trail {} not found",
        trail_id
    )))
}

async fn save_trail_to_case_handler(
    State(pool): State<DbPool>,
    Path(trail_id): Path<String>,
    Json(payload): Json<SaveTrailToCaseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now().to_rfc3339();

    let saved = sqlx::query_as::<_, SavedMoneyTrail>(
        "SELECT trail_id, target_account, inbound_hops_json, outbound_hops_json, total_inbound, total_outbound, summary, paths_json, patterns_json, report_json, created_at FROM money_trails WHERE trail_id = $1"
    )
    .bind(&trail_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Money trail {} not found", trail_id)))?;

    let case_id = if let Some(cid) = payload.case_id {
        cid
    } else {
        let new_cid = format!(
            "CASE-{}",
            uuid::Uuid::new_v4().to_string().replace("-", "")[..8].to_uppercase()
        );
        let title = payload
            .new_case_title
            .unwrap_or_else(|| format!("Money Trail Investigation on {}", saved.target_account));
        let summary = saved.summary.clone().unwrap_or_else(|| {
            format!(
                "Automated trail analysis on account {}",
                saved.target_account
            )
        });

        sqlx::query(
            r#"
            INSERT INTO cases (case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings)
            VALUES ($1, $2, 'High', 'Special Investigator', 'Open', $3, $4, $4, $5, 'Multi-hop transaction trail attached as primary financial evidence.')
            "#
        )
        .bind(&new_cid)
        .bind(&title)
        .bind(&saved.target_account)
        .bind(&now)
        .bind(&summary)
        .execute(&pool)
        .await?;

        new_cid
    };

    let desc = format!(
        "Money Trail {} on {}: Total Volume INR {:.2}",
        trail_id,
        saved.target_account,
        saved.total_inbound.unwrap_or(0.0) + saved.total_outbound.unwrap_or(0.0)
    );
    let meta = json!({
        "trail_id": trail_id,
        "target_account": saved.target_account,
        "total_inbound": saved.total_inbound,
        "total_outbound": saved.total_outbound,
        "investigator_notes": payload.notes
    });

    sqlx::query(
        "INSERT INTO case_evidence (case_id, evidence_type, reference_id, description, metadata_json, created_at) VALUES ($1, 'MONEY_TRAIL', $2, $3, $4, $5)"
    )
    .bind(&case_id)
    .bind(&trail_id)
    .bind(&desc)
    .bind(meta.to_string())
    .bind(&now)
    .execute(&pool)
    .await?;

    let audit_desc = format!("Attached money trail {} to case {}", trail_id, case_id);
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES ($1, 'Investigator', 'TRAIL_ATTACHED_TO_CASE', 'CASE', $2, $3)"
    )
    .bind(&now)
    .bind(&case_id)
    .bind(&audit_desc)
    .execute(&pool)
    .await;

    Ok(Json(json!({
        "status": "SUCCESS",
        "trail_id": trail_id,
        "case_id": case_id,
        "message": format!("Money trail successfully attached to case {}.", case_id),
        "attached_at": now
    })))
}

async fn get_trail_report_handler(
    State(pool): State<DbPool>,
    Path(trail_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let saved = sqlx::query_as::<_, SavedMoneyTrail>(
        "SELECT trail_id, target_account, inbound_hops_json, outbound_hops_json, total_inbound, total_outbound, summary, paths_json, patterns_json, report_json, created_at FROM money_trails WHERE trail_id = $1"
    )
    .bind(&trail_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Money trail {} not found", trail_id)))?;

    let report_data: serde_json::Value = saved
        .report_json
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_else(|| {
            json!({
                "trail_id": saved.trail_id,
                "target_account": saved.target_account,
                "summary": saved.summary
            })
        });

    Ok(Json(json!({
        "report_title": format!("FINTRACE AI Financial Crime Intelligence Report — Money Trail {}", trail_id),
        "classification": "CONFIDENTIAL // LAW ENFORCEMENT & REGULATORY USE ONLY",
        "trail_id": trail_id,
        "target_account": saved.target_account,
        "investigation_provenance": "Core Banking CBS Statement of Accounts (SOA)",
        "report_generated_at": Utc::now().to_rfc3339(),
        "investigator": "Special Investigator Rajesh Verma (INV-7809-DELHI)",
        "methodology": "Directed Graph Search with Multi-Task GraphSAGE Topological Feature Aggregation",
        "legal_disclaimer": "This document contains algorithmic forensic analysis. Candidate paths and transfer sums indicate observed financial relationship patterns and are not conclusive proof of guilt without independent corroborating evidence.",
        "trail_findings": report_data
    })))
}
