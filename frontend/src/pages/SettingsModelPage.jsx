import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Settings,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  Sliders,
  Info,
  Clock,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function SettingsModelPage({ refreshTrigger, setRefreshTrigger }) {
  const [modelRuns, setModelRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [epochs, setEpochs] = useState(100);
  const [learningRate, setLearningRate] = useState(0.01);
  const [isTraining, setIsTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);
  const [trainError, setTrainError] = useState(null);

  // Configurable thresholds
  const [highThreshold, setHighThreshold] = useState(75);
  const [medThreshold, setMedThreshold] = useState(40);

  const fetchModelRuns = async () => {
    setLoading(true);
    try {
      const runs = await api.getModelRuns();
      setModelRuns(runs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelRuns();
  }, [refreshTrigger]);

  const handleTrainModel = async (e) => {
    e.preventDefault();
    setIsTraining(true);
    setTrainResult(null);
    setTrainError(null);

    try {
      const res = await api.trainGNN({
        epochs: parseInt(epochs) || 100,
        learning_rate: parseFloat(learningRate) || 0.01
      });
      setTrainResult(res);
      fetchModelRuns();
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setTrainError(err.message || "Training failed");
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <Cpu className="w-5 h-5 text-electric-400" />
          <span>Step 13: GraphSAGE Architecture & GNN Hyperparameter Tuning</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Separate training, inference, and architectural governance for PyTorch Geometric GraphSAGE model.
        </p>
      </div>

      {/* Model Training Form & Architecture Explanation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Training Controller */}
        <div className="p-6 rounded-xl bg-navy-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-electric-400" />
              <h3 className="text-sm font-bold text-white">Trigger GraphSAGE Training Run</h3>
            </div>
            <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
              PYTORCH ENGINE ACTIVE
            </span>
          </div>

          <form onSubmit={handleTrainModel} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-mono text-[11px]">
                  EPOCHS (ITERATIONS)
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={epochs}
                  onChange={(e) => setEpochs(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-mono text-[11px]">
                  LEARNING RATE (ADAM)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min={0.0001}
                  max={0.1}
                  value={learningRate}
                  onChange={(e) => setLearningRate(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-navy-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              Training conducts 2-hop neighborhood message-passing over the current account transaction graph, minimizing cross-entropy loss against ground-truth labels and generating updated node embeddings.
            </div>

            <button
              type="submit"
              disabled={isTraining}
              className="w-full py-2.5 bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-white font-bold text-xs rounded-lg shadow-glow-electric transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Executing GraphSAGE Forward & Backward Passes...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Execute Supervised Training</span>
                </>
              )}
            </button>
          </form>

          {trainResult && (
            <div className="p-4 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Training Completed Successfully! (Run #{trainResult.run_id})</span>
              </div>
              <div className="grid grid-cols-4 gap-2 font-mono text-[11px] text-white pt-1">
                <div>F1: <strong className="text-electric-300">{(trainResult.f1_score * 100).toFixed(1)}%</strong></div>
                <div>Accuracy: <strong className="text-emerald-300">{(trainResult.accuracy * 100).toFixed(1)}%</strong></div>
                <div>Loss: <strong className="text-amber-300">{trainResult.final_loss}</strong></div>
                <div>Edges: <strong className="text-slate-300">{trainResult.num_edges}</strong></div>
              </div>
            </div>
          )}

          {trainError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{trainError}</span>
            </div>
          )}
        </div>

        {/* Architecture Details & Feature Space */}
        <div className="p-6 rounded-xl bg-navy-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-electric-400" />
              <h3 className="text-sm font-bold text-white">GraphSAGE Specification & Node Features</h3>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="font-semibold text-white">Model Architecture:</div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                <li><strong className="text-slate-200">Layer 1:</strong> SAGEConv (8 input features → 32 hidden units, Mean Aggregator, ReLU, Dropout 0.2)</li>
                <li><strong className="text-slate-200">Layer 2:</strong> SAGEConv (32 hidden units → 16 latent embedding dimensions)</li>
                <li><strong className="text-slate-200">Head:</strong> Linear Classifier (16 → 2 classes: Mule vs Normal)</li>
              </ul>
            </div>

            <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
              <div className="font-semibold text-white">8-Dimensional Node Feature Tensor:</div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-400">
                <div className="p-1.5 rounded bg-navy-950 border border-slate-800">1. log1p(In-Degree)</div>
                <div className="p-1.5 rounded bg-navy-950 border border-slate-800">2. log1p(Out-Degree)</div>
                <div className="p-1.5 rounded bg-navy-950 border border-slate-800">3. log1p(Total Inflow ₹)</div>
                <div className="p-1.5 rounded bg-navy-950 border border-slate-800">4. log1p(Total Outflow ₹)</div>
                <div className="p-1.5 rounded bg-navy-950 border border-slate-800">5. Turnover Drain Ratio</div>
                <div className="p-1.5 rounded bg-navy-950 border border-slate-800">6. Counterparty Degree</div>
                <div className="p-1.5 rounded bg-navy-950 border border-slate-800">7. PageRank Centrality</div>
                <div className="p-1.5 rounded bg-navy-950 border border-slate-800">8. Betweenness Centrality</div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-navy-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-electric-400 shrink-0 mt-0.5" />
            <span>
              Thresholds configure alert sensitivity in investigators' queue: High Risk (≥ {highThreshold}%), Medium Risk (≥ {medThreshold}%).
            </span>
          </div>
        </div>
      </div>

      {/* Historical Model Runs Table */}
      <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
          MODEL TRAINING & EVALUATION AUDIT HISTORY
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-navy-950 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">RUN ID</th>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">ARCHITECTURE</th>
                <th className="py-2.5 px-3">NODES / EDGES</th>
                <th className="py-2.5 px-3">EPOCHS</th>
                <th className="py-2.5 px-3">TRAIN LOSS</th>
                <th className="py-2.5 px-3">ACCURACY</th>
                <th className="py-2.5 px-3">F1-SCORE</th>
                <th className="py-2.5 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {modelRuns.map((r) => (
                <tr key={r.run_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-bold text-electric-400">#{r.run_id}</td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    {new Date(r.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-sans text-[11px]">{r.architecture}</td>
                  <td className="py-3 px-3 text-slate-300">{r.num_nodes} / {r.num_edges}</td>
                  <td className="py-3 px-3 text-white">{r.epochs}</td>
                  <td className="py-3 px-3 text-amber-300 font-bold">{r.train_loss}</td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">
                    {r.accuracy ? `${(r.accuracy * 100).toFixed(1)}%` : "N/A"}
                  </td>
                  <td className="py-3 px-3 text-rose-300 font-bold">
                    {r.f1_score ? `${(r.f1_score * 100).toFixed(1)}%` : "N/A"}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-sans font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                      Validated
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
