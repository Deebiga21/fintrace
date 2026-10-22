-- FinTrace AI: PostgreSQL Schema Migration

CREATE TABLE IF NOT EXISTS accounts (
    account_id VARCHAR(64) PRIMARY KEY,
    customer_name VARCHAR(128),
    account_type VARCHAR(32) DEFAULT 'Savings',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    initial_balance DOUBLE PRECISION DEFAULT 1000.0,
    current_balance DOUBLE PRECISION DEFAULT 1000.0,
    status VARCHAR(32) DEFAULT 'Active',
    risk_score DOUBLE PRECISION DEFAULT 0.0,
    risk_level VARCHAR(16) DEFAULT 'Low',
    prediction_confidence DOUBLE PRECISION DEFAULT 0.0,
    is_ground_truth_mule BOOLEAN DEFAULT FALSE,
    total_incoming DOUBLE PRECISION DEFAULT 0.0,
    total_outgoing DOUBLE PRECISION DEFAULT 0.0,
    in_degree INTEGER DEFAULT 0,
    out_degree INTEGER DEFAULT 0,
    unique_counterparties INTEGER DEFAULT 0,
    avg_txn_interval_hours DOUBLE PRECISION DEFAULT 0.0,
    turnover_ratio DOUBLE PRECISION DEFAULT 0.0,
    flags_json TEXT DEFAULT '[]',
    embedding_json TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    sender_account VARCHAR(64) NOT NULL REFERENCES accounts(account_id),
    receiver_account VARCHAR(64) NOT NULL REFERENCES accounts(account_id),
    amount DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) DEFAULT 'COMPLETED',
    transaction_type VARCHAR(32) DEFAULT 'IMPS',
    description VARCHAR(255),
    is_suspicious BOOLEAN DEFAULT FALSE,
    flag_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_txn_sender ON transactions(sender_account);
CREATE INDEX IF NOT EXISTS idx_txn_receiver ON transactions(receiver_account);
CREATE INDEX IF NOT EXISTS idx_txn_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_txn_amount ON transactions(amount);

CREATE TABLE IF NOT EXISTS complaints (
    complaint_id VARCHAR(64) PRIMARY KEY,
    date_reported TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    complainant_name VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    reported_account_id VARCHAR(64) NOT NULL REFERENCES accounts(account_id),
    transaction_id VARCHAR(64),
    amount_lost DOUBLE PRECISION NOT NULL,
    status VARCHAR(32) DEFAULT 'New',
    source VARCHAR(64) DEFAULT 'National Cyber Crime Portal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cases (
    case_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(32) DEFAULT 'High',
    assigned_investigator VARCHAR(128) DEFAULT 'Lead Financial Crime Specialist',
    status VARCHAR(32) DEFAULT 'New',
    primary_account_id VARCHAR(64) REFERENCES accounts(account_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    summary TEXT,
    findings TEXT
);

CREATE TABLE IF NOT EXISTS case_evidence (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES cases(case_id),
    evidence_type VARCHAR(32) NOT NULL,
    reference_id VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    metadata_json TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "user" VARCHAR(128) DEFAULT 'Investigator',
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32),
    target_id VARCHAR(64),
    details TEXT
);

CREATE TABLE IF NOT EXISTS model_runs (
    run_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    model_name VARCHAR(128) DEFAULT 'GraphSAGE (PyG SAGEConv)',
    architecture VARCHAR(64) DEFAULT '2-layer GraphSAGE with Mean Aggregator',
    num_nodes INTEGER DEFAULT 0,
    num_edges INTEGER DEFAULT 0,
    epochs INTEGER DEFAULT 100,
    train_loss DOUBLE PRECISION,
    val_loss DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    precision DOUBLE PRECISION,
    recall DOUBLE PRECISION,
    f1_score DOUBLE PRECISION,
    confusion_matrix_json TEXT,
    is_trained_on_ground_truth BOOLEAN DEFAULT FALSE,
    hyperparameters_json TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    badge_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    role VARCHAR(32) NOT NULL DEFAULT 'Investigator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id VARCHAR(64) PRIMARY KEY,
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'New',
    assigned_to VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
