import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Sparkles,
  Layers,
  Activity,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Info,
  Database,
  BarChart3,
  Network,
  ShieldCheck,
  Zap,
  TrendingUp,
  FileText,
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export default function SettingsModelPage({ refreshTrigger, setRefreshTrigger, onAccountSelect, setCurrentPage }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'gan' | 'classifier' | 'gnn'
  const [status, setStatus] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [ganMetrics, setGanMetrics] = useState(null);
  const [synthQuality, setSynthQuality] = useState(null);
  const [classifierMetrics, setClassifierMetrics] = useState(null);
  const [gnnMetrics, setGnnMetrics] = useState(null);
  const [isolationForestMetrics, setIsolationForestMetrics] = useState(null);
  const [isolationForestScores, setIsolationForestScores] = useState([]);
  const [rankedAccounts, setRankedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [ganEpochs, setGanEpochs] = useState(40);
  const [ganBatchSize, setGanBatchSize] = useState(64);
  const [isTrainingGAN, setIsTrainingGAN] = useState(false);

  const [synthSamples, setSynthSamples] = useState(400);
  const [synthFraudRatio, setSynthFraudRatio] = useState(0.35);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genSuccessMsg, setGenSuccessMsg] = useState(null);

  const [gnnEpochs, setGnnEpochs] = useState(50);
  const [gnnLr, setGnnLr] = useState(0.008);
  const [isTrainingGNN, setIsTrainingGNN] = useState(false);
  const [isTrainingIsolationForest, setIsTrainingIsolationForest] = useState(false);

  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [switchingDataset, setSwitchingDataset] = useState(false);
  const [actionError, setActionError] = useState(null);

  const handleSelectDataset = async (datasetKey) => {
    setSwitchingDataset(true);
    setActionError(null);
    try {
      await api.selectDataset(datasetKey);
      await loadAllData();
      if (setRefreshTrigger) setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Failed to switch dataset.');
    } finally {
      setSwitchingDataset(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [st, ds, q, gnn, ranked] = await Promise.allSettled([
        api.getMLStatus(),
        api.getMLDatasetSummary(),
        api.getSyntheticQuality(),
        api.getGNNMetrics(),
        api.getRankedAccounts(25)
      ]);

      if (st.status === 'fulfilled') setStatus(st.value);
      if (ds.status === 'fulfilled') setDatasetInfo(ds.value);
      if (q.status === 'fulfilled') setSynthQuality(q.value);
      if (gnn.status === 'fulfilled') setGnnMetrics(gnn.value);
      if (ranked.status === 'fulfilled') setRankedAccounts(ranked.value);

      // Try classifier metrics
      try {
        const cm = await api.getClassifierMetrics();
        setClassifierMetrics(cm);
      } catch (e) {}

      // Try GAN metrics
      try {
        const gm = await api.getGANMetrics();
        setGanMetrics(gm);
      } catch (e) {}

      try {
        const im = await api.getIsolationForestMetrics();
        setIsolationForestMetrics(im);
      } catch (e) { setIsolationForestMetrics(null); }
      try {
        const scored = await api.getIsolationForestScores(50);
        setIsolationForestScores(scored.rows || []);
      } catch (e) { setIsolationForestScores([]); }

    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Failed to load model studio data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [refreshTrigger]);

  const handleTrainGAN = async (e) => {
    e.preventDefault();
    setIsTrainingGAN(true);
    setActionError(null);
    try {
      await api.trainGAN({ epochs: parseInt(ganEpochs), batch_size: parseInt(ganBatchSize) });
      setTimeout(loadAllData, 2000);
    } catch (err) {
      setActionError(err.message || 'Failed to start GAN training.');
    } finally {
      setIsTrainingGAN(false);
    }
  };

  const handleGenerateSynthetic = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setActionError(null);
    setGenSuccessMsg(null);
    try {
      const res = await api.generateSynthetic({
        num_samples: parseInt(synthSamples),
        fraud_ratio: parseFloat(synthFraudRatio)
      });
      setGenSuccessMsg(`Generated ${res.total_generated} records (${res.fraud_samples_generated} fraud, ${res.normal_samples_generated} normal). Quality validation updated.`);
      loadAllData();
    } catch (err) {
      setActionError(err.message || 'Failed to generate forensic augmentations.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    setActionError(null);
    try {
      const res = await api.runClassifierBenchmark();
      setClassifierMetrics(res);
      loadAllData();
    } catch (err) {
      setActionError(err.message || 'Failed to run classifier benchmark.');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleTrainGNN = async (e) => {
    e.preventDefault();
    setIsTrainingGNN(true);
    setActionError(null);
    try {
      await api.trainMultiTaskGNN({ epochs: parseInt(gnnEpochs), learning_rate: parseFloat(gnnLr) });
      setTimeout(loadAllData, 2000);
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setActionError(err.message || 'Failed to start GNN training.');
    } finally {
      setIsTrainingGNN(false);
    }
  };

  const handleTrainIsolationForest = async () => {
    setIsTrainingIsolationForest(true);
    setActionError(null);
    try {
      const queued = await api.trainIsolationForest({ contamination: 0.01 });
      if (queued.status === 'ALREADY_RUNNING') {
        setActionError(queued.message || 'Isolation Forest training is already running.');
        return;
      }
      let completed = false;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        try {
          const metrics = await api.getIsolationForestMetrics();
          setIsolationForestMetrics(metrics);
          if (metrics.training_status === 'COMPLETED') {
            const scored = await api.getIsolationForestScores(50);
            setIsolationForestScores(scored.rows || []);
            completed = true;
            break;
          }
          if (metrics.training_status === 'FAILED') {
            setActionError(metrics.error || 'Isolation Forest training failed. Check the ML service logs.');
            completed = true;
            break;
          }
        } catch (pollError) {
          // Metrics are not available until the first successful training run.
        }
      }
      if (!completed) setActionError('Isolation Forest training is still running. Use Sync Artifacts to refresh its status.');
    } catch (err) {
      setActionError(err.message || 'Failed to start Isolation Forest training.');
    } finally {
      setIsTrainingIsolationForest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-none bg-[#0B0F19] border border-[#E8C2BB] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B4E] animate-pulse"></span>
            <span className="font-mono text-xs font-bold text-[#FF3B4E] uppercase tracking-wider">
              FinTrace ML Platform • Step 13
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#4A4A4A] tracking-tight flex items-center gap-3">
            <span>Model Intelligence & Generative AI Studio</span>
          </h1>
          <p className="text-xs text-[#6E6264] max-w-3xl leading-relaxed">
            Multi-Task GraphSAGE Graph Neural Network and Conditional Tabular GAN (CWGAN-GP) for real financial crime typologies, minority-class synthesis, and multi-hop account inference.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-none bg-[#FFFFFF] hover:bg-[#FFFFFF] border border-[#E8C2BB] text-xs font-mono text-[#6E6264] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Artifacts</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-none bg-[#FF3B4E]/15/60 border border-[#FF3B4E]/40 text-[#FF3B4E] text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#FF3B4E]" />
          <span>{actionError}</span>
        </div>
      )}

      <section className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-none bg-[#FFFFFF] border border-emerald-900/60">
        <div>
          <h2 className="text-sm font-bold text-[#4A4A4A]">Isolation Forest transaction baseline</h2>
          <p className="text-xs text-[#6E6264] mt-1">Unsupervised temporal 80/20 split. Results are anomaly candidates, not confirmed fraud.</p>
          {isolationForestMetrics?.metrics && (
            <p className="text-xs text-[#6E6264] mt-2">
              {isolationForestMetrics.metrics.flagged_rows?.toLocaleString()} flagged of {isolationForestMetrics.metrics.holdout_rows?.toLocaleString()} holdout rows · {isolationForestMetrics.metrics.feature_count} features
            </p>
          )}
        </div>
        <button
          onClick={handleTrainIsolationForest}
          disabled={isTrainingIsolationForest}
          className="flex items-center gap-2 px-4 py-2 rounded-none bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-xs font-bold text-[#4A4A4A] transition"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isTrainingIsolationForest ? 'Training…' : 'Train baseline'}</span>
        </button>
        {isolationForestScores.length > 0 && (
          <div className="basis-full overflow-x-auto border-t border-[#E8C2BB] pt-4">
            <h3 className="text-xs font-bold text-[#6E6264] mb-2">Highest anomaly scores (up to 50)</h3>
            <table className="w-full text-xs text-left">
              <thead className="text-[#8A7D7F]"><tr><th className="py-2">Record</th><th className="py-2">Account / counterparty</th><th className="py-2">Amount</th><th className="py-2">Risk percentile</th><th className="py-2">Flag</th></tr></thead>
              <tbody>{isolationForestScores.slice(0, 10).map((row, index) => (
                <tr key={row.record_id || row.transaction_id || index} className="border-t border-[#E8C2BB]/70 text-[#6E6264]">
                  <td className="py-2 font-mono">{row.record_id || row.transaction_id || row.source_row || `row ${index + 1}`}</td>
                  <td className="py-2 font-mono">{row.account_group_id || row.sender_account || row.receiver_account || '—'}</td>
                  <td className="py-2">{row.amount ?? '—'}</td>
                  <td className="py-2">{Number(row.iforest_risk_percentile || 0).toFixed(1)}%</td>
                  <td className="py-2">{row.iforest_flag ? 'Anomaly candidate' : 'Review rank'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E8C2BB] space-x-2 text-xs font-mono">
        {[
          { id: 'overview', label: '1. Architecture & Dataset Discovery', icon: Database },
          { id: 'gan', label: '2. Tabular GAN Studio (CWGAN-GP)', icon: Sparkles },
          { id: 'classifier', label: '3. Real vs. Augmented Benchmark', icon: BarChart3 },
          { id: 'gnn', label: '4. Multi-Task GraphSAGE GNN', icon: Network }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold transition ${
                isActive
                  ? 'border-[#FF3B4E] text-white bg-[#FF3B4E]/10'
                  : 'border-transparent text-[#6E6264] hover:text-[#4A4A4A]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF3B4E]' : 'text-[#8A7D7F]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: ARCHITECTURE & DATASET DISCOVERY */}
      {/* ==================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Architecture Pipeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-none bg-[#FFFFFF] border border-[#E8C2BB]">
              <span className="text-[10px] font-mono font-bold text-[#8A7D7F] uppercase">Input Graph Engine</span>
              <div className="text-lg font-black text-[#4A4A4A] mt-1">Directed Multi-Hop</div>
              <div className="text-xs text-[#6E6264] mt-1">Senders → Receivers with 10D topological feature tensors.</div>
            </div>
            <div className="p-4 rounded-none bg-[#FFFFFF] border border-[#E8C2BB]">
              <span className="text-[10px] font-mono font-bold text-sky-400 uppercase">Shared GNN Backbone</span>
              <div className="text-lg font-black text-sky-300 mt-1">GraphSAGE 2-Layer</div>
              <div className="text-xs text-[#6E6264] mt-1">Relational neighbor aggregation over 1-hop and 2-hop counterparty paths.</div>
            </div>
            <div className="p-4 rounded-none bg-[#FFFFFF] border border-[#E8C2BB]">
              <span className="text-[10px] font-mono font-bold text-[#FF3B4E] uppercase">Generative Synthesis</span>
              <div className="text-lg font-black text-[#FF3B4E] mt-1">CWGAN-GP Tabular</div>
              <div className="text-xs text-[#6E6264] mt-1">Adversarial generative model for balancing minority fraud classes.</div>
            </div>
            <div className="p-4 rounded-none bg-[#FFFFFF] border border-[#E8C2BB]">
              <span className="text-[10px] font-mono font-bold text-[#6E6264] uppercase">Supervised Decision</span>
              <div className="text-lg font-black text-[#6E6264] mt-1">Multi-Task Heads</div>
              <div className="text-xs text-[#6E6264] mt-1">Account Mule, Edge Fraud, and Anomaly Autoencoder.</div>
            </div>
          </div>

          {/* Dataset Switcher & Benchmark Selector */}
          <div className="p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8C2BB] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#4A4A4A] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#FF3B4E]" />
                  <span>Select Active Fraud Investigation Dataset</span>
                </h3>
                <p className="text-xs text-[#6E6264] mt-0.5">
                  Compare the graph models on the included synthetic benchmark or PaySim data.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#6E6264]">Active:</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#FF3B4E]/20 text-[#FF3B4E] border border-[#FF3B4E]/40">
                  {status?.active_dataset === 'paysim'
                    ? 'Kaggle PaySim1 (ealaxi/paysim1)'
                    : 'Multi-Typology Benchmark'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 2: PaySim */}
              <div
                onClick={() => !switchingDataset && handleSelectDataset('paysim')}
                className={`p-4 rounded-none border cursor-pointer transition flex flex-col justify-between ${
                  status?.active_dataset === 'paysim'
                    ? 'bg-[#FF3B4E]/10 border-[#FF3B4E]/50 shadow-lg shadow-rose-950/20'
                    : 'bg-black/30 border-[#E8C2BB] hover:border-[#E8C2BB] hover:bg-[#FFFFFF]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-[#4A4A4A] flex items-center gap-1.5">
                      <span>Kaggle PaySim1 Mobile</span>
                      <a
                        href="https://www.kaggle.com/datasets/ealaxi/paysim1"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#6E6264] hover:text-[#4A4A4A]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </span>
                    {status?.active_dataset === 'paysim' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF3B4E] text-white">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-[#6E6264] leading-relaxed">
                    Official benchmark dataset (Lopez-Rojas et al.) simulating mobile-money financial crime with authentic TRANSFER/CASH_OUT events.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#E8C2BB]/60 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#6E6264]">10,262 txns</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#6E6264]">17,755 accounts</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FF3B4E]/15 text-[#FF3B4E] border border-rose-800/40">187 fraud</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#6E6264]">CC BY 4.0</span>
                </div>
              </div>

              {/* Option 3: Benchmark */}
              <div
                onClick={() => !switchingDataset && handleSelectDataset('benchmark')}
                className={`p-4 rounded-none border cursor-pointer transition flex flex-col justify-between ${
                  status?.active_dataset === 'benchmark'
                    ? 'bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-950/20'
                    : 'bg-black/30 border-[#E8C2BB] hover:border-[#E8C2BB] hover:bg-[#FFFFFF]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-[#4A4A4A]">Multi-Typology Benchmark</span>
                    {status?.active_dataset === 'benchmark' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500 text-white">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-[#6E6264] leading-relaxed">
                    Custom multi-hop banking topology featuring smurfing aggregation rings, circular wash loops, and rapid pass-through conduits.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#E8C2BB]/60 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#6E6264]">1,810 txns</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#6E6264]">217 accounts</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/40">55 mule rings</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#6E6264]">Multi-Hop Loops</span>
                </div>
              </div>
            </div>

            {switchingDataset && (
              <div className="p-3 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] flex items-center justify-center gap-2 text-xs font-mono text-[#6E6264]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF3B4E]" />
                <span>Switching active dataset, rebuilding transaction graph & reloading models...</span>
              </div>
            )}
          </div>

          {/* Dataset Health & Summary */}
          {datasetInfo?.dataset_summary && (
            <div className="p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF3B4E]" />
                  <h3 className="text-sm font-bold text-[#4A4A4A]">Dataset Summary & Provenance</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#93C5FD]/15 text-[#6E6264] border border-[#93C5FD]/30 text-[10px] font-mono font-bold">
                  HEALTH SCORE: {datasetInfo.data_quality_report?.dataset_health_score || 100}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 rounded-none bg-black/40 border border-[#E8C2BB]">
                  <span className="text-[#8A7D7F] block text-[10px]">TOTAL TRANSACTIONS</span>
                  <span className="text-base font-bold text-[#4A4A4A]">{datasetInfo.dataset_summary.total_transactions}</span>
                </div>
                <div className="p-3 rounded-none bg-black/40 border border-[#E8C2BB]">
                  <span className="text-[#8A7D7F] block text-[10px]">TOTAL ACCOUNTS</span>
                  <span className="text-base font-bold text-[#4A4A4A]">{datasetInfo.dataset_summary.total_accounts}</span>
                </div>
                <div className="p-3 rounded-none bg-black/40 border border-[#E8C2BB]">
                  <span className="text-[#8A7D7F] block text-[10px]">CLASS IMBALANCE</span>
                  <span className="text-base font-bold text-[#FF3B4E]">{datasetInfo.dataset_summary.class_imbalance_ratio}</span>
                </div>
                <div className="p-3 rounded-none bg-black/40 border border-[#E8C2BB]">
                  <span className="text-[#8A7D7F] block text-[10px]">LICENSE / PROVENANCE</span>
                  <span className="text-xs font-bold text-[#6E6264] truncate block">{datasetInfo.dataset_summary.license}</span>
                </div>
              </div>

              {/* Domain Comparison Callout */}
              {datasetInfo.dataset_summary.domain_comparison && (
                <div className="p-4 rounded-none bg-[#FFFFFF]/60 border border-[#E8C2BB] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#6E6264]">
                    <Info className="w-3.5 h-3.5" />
                    <span>Domain Architecture & Research Context ({datasetInfo.dataset_summary.domain})</span>
                  </div>
                  <p className="text-xs text-[#6E6264] leading-relaxed font-sans">
                    {datasetInfo.dataset_summary.domain_comparison}
                  </p>
                </div>
              )}

              <p className="text-xs text-[#6E6264] italic">
                * {datasetInfo.dataset_summary.synthetic_disclaimer}
              </p>
            </div>
          )}

          {/* Class Distribution Plot */}
          <div className="p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
            <h3 className="text-sm font-bold text-[#4A4A4A] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Severe Class Imbalance Visualization (Normal vs. Flagged Fraud)</span>
            </h3>
            <div className="rounded-none overflow-hidden border border-[#E8C2BB] max-w-xl mx-auto bg-black/50">
              <img
                src={api.getArtifactPlotUrl("class_distribution.png")}
                alt="Class Distribution"
                className="w-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: TABULAR GAN STUDIO (CWGAN-GP) */}
      {/* ==================================================== */}
      {activeTab === 'gan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GAN Training Controller */}
            <div className="p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF3B4E]" />
                  <h3 className="text-sm font-bold text-[#4A4A4A]">Train Conditional Tabular GAN (CWGAN-GP)</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF3B4E]/15 text-[#FF3B4E] border border-[#FF3B4E]/30 font-bold">
                  GRADIENT PENALTY λ=10
                </span>
              </div>

              <form onSubmit={handleTrainGAN} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#6E6264] font-semibold mb-1">EPOCHS</label>
                    <input
                      type="number"
                      value={ganEpochs}
                      onChange={(e) => setGanEpochs(e.target.value)}
                      className="w-full px-3 py-2 rounded-none bg-black/60 border border-[#E8C2BB] text-white"
                      min={10}
                      max={200}
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E6264] font-semibold mb-1">BATCH SIZE</label>
                    <input
                      type="number"
                      value={ganBatchSize}
                      onChange={(e) => setGanBatchSize(e.target.value)}
                      className="w-full px-3 py-2 rounded-none bg-black/60 border border-[#E8C2BB] text-white"
                      min={16}
                      max={256}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isTrainingGAN}
                  className="w-full py-2.5 rounded-none bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  <Play className={`w-3.5 h-3.5 fill-white ${isTrainingGAN ? 'animate-spin' : ''}`} />
                  <span>{isTrainingGAN ? 'Training CWGAN-GP...' : 'Trigger GAN Training Run'}</span>
                </button>
              </form>

              {ganMetrics?.summary && (
                <div className="p-3.5 rounded-none bg-black/40 border border-[#E8C2BB] text-xs font-mono space-y-1">
                  <div className="flex justify-between text-[#6E6264]">
                    <span>Distribution Divergence Metric:</span>
                    <strong className="text-[#6E6264]">{ganMetrics.summary.final_wasserstein_distance}</strong>
                  </div>
                  <div className="flex justify-between text-[#6E6264]">
                    <span>Critic Loss:</span>
                    <strong className="text-[#4A4A4A]">{ganMetrics.summary.final_critic_loss}</strong>
                  </div>
                  <div className="flex justify-between text-[#6E6264]">
                    <span>Generator Loss:</span>
                    <strong className="text-[#4A4A4A]">{ganMetrics.summary.final_generator_loss}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Adversarial Training Ledger Generator */}
            <div className="p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-[#4A4A4A]">Generate Augmented Training Transactions</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#93C5FD]/15 text-[#6E6264] border border-[#93C5FD]/30 font-bold">
                  ZERO PRIVACY LEAKAGE
                </span>
              </div>

              <form onSubmit={handleGenerateSynthetic} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#6E6264] font-semibold mb-1">NUM SAMPLES</label>
                    <input
                      type="number"
                      value={synthSamples}
                      onChange={(e) => setSynthSamples(e.target.value)}
                      className="w-full px-3 py-2 rounded-none bg-black/60 border border-[#E8C2BB] text-white"
                      min={50}
                      max={2000}
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E6264] font-semibold mb-1">FRAUD RATIO</label>
                    <input
                      type="number"
                      step="0.05"
                      value={synthFraudRatio}
                      onChange={(e) => setSynthFraudRatio(e.target.value)}
                      className="w-full px-3 py-2 rounded-none bg-black/60 border border-[#E8C2BB] text-white"
                      min={0.05}
                      max={0.8}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2.5 rounded-none bg-orange-600 hover:bg-orange-500 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Sampling Forensic Augmentations...' : 'Generate Forensic Augmentations'}</span>
                </button>
              </form>

              {genSuccessMsg && (
                <div className="p-3 rounded-none bg-[#93C5FD]/15/60 border border-[#93C5FD]/30 text-[#6E6264] text-xs font-mono">
                  {genSuccessMsg}
                </div>
              )}
            </div>
          </div>

          {/* Forensic Augmentation Audit & Distribution Plots */}
          {synthQuality && (
            <div className="p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#6E6264]" />
                  <h3 className="text-sm font-bold text-[#4A4A4A]">Statistical Quality & Privacy Leakage Audit</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#93C5FD]/15 text-[#6E6264] border border-[#93C5FD]/40 font-mono text-xs font-bold">
                  FIDELITY SCORE: {synthQuality.overall_fidelity_score}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-none bg-black/40 border border-[#E8C2BB]">
                  <span className="text-[#8A7D7F] block text-[10px]">NUMERICAL FIDELITY</span>
                  <div className="text-base font-bold text-[#4A4A4A] mt-1">
                    {synthQuality.numerical_distribution_fidelity?.numerical_fidelity_score}%
                  </div>
                  <div className="text-[10px] text-[#6E6264] mt-1">
                    Distribution Divergence: {synthQuality.numerical_distribution_fidelity?.wasserstein_distance_log_amount}
                  </div>
                </div>

                <div className="p-3.5 rounded-none bg-black/40 border border-[#E8C2BB]">
                  <span className="text-[#8A7D7F] block text-[10px]">CATEGORICAL OVERLAP</span>
                  <div className="text-base font-bold text-[#4A4A4A] mt-1">
                    {synthQuality.categorical_distribution_fidelity?.transaction_type?.fidelity_score}%
                  </div>
                  <div className="text-[10px] text-[#6E6264] mt-1">
                    Total Variation Dist: {synthQuality.categorical_distribution_fidelity?.transaction_type?.total_variation_distance}
                  </div>
                </div>

                <div className="p-3.5 rounded-none bg-black/40 border border-[#E8C2BB]">
                  <span className="text-[#8A7D7F] block text-[10px]">PRIVACY & MEMORIZATION</span>
                  <div className="text-base font-bold text-[#6E6264] mt-1">
                    {synthQuality.privacy_and_memorization_audit?.privacy_risk_status}
                  </div>
                  <div className="text-[10px] text-[#6E6264] mt-1">
                    Account Leakage: {synthQuality.privacy_and_memorization_audit?.account_identifier_leakage} accounts
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                <div className="rounded-none overflow-hidden border border-[#E8C2BB] bg-black/50 p-2">
                  <img
                    src={api.getArtifactPlotUrl("gan_loss_curves.png")}
                    alt="Generator Convergence Curves"
                    className="w-full object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div className="rounded-none overflow-hidden border border-[#E8C2BB] bg-black/50 p-2">
                  <img
                    src={api.getArtifactPlotUrl("real_vs_synthetic_distributions.png")}
                    alt="Ledger vs Forensic Distributions"
                    className="w-full object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: REAL VS AUGMENTED CLASSIFIER BENCHMARK */}
      {/* ==================================================== */}
      {activeTab === 'classifier' && (
        <div className="space-y-6">
          <div className="p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#4A4A4A] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#6E6264]" />
                  <span>Phase 7: Empirical Supervised Classifier Benchmark</span>
                </h3>
                <p className="text-xs text-[#6E6264] mt-0.5">
                  Both models are trained and then evaluated on the exact same held-out REAL test partition.
                </p>
              </div>

              <button
                onClick={handleRunBenchmark}
                disabled={isBenchmarking}
                className="px-4 py-2 rounded-none bg-rose-600 hover:bg-[#FF3B4E] text-white font-mono text-xs font-bold transition flex items-center gap-2"
              >
                <Play className={`w-3.5 h-3.5 fill-white ${isBenchmarking ? 'animate-spin' : ''}`} />
                <span>{isBenchmarking ? 'Running Benchmark...' : 'Run Benchmark Evaluation'}</span>
              </button>
            </div>

            {classifierMetrics?.metrics_comparison && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="border-b border-[#E8C2BB] text-[#6E6264]">
                      <th className="py-2.5 px-4">TRAINING DATASET</th>
                      <th className="py-2.5 px-4">PRECISION</th>
                      <th className="py-2.5 px-4">RECALL</th>
                      <th className="py-2.5 px-4">F1-SCORE</th>
                      <th className="py-2.5 px-4">PR-AUC</th>
                      <th className="py-2.5 px-4">ROC-AUC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333D50]">
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#6E6264]">
                        Model 1: Real Baseline Only
                      </td>
                      <td className="py-3 px-4 text-white">
                        {classifierMetrics.metrics_comparison.baseline_real_only.precision}
                      </td>
                      <td className="py-3 px-4 text-[#6E6264] font-bold">
                        {classifierMetrics.metrics_comparison.baseline_real_only.recall}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {classifierMetrics.metrics_comparison.baseline_real_only.f1_score}
                      </td>
                      <td className="py-3 px-4 text-sky-400">
                        {classifierMetrics.metrics_comparison.baseline_real_only.pr_auc}
                      </td>
                      <td className="py-3 px-4 text-[#6E6264]">
                        {classifierMetrics.metrics_comparison.baseline_real_only.roc_auc}
                      </td>
                    </tr>
                    <tr className="bg-[#FF3B4E]/5">
                      <td className="py-3 px-4 font-bold text-[#FF3B4E] flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF3B4E]" />
                        <span>Model 2: Real + GAN-Augmented</span>
                      </td>
                      <td className="py-3 px-4 text-white">
                        {classifierMetrics.metrics_comparison.gan_augmented.precision}
                      </td>
                      <td className="py-3 px-4 text-[#6E6264] font-bold">
                        {classifierMetrics.metrics_comparison.gan_augmented.recall}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {classifierMetrics.metrics_comparison.gan_augmented.f1_score}
                      </td>
                      <td className="py-3 px-4 text-sky-400">
                        {classifierMetrics.metrics_comparison.gan_augmented.pr_auc}
                      </td>
                      <td className="py-3 px-4 text-[#6E6264]">
                        {classifierMetrics.metrics_comparison.gan_augmented.roc_auc}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="rounded-none overflow-hidden border border-[#E8C2BB] bg-black/50 p-2 max-w-2xl mx-auto">
              <img
                src={api.getArtifactPlotUrl("pr_roc_curves.png")}
                alt="PR and ROC Curves"
                className="w-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: MULTI-TASK GRAPHSAGE GNN */}
      {/* ==================================================== */}
      {activeTab === 'gnn' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* GNN Training Controller */}
            <div className="p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-[#4A4A4A]">Train Multi-Task GNN</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/30 font-bold">
                  SAGEConv Mean
                </span>
              </div>

              <form onSubmit={handleTrainGNN} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#6E6264] font-semibold mb-1">EPOCHS</label>
                  <input
                    type="number"
                    value={gnnEpochs}
                    onChange={(e) => setGnnEpochs(e.target.value)}
                    className="w-full px-3 py-2 rounded-none bg-black/60 border border-[#E8C2BB] text-white"
                    min={10}
                    max={200}
                  />
                </div>
                <div>
                  <label className="block text-[#6E6264] font-semibold mb-1">LEARNING RATE</label>
                  <input
                    type="number"
                    step="0.001"
                    value={gnnLr}
                    onChange={(e) => setGnnLr(e.target.value)}
                    className="w-full px-3 py-2 rounded-none bg-black/60 border border-[#E8C2BB] text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTrainingGNN}
                  className="w-full py-2.5 rounded-none bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  <Play className={`w-3.5 h-3.5 fill-white ${isTrainingGNN ? 'animate-spin' : ''}`} />
                  <span>{isTrainingGNN ? 'Training GraphSAGE...' : 'Trigger Multi-Task GNN Run'}</span>
                </button>
              </form>

              {gnnMetrics?.metrics && (
                <div className="p-3.5 rounded-none bg-black/40 border border-[#E8C2BB] text-xs font-mono space-y-2">
                  <div className="text-[11px] font-bold text-[#FF3B4E]">TASK A: ACCOUNT MULE HEAD</div>
                  <div className="flex justify-between text-[#6E6264]">
                    <span>F1-Score:</span>
                    <strong className="text-[#6E6264]">{gnnMetrics.metrics.task_a_account_mule_classification.test_f1_score}</strong>
                  </div>
                  <div className="flex justify-between text-[#6E6264]">
                    <span>Recall:</span>
                    <strong className="text-[#4A4A4A]">{gnnMetrics.metrics.task_a_account_mule_classification.test_recall}</strong>
                  </div>
                  <div className="flex justify-between text-[#6E6264]">
                    <span>Precision:</span>
                    <strong className="text-[#4A4A4A]">{gnnMetrics.metrics.task_a_account_mule_classification.test_precision}</strong>
                  </div>
                  
                  <div className="text-[11px] font-bold text-sky-400 pt-2 border-t border-[#E8C2BB]">TASK B: TRANSACTION HEAD</div>
                  <div className="flex justify-between text-[#6E6264]">
                    <span>PR-AUC:</span>
                    <strong className="text-sky-300">{gnnMetrics.metrics.task_b_transaction_suspicious_classification.pr_auc}</strong>
                  </div>

                  <div className="text-[11px] font-bold text-[#B86B7A] pt-2 border-t border-[#E8C2BB]">TASK C: ANOMALY AUTOENCODER</div>
                  <div className="flex justify-between text-[#6E6264]">
                    <span>Divergence Ratio:</span>
                    <strong className="text-[#B86B7A]">{gnnMetrics.metrics.task_c_unsupervised_anomaly_detection.anomaly_divergence_ratio}x</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Training Convergence Plots */}
            <div className="lg:col-span-2 p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
              <h3 className="text-sm font-bold text-[#4A4A4A] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#B86B7A]" />
                <span>Multi-Task GNN Loss & Validation F1 Convergence</span>
              </h3>
              <div className="rounded-none overflow-hidden border border-[#E8C2BB] bg-black/50 p-2">
                <img
                  src={api.getArtifactPlotUrl("gnn_training_curves.png")}
                  alt="GNN Training Curves"
                  className="w-full object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </div>

          {/* Top Ranked Accounts from GNN Forward Pass */}
          <div className="p-6 rounded-none bg-[#FFFFFF] border border-[#E8C2BB] space-y-4">
            <h3 className="text-sm font-bold text-[#4A4A4A] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF3B4E]" />
                <span>Top Accounts Ranked by GraphSAGE Mule Probability</span>
              </span>
              <span className="text-xs font-mono text-[#8A7D7F]">Live Model Inference</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-[#E8C2BB] text-[#6E6264]">
                    <th className="py-2.5 px-4">ACCOUNT ID</th>
                    <th className="py-2.5 px-4">MULE PROBABILITY</th>
                    <th className="py-2.5 px-4">RISK TIER</th>
                    <th className="py-2.5 px-4">ANOMALY RECON ERROR</th>
                    <th className="py-2.5 px-4">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333D50]">
                  {rankedAccounts.map((acc) => (
                    <tr key={acc.account_id} className="hover:bg-[#FFFFFF]/30 transition">
                      <td className="py-3 px-4 font-bold text-white">{acc.account_id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#FFFFFF] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${acc.mule_probability >= 0.5 ? 'bg-[#FF3B4E]' : 'bg-emerald-400'}`}
                              style={{ width: `${acc.mule_probability * 100}%` }}
                            ></div>
                          </div>
                          <span>{acc.mule_probability}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          acc.risk_tier === 'CRITICAL' ? 'bg-[#FF3B4E]/15 text-[#FF3B4E] border border-[#FF3B4E]/40' :
                          acc.risk_tier === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-500/40' :
                          acc.risk_tier === 'MODERATE' ? 'bg-[#93C5FD]/15 text-[#6E6264] border border-[#93C5FD]/40' :
                          'bg-[#93C5FD]/15 text-[#6E6264] border border-[#93C5FD]/40'
                        }`}>
                          {acc.risk_tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#B86B7A]">{acc.anomaly_score}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            if (onAccountSelect) onAccountSelect(acc.account_id);
                            if (setCurrentPage) setCurrentPage('mule-detection');
                          }}
                          className="px-2.5 py-1 rounded bg-[#FFFFFF] hover:bg-slate-700 text-[#4A4A4A] text-[10px] transition"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
