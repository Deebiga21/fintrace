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
      setActionError(err.message || 'Failed to generate synthetic samples.');
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-[#0B0F19] border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="font-mono text-xs font-bold text-rose-400 uppercase tracking-wider">
              FinTrace ML Platform • Step 13
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Model Intelligence & Generative AI Studio</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Multi-Task GraphSAGE Graph Neural Network and Conditional Tabular GAN (CWGAN-GP) for real financial crime typologies, minority-class synthesis, and multi-hop account inference.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Artifacts</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 text-xs font-mono">
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
                  ? 'border-rose-500 text-white bg-rose-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-500'}`} />
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
            <div className="p-4 rounded-xl bg-[#0E1424] border border-slate-800">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Input Graph Engine</span>
              <div className="text-lg font-black text-white mt-1">Directed Multi-Hop</div>
              <div className="text-xs text-slate-400 mt-1">Senders → Receivers with 10D topological feature tensors.</div>
            </div>
            <div className="p-4 rounded-xl bg-[#0E1424] border border-slate-800">
              <span className="text-[10px] font-mono font-bold text-sky-400 uppercase">Shared GNN Backbone</span>
              <div className="text-lg font-black text-sky-300 mt-1">GraphSAGE 2-Layer</div>
              <div className="text-xs text-slate-400 mt-1">PyG SAGEConv Mean neighborhood message aggregation.</div>
            </div>
            <div className="p-4 rounded-xl bg-[#0E1424] border border-slate-800">
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">Generative Synthesis</span>
              <div className="text-lg font-black text-rose-300 mt-1">CWGAN-GP Tabular</div>
              <div className="text-xs text-slate-400 mt-1">Conditional Wasserstein GAN for minority fraud synthesis.</div>
            </div>
            <div className="p-4 rounded-xl bg-[#0E1424] border border-slate-800">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Supervised Decision</span>
              <div className="text-lg font-black text-emerald-300 mt-1">Multi-Task Heads</div>
              <div className="text-xs text-slate-400 mt-1">Account Mule, Edge Fraud, and Anomaly Autoencoder.</div>
            </div>
          </div>

          {/* Dataset Switcher & Benchmark Selector */}
          <div className="p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-rose-400" />
                  <span>Select Active Fraud Investigation Dataset</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Seamlessly train and test the GNN and CWGAN-GP on real Kaggle PaySim transactions or multi-typology synthetic bank networks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">Active:</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {status?.active_dataset === 'paysim' ? 'Kaggle PaySim1 (ealaxi/paysim1)' : 'Multi-Typology Benchmark'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: PaySim */}
              <div
                onClick={() => !switchingDataset && handleSelectDataset('paysim')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  status?.active_dataset === 'paysim'
                    ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-950/20'
                    : 'bg-black/30 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Kaggle PaySim1 Mobile Money</span>
                      <a
                        href="https://www.kaggle.com/datasets/ealaxi/paysim1"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </span>
                    {status?.active_dataset === 'paysim' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500 text-white">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Official benchmark dataset (Lopez-Rojas et al.) simulating mobile-money financial crime with authentic TRANSFER and CASH_OUT fraud events.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/60 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">10,262 txns</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">17,755 accounts</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40">187 fraud events</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">CC BY 4.0</span>
                </div>
              </div>

              {/* Option 2: Benchmark */}
              <div
                onClick={() => !switchingDataset && handleSelectDataset('benchmark')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  status?.active_dataset !== 'paysim'
                    ? 'bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-950/20'
                    : 'bg-black/30 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white">FinTrace Multi-Typology Benchmark</span>
                    {status?.active_dataset !== 'paysim' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500 text-white">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Custom multi-hop banking topology featuring smurfing aggregation rings, circular wash loops, and rapid pass-through conduits.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/60 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">1,810 txns</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">217 accounts</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/40">55 mule rings</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Multi-Hop Loops</span>
                </div>
              </div>
            </div>

            {switchingDataset && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center gap-2 text-xs font-mono text-slate-300">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                <span>Switching active dataset, rebuilding transaction graph & reloading models...</span>
              </div>
            )}
          </div>

          {/* Dataset Health & Summary */}
          {datasetInfo?.dataset_summary && (
            <div className="p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Dataset Summary & Provenance</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  HEALTH SCORE: {datasetInfo.data_quality_report?.dataset_health_score || 100}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">TOTAL TRANSACTIONS</span>
                  <span className="text-base font-bold text-white">{datasetInfo.dataset_summary.total_transactions}</span>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">TOTAL ACCOUNTS</span>
                  <span className="text-base font-bold text-white">{datasetInfo.dataset_summary.total_accounts}</span>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">CLASS IMBALANCE</span>
                  <span className="text-base font-bold text-rose-400">{datasetInfo.dataset_summary.class_imbalance_ratio}</span>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">LICENSE / PROVENANCE</span>
                  <span className="text-xs font-bold text-emerald-400 truncate block">{datasetInfo.dataset_summary.license}</span>
                </div>
              </div>

              {/* Domain Comparison Callout */}
              {datasetInfo.dataset_summary.domain_comparison && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Info className="w-3.5 h-3.5" />
                    <span>Domain Architecture & Research Context ({datasetInfo.dataset_summary.domain})</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {datasetInfo.dataset_summary.domain_comparison}
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400 italic">
                * {datasetInfo.dataset_summary.synthetic_disclaimer}
              </p>
            </div>
          )}

          {/* Class Distribution Plot */}
          <div className="p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Severe Class Imbalance Visualization (Normal vs. Flagged Fraud)</span>
            </h3>
            <div className="rounded-xl overflow-hidden border border-slate-800 max-w-xl mx-auto bg-black/50">
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
            <div className="p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Train Conditional Tabular GAN (CWGAN-GP)</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/30 font-bold">
                  GRADIENT PENALTY λ=10
                </span>
              </div>

              <form onSubmit={handleTrainGAN} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">EPOCHS</label>
                    <input
                      type="number"
                      value={ganEpochs}
                      onChange={(e) => setGanEpochs(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-800 text-white"
                      min={10}
                      max={200}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">BATCH SIZE</label>
                    <input
                      type="number"
                      value={ganBatchSize}
                      onChange={(e) => setGanBatchSize(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-800 text-white"
                      min={16}
                      max={256}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isTrainingGAN}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  <Play className={`w-3.5 h-3.5 fill-white ${isTrainingGAN ? 'animate-spin' : ''}`} />
                  <span>{isTrainingGAN ? 'Training CWGAN-GP...' : 'Trigger GAN Training Run'}</span>
                </button>
              </form>

              {ganMetrics?.summary && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Wasserstein Distance:</span>
                    <strong className="text-emerald-400">{ganMetrics.summary.final_wasserstein_distance}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Critic Loss:</span>
                    <strong className="text-white">{ganMetrics.summary.final_critic_loss}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Generator Loss:</span>
                    <strong className="text-white">{ganMetrics.summary.final_generator_loss}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Synthetic Data Generator */}
            <div className="p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Synthesize Minority Fraud Transactions</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                  ZERO PRIVACY LEAKAGE
                </span>
              </div>

              <form onSubmit={handleGenerateSynthetic} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">NUM SAMPLES</label>
                    <input
                      type="number"
                      value={synthSamples}
                      onChange={(e) => setSynthSamples(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-800 text-white"
                      min={50}
                      max={2000}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">FRAUD RATIO</label>
                    <input
                      type="number"
                      step="0.05"
                      value={synthFraudRatio}
                      onChange={(e) => setSynthFraudRatio(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-800 text-white"
                      min={0.05}
                      max={0.8}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Sampling from Generator...' : 'Generate Synthetic Transactions'}</span>
                </button>
              </form>

              {genSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  {genSuccessMsg}
                </div>
              )}
            </div>
          </div>

          {/* Synthetic Quality Audit & Distribution Plots */}
          {synthQuality && (
            <div className="p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Phase 6 Statistical Quality & Privacy Leakage Audit</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold">
                  FIDELITY SCORE: {synthQuality.overall_fidelity_score}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">NUMERICAL FIDELITY</span>
                  <div className="text-base font-bold text-white mt-1">
                    {synthQuality.numerical_distribution_fidelity?.numerical_fidelity_score}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Wasserstein Dist: {synthQuality.numerical_distribution_fidelity?.wasserstein_distance_log_amount}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">CATEGORICAL OVERLAP</span>
                  <div className="text-base font-bold text-white mt-1">
                    {synthQuality.categorical_distribution_fidelity?.transaction_type?.fidelity_score}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Total Variation Dist: {synthQuality.categorical_distribution_fidelity?.transaction_type?.total_variation_distance}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">PRIVACY & MEMORIZATION</span>
                  <div className="text-base font-bold text-emerald-400 mt-1">
                    {synthQuality.privacy_and_memorization_audit?.privacy_risk_status}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Account Leakage: {synthQuality.privacy_and_memorization_audit?.account_identifier_leakage} accounts
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/50 p-2">
                  <img
                    src={api.getArtifactPlotUrl("gan_loss_curves.png")}
                    alt="GAN Loss Curves"
                    className="w-full object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/50 p-2">
                  <img
                    src={api.getArtifactPlotUrl("real_vs_synthetic_distributions.png")}
                    alt="Real vs Synthetic Distributions"
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
          <div className="p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Phase 7: Empirical Supervised Classifier Benchmark</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Both models are trained and then evaluated on the exact same held-out REAL test partition.
                </p>
              </div>

              <button
                onClick={handleRunBenchmark}
                disabled={isBenchmarking}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition flex items-center gap-2"
              >
                <Play className={`w-3.5 h-3.5 fill-white ${isBenchmarking ? 'animate-spin' : ''}`} />
                <span>{isBenchmarking ? 'Running Benchmark...' : 'Run Benchmark Evaluation'}</span>
              </button>
            </div>

            {classifierMetrics?.metrics_comparison && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-4">TRAINING DATASET</th>
                      <th className="py-2.5 px-4">PRECISION</th>
                      <th className="py-2.5 px-4">RECALL</th>
                      <th className="py-2.5 px-4">F1-SCORE</th>
                      <th className="py-2.5 px-4">PR-AUC</th>
                      <th className="py-2.5 px-4">ROC-AUC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-300">
                        Model 1: Real Baseline Only
                      </td>
                      <td className="py-3 px-4 text-white">
                        {classifierMetrics.metrics_comparison.baseline_real_only.precision}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        {classifierMetrics.metrics_comparison.baseline_real_only.recall}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {classifierMetrics.metrics_comparison.baseline_real_only.f1_score}
                      </td>
                      <td className="py-3 px-4 text-sky-400">
                        {classifierMetrics.metrics_comparison.baseline_real_only.pr_auc}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {classifierMetrics.metrics_comparison.baseline_real_only.roc_auc}
                      </td>
                    </tr>
                    <tr className="bg-rose-500/5">
                      <td className="py-3 px-4 font-bold text-rose-300 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                        <span>Model 2: Real + GAN-Augmented</span>
                      </td>
                      <td className="py-3 px-4 text-white">
                        {classifierMetrics.metrics_comparison.gan_augmented.precision}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        {classifierMetrics.metrics_comparison.gan_augmented.recall}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {classifierMetrics.metrics_comparison.gan_augmented.f1_score}
                      </td>
                      <td className="py-3 px-4 text-sky-400">
                        {classifierMetrics.metrics_comparison.gan_augmented.pr_auc}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {classifierMetrics.metrics_comparison.gan_augmented.roc_auc}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/50 p-2 max-w-2xl mx-auto">
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
            <div className="p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-white">Train Multi-Task GNN</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/30 font-bold">
                  SAGEConv Mean
                </span>
              </div>

              <form onSubmit={handleTrainGNN} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">EPOCHS</label>
                  <input
                    type="number"
                    value={gnnEpochs}
                    onChange={(e) => setGnnEpochs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-800 text-white"
                    min={10}
                    max={200}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">LEARNING RATE</label>
                  <input
                    type="number"
                    step="0.001"
                    value={gnnLr}
                    onChange={(e) => setGnnLr(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-800 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTrainingGNN}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  <Play className={`w-3.5 h-3.5 fill-white ${isTrainingGNN ? 'animate-spin' : ''}`} />
                  <span>{isTrainingGNN ? 'Training GraphSAGE...' : 'Trigger Multi-Task GNN Run'}</span>
                </button>
              </form>

              {gnnMetrics?.metrics && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800 text-xs font-mono space-y-2">
                  <div className="text-[11px] font-bold text-rose-400">TASK A: ACCOUNT MULE HEAD</div>
                  <div className="flex justify-between text-slate-400">
                    <span>F1-Score:</span>
                    <strong className="text-emerald-400">{gnnMetrics.metrics.task_a_account_mule_classification.test_f1_score}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Recall:</span>
                    <strong className="text-white">{gnnMetrics.metrics.task_a_account_mule_classification.test_recall}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Precision:</span>
                    <strong className="text-white">{gnnMetrics.metrics.task_a_account_mule_classification.test_precision}</strong>
                  </div>
                  
                  <div className="text-[11px] font-bold text-sky-400 pt-2 border-t border-slate-800">TASK B: TRANSACTION HEAD</div>
                  <div className="flex justify-between text-slate-400">
                    <span>PR-AUC:</span>
                    <strong className="text-sky-300">{gnnMetrics.metrics.task_b_transaction_suspicious_classification.pr_auc}</strong>
                  </div>

                  <div className="text-[11px] font-bold text-purple-400 pt-2 border-t border-slate-800">TASK C: ANOMALY AUTOENCODER</div>
                  <div className="flex justify-between text-slate-400">
                    <span>Divergence Ratio:</span>
                    <strong className="text-purple-300">{gnnMetrics.metrics.task_c_unsupervised_anomaly_detection.anomaly_divergence_ratio}x</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Training Convergence Plots */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>Multi-Task GNN Loss & Validation F1 Convergence</span>
              </h3>
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/50 p-2">
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
          <div className="p-6 rounded-2xl bg-[#0E1424] border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Top Accounts Ranked by GraphSAGE Mule Probability</span>
              </span>
              <span className="text-xs font-mono text-slate-500">Live Model Inference</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-4">ACCOUNT ID</th>
                    <th className="py-2.5 px-4">MULE PROBABILITY</th>
                    <th className="py-2.5 px-4">RISK TIER</th>
                    <th className="py-2.5 px-4">ANOMALY RECON ERROR</th>
                    <th className="py-2.5 px-4">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rankedAccounts.map((acc) => (
                    <tr key={acc.account_id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-bold text-white">{acc.account_id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${acc.mule_probability >= 0.5 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                              style={{ width: `${acc.mule_probability * 100}%` }}
                            ></div>
                          </div>
                          <span>{acc.mule_probability}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          acc.risk_tier === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' :
                          acc.risk_tier === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-500/40' :
                          acc.risk_tier === 'MODERATE' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {acc.risk_tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-purple-300">{acc.anomaly_score}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            if (onAccountSelect) onAccountSelect(acc.account_id);
                            if (setCurrentPage) setCurrentPage('mule-detection');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] transition"
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
