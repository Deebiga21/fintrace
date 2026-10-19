use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ModelRun {
    pub run_id: i64,
    pub timestamp: Option<String>,
    pub model_name: Option<String>,
    pub architecture: Option<String>,
    pub num_nodes: Option<i64>,
    pub num_edges: Option<i64>,
    pub epochs: Option<i64>,
    pub train_loss: Option<f64>,
    pub val_loss: Option<f64>,
    pub accuracy: Option<f64>,
    pub precision: Option<f64>,
    pub recall: Option<f64>,
    pub f1_score: Option<f64>,
    pub confusion_matrix_json: Option<String>,
    pub is_trained_on_ground_truth: Option<bool>,
    pub hyperparameters_json: Option<String>,
    pub notes: Option<String>,
}
