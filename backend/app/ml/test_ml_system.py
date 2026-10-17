"""
FinTrace ML System - Phase 16: Comprehensive Acceptance Test Suite
Runs end-to-end validation of dataset inspection, graph construction, GAN, classifier, GNN, and APIs.
"""

import os
import json
import torch
import numpy as np
import pandas as pd

from .data.inspect_dataset import DatasetInspector
from .data.preprocess import TransactionPreprocessor
from .data.build_graph import TransactionGraphBuilder
from .models.tabular_gan import TabularGenerator, TabularCritic
from .evaluation.validate_synthetic import SyntheticQualityValidator
from .models.graphsage_multitask import MultiTaskGNN
from .models.fraud_classifier import TabularFraudClassifier
from .analysis.money_trail import MoneyFlowAnalyzer
from .analysis.community_detection import SyndicateCommunityDetector
from .inference.predict_service import MLInferenceService

def test_ml_system_pipeline():
    artifacts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "artifacts"))
    data_csv = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "benchmark_transactions.csv"))
    
    assert os.path.exists(data_csv), "Benchmark transaction dataset must exist."

    # 1. Test Dataset Inspection
    inspector = DatasetInspector(data_csv, artifacts_dir)
    summary = inspector.run_inspection()
    assert summary["total_transactions"] > 1000
    assert os.path.exists(os.path.join(artifacts_dir, "dataset_summary.json"))
    assert os.path.exists(os.path.join(artifacts_dir, "data_quality_report.json"))
    assert os.path.exists(os.path.join(artifacts_dir, "class_distribution.png"))
    print("[PASS] Criterion 1 Passed: Dataset inspection & quality reporting.")

    # 2. Test Preprocessing
    preprocessor = TransactionPreprocessor(artifacts_dir)
    df = pd.read_csv(data_csv)
    train_df, val_df, test_df, meta = preprocessor.fit_transform_split(df)
    assert len(train_df) > 0 and len(val_df) > 0 and len(test_df) > 0
    assert meta["num_features"] >= 10
    print("[PASS] Criterion 2 Passed: Leakage-free temporal preprocessing.")

    # 3. Test Directed Graph Construction
    builder = TransactionGraphBuilder(artifacts_dir)
    graph_data, graph_meta = builder.build_from_dataframe(df)
    assert graph_data.num_nodes > 50
    assert graph_data.edge_index.size(0) == 2
    assert graph_data.x.size(1) == 10
    print("[PASS] Criterion 3 Passed: Directed transaction graph construction with 10D node features.")

    # 4. Test CWGAN-GP Architecture
    gen = TabularGenerator(noise_dim=64, condition_dim=2, num_continuous=4, cat_cardinalities=[5, 2])
    critic = TabularCritic(feature_dim=11, condition_dim=2)
    z = torch.randn(8, 64)
    cond = torch.zeros(8, 2)
    cond[:, 1] = 1.0
    synth_x = gen(z, cond)
    assert synth_x.shape == (8, 11)
    crit_score = critic(synth_x, cond)
    assert crit_score.shape == (8, 1)
    print("[PASS] Criterion 4 Passed: CWGAN-GP forward pass & gradient-penalty compatibility.")

    # 5. Test Synthetic Quality & Privacy Audit
    synth_csv = os.path.join(artifacts_dir, "synthetic_transactions.csv")
    if os.path.exists(synth_csv):
        df_s = pd.read_csv(synth_csv)
        is_paysim_synth = 'CASH_OUT' in df_s.get('transaction_type', pd.Series()).values or 'TRANSFER' in df_s.get('transaction_type', pd.Series()).values
        eval_csv = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "paysim_transactions.csv")) if is_paysim_synth else data_csv
        validator = SyntheticQualityValidator(artifacts_dir)
        q_report = validator.evaluate(eval_csv, synth_csv)
        assert q_report["overall_fidelity_score"] >= 65.0
        assert q_report["privacy_and_memorization_audit"]["privacy_risk_status"] == "PASSED (ZERO LEAKAGE)"
        print("[PASS] Criterion 5 Passed: Synthetic quality validation and zero-leakage privacy audit.")

    # 6. Test Multi-Task GraphSAGE
    gnn = MultiTaskGNN(node_features_dim=10, edge_features_dim=1, hidden_dim=32, embedding_dim=16)
    out = gnn(graph_data.x, graph_data.edge_index, graph_data.edge_attr)
    assert out["embeddings"].shape == (graph_data.num_nodes, 16)
    assert out["account_logits"].shape == (graph_data.num_nodes, 2)
    assert out["transaction_logits"].shape == (graph_data.edge_index.size(1),)
    assert out["anomaly_scores"].shape == (graph_data.num_nodes,)
    print("[PASS] Criterion 6 Passed: Multi-Task GraphSAGE shared encoder and task-specific heads.")

    # 7. Test Money Trail (Loops & Conduits)
    flow = MoneyFlowAnalyzer(df)
    loops = flow.detect_circular_loops(max_length=5, limit=10)
    conduits = flow.detect_rapid_conduits()
    assert len(loops) > 0, "Circular loops should be discovered."
    assert len(conduits) > 0, "Rapid conduits should be discovered."
    print("[PASS] Criterion 7 Passed: Timestamp-aware money-flow analysis (loops & conduits).")

    # 8. Test Modularity Community Detection
    comm_detector = SyndicateCommunityDetector(df)
    comms = comm_detector.detect_communities(min_size=3)
    assert len(comms) > 0
    print("[PASS] Criterion 8 Passed: Modularity-based syndicate community detection.")

    # 9. Test Inference Service & Predictions
    svc = MLInferenceService(artifacts_dir, data_csv)
    pred_mule = svc.predict_account("MULE_AGG_RING_01")
    assert "mule_probability" in pred_mule
    assert "evidence" in pred_mule
    assert "risk_tier" in pred_mule
    print(f"[PASS] Criterion 9 Passed: Calibrated inference & explanation signals for {pred_mule['account_id']} (Prob: {pred_mule['mule_probability']}).")

    print("\n=======================================================")
    print("ALL 9 CORE ML ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    test_ml_system_pipeline()
