import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Database,
  Info,
  Check,
  X,
  Play,
  Download,
  FolderOpen,
  Loader2,
  FileCheck,
  ShieldCheck,
  Activity,
  Layers,
  Network,
  Sliders,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  BarChart3,
  AlertCircle,
  Sparkles,
  GitGraph
} from 'lucide-react';
import { api } from '../services/api';

export default function UploadPage({ setCurrentPage, setRefreshTrigger }) {
  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [stage, setStage] = useState('IDLE'); // IDLE, MAPPING, VALIDATED, COMMITTED

  // Ingestion Pipeline Data
  const [uploadData, setUploadData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [validationReport, setValidationReport] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  // Dynamic Ready-to-Test Datasets
  const [readyDatasets, setReadyDatasets] = useState([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [activeTestingId, setActiveTestingId] = useState(null);

  // Graph Telemetry & Recent Jobs
  const [graphStatus, setGraphStatus] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [isRebuildingGraph, setIsRebuildingGraph] = useState(false);

  // Fetch initial telemetry and ready-to-test datasets
  const loadInitialData = async () => {
    try {
      setIsLoadingDatasets(true);
      const [datasetsRes, graphRes, jobsRes] = await Promise.allSettled([
        api.getReadyToTestDatasets(),
        api.getGraphStatus(),
        api.listIngestionJobs(),
      ]);

      if (datasetsRes.status === 'fulfilled' && datasetsRes.value) {
        setReadyDatasets(datasetsRes.value.datasets || []);
      }
      if (graphRes.status === 'fulfilled' && graphRes.value) {
        setGraphStatus(graphRes.value);
      }
      if (jobsRes.status === 'fulfilled' && jobsRes.value) {
        setRecentJobs(jobsRes.value.jobs || []);
      }
    } catch (err) {
      console.warn("Could not load initial ingestion data:", err);
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      resetPipeline();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      resetPipeline();
    }
  };

  const resetPipeline = () => {
    setUploadData(null);
    setValidationReport(null);
    setCommitResult(null);
    setError(null);
    setSuccessNotice(null);
    setActiveJobId(null);
    setStage('IDLE');
  };

  // STEP 1: Upload CSV and extract initial columns
  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const res = await api.uploadIngestionCsv(selectedFile);
      setUploadData(res);
      setActiveJobId(res.job_id);
      setColumnMapping(res.suggested_mapping || {});
      setStage('MAPPING');
      setSuccessNotice(`Uploaded ${res.filename} (${(res.file_size / 1024).toFixed(1)} KB) — Please review column mapping.`);
    } catch (err) {
      setError(err.message || "Failed to upload and parse CSV. Ensure file is valid UTF-8.");
    } finally {
      setIsUploading(false);
    }
  };

  // STEP 2: Validate Dataset against Mappings & Calculate 10-Point Score
  const handleValidateDataset = async () => {
    if (!activeJobId) return;
    setIsUploading(true);
    setError(null);

    try {
      const res = await api.validateIngestionDataset(activeJobId, columnMapping);
      setValidationReport(res);
      setStage('VALIDATED');
      setSuccessNotice(`Validation complete: Quality Score ${res.dataset_quality_score}/10 (${res.valid_rows} valid transactions).`);
    } catch (err) {
      setError(err.message || "Validation failed on dataset.");
    } finally {
      setIsUploading(false);
    }
  };

  // STEP 3: Commit Dataset to Database & Rebuild Graph
  const handleCommitDataset = async () => {
    if (!activeJobId) return;
    setIsUploading(true);
    setError(null);

    try {
      const res = await api.commitIngestionDataset(activeJobId, {
        clean_null_timestamps: true,
        quarantine_invalid_rows: true,
      });
      setCommitResult(res);
      setStage('COMMITTED');
      setSuccessNotice(res.message || `Successfully committed ${res.inserted_transactions} transactions!`);
      
      // Refresh telemetry and global state
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
      loadInitialData();
    } catch (err) {
      setError(err.message || "Failed to commit dataset to database.");
    } finally {
      setIsUploading(false);
    }
  };

  // Cancel Ingestion Job
  const handleCancelJob = async () => {
    if (activeJobId) {
      try {
        await api.cancelIngestionJob(activeJobId);
      } catch (e) {
        // Ignore cancel errors
      }
    }
    resetPipeline();
    setSelectedFile(null);
  };

  // Test Ingest button for Ready-to-Test Datasets
  const handleTestIngest = async (dataset) => {
    setActiveTestingId(dataset.dataset_id);
    setError(null);
    setCommitResult(null);
    setValidationReport(null);

    try {
      const res = await api.testIngestDataset(dataset.dataset_id);
      setCommitResult({
        filename: dataset.filename,
        inserted_transactions: res.valid_records,
        new_accounts_created: res.accounts_created,
        graph_nodes: res.graph_nodes,
        graph_edges: res.graph_edges,
        quarantined_records: res.skipped_records,
        message: res.message,
      });
      setStage('COMMITTED');
      setSuccessNotice(`Ingested ${dataset.title}: ${res.valid_records} transactions added to graph!`);
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
      loadInitialData();
    } catch (err) {
      setError(err.message || `Failed to test ingest ${dataset.title}`);
    } finally {
      setActiveTestingId(null);
    }
  };

  // Load Benchmark Banking Network
  const handleLoadSyntheticNetwork = async () => {
    setIsUploading(true);
    setError(null);
    setCommitResult(null);

    try {
      const res = await api.loadDemoDataset();
      setCommitResult({
        filename: "Institutional Benchmark Network",
        inserted_transactions: res.transactions_loaded || 182,
        new_accounts_created: res.accounts_loaded || 74,
        graph_nodes: res.graph_nodes || 1970,
        graph_edges: res.graph_edges || 3206,
        quarantined_records: 0,
        message: res.message || "Benchmark financial crime investigation network successfully loaded.",
      });
      setStage('COMMITTED');
      setSuccessNotice("Benchmark financial crime investigation network loaded into database & graph!");
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
      loadInitialData();
    } catch (err) {
      setError(err.message || "Failed to load benchmark banking network.");
    } finally {
      setIsUploading(false);
    }
  };

  // Manual Graph Rebuild
  const handleRebuildGraph = async () => {
    setIsRebuildingGraph(true);
    try {
      const res = await api.rebuildGraph();
      setGraphStatus({
        total_nodes: res.total_nodes,
        total_edges: res.total_edges,
        graph_health: res.graph_health,
        average_degree: res.average_degree,
        density: res.density,
      });
      setSuccessNotice(`Graph rebuilt: ${res.total_nodes} accounts and ${res.total_edges} transaction links active.`);
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to rebuild graph metrics.");
    } finally {
      setIsRebuildingGraph(false);
    }
  };

  const canonicalFieldsConfig = [
    { key: "transaction_id", label: "Transaction ID", required: true, desc: "Unique transaction identifier" },
    { key: "source_account", label: "Source / Sender Account", required: true, desc: "Originating entity account" },
    { key: "destination_account", label: "Destination / Receiver", required: true, desc: "Beneficiary entity account" },
    { key: "amount", label: "Transaction Amount", required: true, desc: "Numeric value transfer" },
    { key: "timestamp", label: "Transaction Timestamp", required: false, desc: "ISO 8601 or date/step" },
    { key: "transaction_type", label: "Transaction Type", required: false, desc: "e.g. TRANSFER, PAYMENT, UPI" },
    { key: "fraud_label", label: "Fraud Label (Optional)", required: false, desc: "1/0 or TRUE/FALSE ground truth" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Live Graph Status Header Bar */}
      <div className="p-4 rounded-none bg-[#252B37]/75 backdrop-blur-2xl border border-[#333D50] flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-none bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]">
            <GitGraph className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#93C5FD] font-medium">FINTRACE TRANSACTION GRAPH ENGINE</div>
            <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
              <span>High-Performance Ingestion & Graph Builder</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#93C5FD]/10 text-[#93C5FD] border border-[#93C5FD]/20">
                Active
              </span>
            </div>
          </div>
        </div>

        {graphStatus && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-none bg-[#1F242E] border border-[#333D50]">
              <span className="text-[#93C5FD] text-[10px] block">NODES (ACCOUNTS)</span>
              <span className="text-white font-bold">{graphStatus.total_nodes?.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-none bg-[#1F242E] border border-[#333D50]">
              <span className="text-[#93C5FD] text-[10px] block">EDGES (TRANSFERS)</span>
              <span className="text-white font-bold">{graphStatus.total_edges?.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-none bg-[#1F242E] border border-[#333D50]">
              <span className="text-[#93C5FD] text-[10px] block">AVG DEGREE</span>
              <span className="text-[#3B82F6] font-bold">{graphStatus.average_degree}</span>
            </div>
            <button
              onClick={handleRebuildGraph}
              disabled={isRebuildingGraph}
              className="p-2 rounded-none bg-[#252B37] hover:bg-slate-700 text-[#93C5FD] transition flex items-center gap-1.5 text-xs font-sans disabled:opacity-50"
              title="Recalculate Graph Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRebuildingGraph ? 'animate-spin text-[#3B82F6]' : ''}`} />
              <span className="hidden sm:inline">Recalculate Graph</span>
            </button>
          </div>
        )}
      </div>

      {/* SUCCESS BANNER */}
      {commitResult && (
        <div className="p-6 rounded-none bg-gradient-to-r from-navy-900 to-navy-950 border-2 border-[#93C5FD] shadow-glow-emerald space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-none bg-[#93C5FD]/20 text-[#93C5FD]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Ingestion & Graph Construction Completed</span>
                  <span className="text-xs font-mono font-normal text-[#93C5FD] px-2 py-0.5 rounded bg-[#93C5FD]/15 border border-emerald-600/40">
                    {commitResult.filename || "Uploaded Dataset"}
                  </span>
                </h3>
                <p className="text-xs text-[#93C5FD] mt-0.5">
                  Transactions committed to database, accounts mapped, and graph degree metrics updated.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage("graph")}
                className="px-4 py-2 bg-[#252B37] hover:bg-slate-700 text-white font-semibold text-xs rounded-none transition"
              >
                View in Graph
              </button>
              <button
                onClick={() => setCurrentPage("mule-detection")}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-electric-600 hover:from-emerald-500 hover:to-electric-500 text-white font-bold text-xs rounded-none flex items-center gap-2 shadow-glow-electric transition transform active:scale-95"
              >
                <span>Proceed to Mule Detection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-[#93C5FD]/15/40 rounded-none border border-[#93C5FD]/40">
              <div className="text-[10px] text-[#93C5FD] font-medium uppercase tracking-wider">Inserted Transactions</div>
              <div className="text-xl font-mono font-bold text-[#93C5FD] mt-1">{commitResult.inserted_transactions ?? 0}</div>
            </div>
            <div className="p-3 bg-[#1F242E]/80 rounded-none border border-[#333D50]">
              <div className="text-[10px] text-[#93C5FD] font-medium uppercase tracking-wider">New Accounts Spawned</div>
              <div className="text-xl font-mono font-bold text-[#3B82F6] mt-1">{commitResult.new_accounts_created ?? 0}</div>
            </div>
            <div className="p-3 bg-[#1F242E]/80 rounded-none border border-[#333D50]">
              <div className="text-[10px] text-[#93C5FD] font-medium uppercase tracking-wider">Quarantined Records</div>
              <div className="text-xl font-mono font-bold text-[#93C5FD] mt-1">{commitResult.quarantined_records ?? 0}</div>
            </div>
            <div className="p-3 bg-[#1F242E]/80 rounded-none border border-[#333D50]">
              <div className="text-[10px] text-[#93C5FD] font-medium uppercase tracking-wider">Active Graph Nodes</div>
              <div className="text-xl font-mono font-bold text-sky-400 mt-1">{commitResult.graph_nodes ?? 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-none bg-[#FF3B4E]/15/80 border-2 border-[#FF3B4E] text-rose-200 flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#FF3B4E] mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-white mb-0.5">Ingestion Warning / Error</div>
              {error}
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-[#FF3B4E]/20/50 text-[#FF3B4E] hover:text-white transition"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PIPELINE PROGRESS INDICATOR */}
      <div className="p-4 rounded-none bg-[#252B37]/75 backdrop-blur-2xl border border-[#333D50] flex items-center justify-between text-xs font-mono">
        <div className={`flex items-center gap-2 ${stage === 'IDLE' ? 'text-[#3B82F6] font-bold' : 'text-[#93C5FD]'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#1F242E] border border-current text-[11px]">1</span>
          <span>Upload CSV</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <div className={`flex items-center gap-2 ${stage === 'MAPPING' ? 'text-[#3B82F6] font-bold' : stage === 'VALIDATED' || stage === 'COMMITTED' ? 'text-[#93C5FD] font-semibold' : 'text-[#64748B]'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#1F242E] border border-current text-[11px]">2</span>
          <span>Map Schema</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <div className={`flex items-center gap-2 ${stage === 'VALIDATED' ? 'text-[#3B82F6] font-bold' : stage === 'COMMITTED' ? 'text-[#93C5FD] font-semibold' : 'text-[#64748B]'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#1F242E] border border-current text-[11px]">3</span>
          <span>Quality Scoring</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <div className={`flex items-center gap-2 ${stage === 'COMMITTED' ? 'text-[#93C5FD] font-bold' : 'text-[#64748B]'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#1F242E] border border-current text-[11px]">4</span>
          <span>Commit & Graph Build</span>
        </div>
      </div>

      {/* STAGE 1: UPLOAD BOX */}
      {stage === 'IDLE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Custom CSV Upload */}
          <div className="p-6 rounded-none bg-[#252B37]/75 backdrop-blur-2xl border border-[#333D50] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UploadCloud className="w-5 h-5 text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-white">Upload Investigation CSV</h3>
              </div>
              <p className="text-xs text-[#93C5FD]">
                Upload institutional banking statement, core banking export, or transaction ledger in CSV format.
              </p>
            </div>

            {/* HTML5 Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-none p-6 text-center cursor-pointer transition ${
                isDragging
                  ? "border-[#3B82F6] bg-electric-950/30 scale-[1.01]"
                  : "border-[#333D50] hover:border-[#3B82F6] bg-[#1F242E]/40"
              }`}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer space-y-2 block">
                <FileSpreadsheet className={`w-9 h-9 mx-auto transition ${selectedFile ? "text-[#93C5FD]" : "text-[#93C5FD]"}`} />
                <div className="text-xs text-[#F3F4F6] font-medium">
                  {selectedFile ? (
                    <div className="space-y-1">
                      <span className="text-[#93C5FD] font-mono font-bold text-sm block">
                        ✓ {selectedFile.name}
                      </span>
                      <span className="text-[10px] text-[#93C5FD] font-mono">
                        {(selectedFile.size / 1024).toFixed(1)} KB — Ready to analyze
                      </span>
                    </div>
                  ) : (
                    <span>Click to browse or drag & drop CSV file here</span>
                  )}
                </div>
                <p className="text-[10px] text-[#64748B]">Max file size 50MB (.csv format)</p>
              </label>
            </div>

            <button
              onClick={handleUploadAndAnalyze}
              disabled={!selectedFile || isUploading}
              className="w-full py-3 rounded-none font-bold text-xs shadow-glow-electric transition flex items-center justify-center gap-2 bg-electric-600 hover:bg-[#3B82F6] text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Parsing Headers & Generating Ingestion Job...</span>
                </>
              ) : (
                <span>Upload & Analyze Schema</span>
              )}
            </button>
          </div>

          {/* Load Benchmark Banking Data */}
          <div className="p-6 rounded-none bg-[#252B37]/75 backdrop-blur-2xl border border-[#333D50] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Load Benchmark Banking Network</h3>
              </div>
              <p className="text-xs text-[#93C5FD]">
                Institutional investigation dataset with verified counterparty provenance. Covers 182 transactions, 74 accounts, and 4 distinct banking crime topologies.
              </p>
            </div>

            <div className="p-4 rounded-none bg-[#1F242E] border border-[#333D50] text-xs space-y-2 text-[#93C5FD]">
              <div className="font-semibold text-[#F3F4F6] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Included Banking Topologies:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#93C5FD]">
                <li><strong className="text-[#93C5FD]">Smurfing Aggregator:</strong> Inflow victims funneled to <code className="text-[#FF3B4E] font-mono">MULE_AGG_01</code></li>
                <li><strong className="text-[#93C5FD]">Circular Layering Ring:</strong> Accounts cycling funds in closed multi-hop loops</li>
                <li><strong className="text-[#93C5FD]">Rapid Pass-Through:</strong> High-value inward debit drained within minutes</li>
                <li><strong className="text-[#93C5FD]">Clean Retail Baseline:</strong> Legitimate merchant payments with 0 flags</li>
              </ul>
            </div>

            <button
              onClick={handleLoadSyntheticNetwork}
              disabled={isUploading}
              className="w-full py-3 rounded-none bg-gradient-to-r from-sky-600 to-electric-600 hover:from-sky-500 hover:to-electric-500 text-white font-bold text-xs shadow-glow-electric transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Loading Network...</span>
                </>
              ) : (
                <span>Load Benchmark Banking Network</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: COLUMN MAPPING REVIEW */}
      {stage === 'MAPPING' && uploadData && (
        <div className="p-6 rounded-none bg-[#252B37]/75 backdrop-blur-2xl border border-[#333D50] space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Step 2: Automatic Column Mapping Review</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#252B37] text-[#3B82F6] border border-[#333D50]">
                  Job {uploadData.job_id}
                </span>
              </h3>
              <p className="text-xs text-[#93C5FD] mt-1">
                Detected <strong>{uploadData.detected_columns?.length}</strong> columns in <strong>{uploadData.filename}</strong>. Review canonical mappings before validating.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setColumnMapping(uploadData.suggested_mapping || {})}
                className="px-3 py-1.5 rounded-none bg-[#1F242E] hover:bg-[#252B37] text-[#3B82F6] border border-[#3B82F6] text-xs font-mono transition flex items-center gap-1.5"
                title="Reset dropdowns to automatically detected columns"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Suggested</span>
              </button>
              <button
                onClick={handleCancelJob}
                className="px-3 py-1.5 rounded-none bg-[#252B37] hover:bg-slate-700 text-[#93C5FD] hover:text-white text-xs font-mono transition"
              >
                Cancel / Change File
              </button>
            </div>
          </div>

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {canonicalFieldsConfig.map((field) => {
              const currentVal = columnMapping[field.key] || "";
              const isMapped = Boolean(currentVal);
              return (
                <div
                  key={field.key}
                  className={`p-3.5 rounded-none bg-[#1F242E] border transition ${
                    isMapped
                      ? "border-[#93C5FD]/30 bg-[#93C5FD]/15/10"
                      : field.required
                      ? "border-[#93C5FD]/40 bg-[#93C5FD]/15/10"
                      : "border-[#333D50]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{field.label}</span>
                      {field.required && (
                        <span className="text-[9px] text-[#93C5FD] font-mono font-normal">*Required</span>
                      )}
                    </span>
                    {isMapped ? (
                      <Check className="w-3.5 h-3.5 text-[#93C5FD]" />
                    ) : field.required ? (
                      <AlertCircle className="w-3.5 h-3.5 text-[#93C5FD]" />
                    ) : (
                      <span className="text-[9px] text-[#64748B]">Optional</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#93C5FD] mb-2">{field.desc}</p>

                  <select
                    value={currentVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setColumnMapping(prev => ({
                        ...prev,
                        [field.key]: val
                      }));
                    }}
                    className="w-full bg-[#252B37] border border-[#333D50] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#3B82F6] font-mono"
                  >
                    <option value="">-- Not Mapped --</option>
                    {uploadData.detected_columns?.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Sample Preview Table */}
          {uploadData.preview && uploadData.preview.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#93C5FD] font-mono flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Raw CSV Preview (First {uploadData.preview.length} Rows)</span>
              </div>
              <div className="overflow-x-auto rounded-none border border-[#333D50]">
                <table className="w-full text-left text-[11px] font-mono text-[#93C5FD]">
                  <thead className="bg-[#1F242E] text-[#93C5FD] text-[10px] border-b border-[#333D50] uppercase">
                    <tr>
                      {uploadData.detected_columns?.map((col) => (
                        <th key={col} className="p-2 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333D50] bg-[#252B37]/40">
                    {uploadData.preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#252B37]/20">
                        {uploadData.detected_columns?.map((col) => (
                          <td key={col} className="p-2 whitespace-nowrap">
                            {row[col] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#333D50]">
            <span className="text-xs text-[#93C5FD]">
              Ensure <strong>Source Account</strong>, <strong>Destination Account</strong>, and <strong>Amount</strong> are mapped.
            </span>
            <button
              onClick={handleValidateDataset}
              disabled={isUploading || !columnMapping.source_account || !columnMapping.destination_account || !columnMapping.amount}
              className="px-6 py-2.5 bg-gradient-to-r from-electric-600 to-[#3B82F6] hover:from-electric-500 hover:to-[#3B82F6] text-white font-bold text-xs rounded-none shadow-glow-electric transition disabled:opacity-40 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Computing 10-Point Quality Score...</span>
                </>
              ) : (
                <>
                  <span>Validate Dataset & Score Readiness</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: VALIDATION & 10-POINT TRANSPARENT QUALITY SCORING */}
      {stage === 'VALIDATED' && validationReport && (
        <div className="p-6 rounded-none bg-[#252B37]/75 backdrop-blur-2xl border border-[#333D50] space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Step 3: Dataset Quality & Model Readiness Audit</span>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                  validationReport.dataset_quality_score >= 7.0
                    ? "text-[#93C5FD] bg-[#93C5FD]/10 border-[#93C5FD]/30"
                    : "text-[#93C5FD] bg-amber-500/10 border-[#93C5FD]/30"
                }`}>
                  Score: {validationReport.dataset_quality_score} / 10.0
                </span>
              </h3>
              <p className="text-xs text-[#93C5FD] mt-1">
                Audited against FINTRACE schema standards, graph connectivity criteria, and model compatibility.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStage('MAPPING')}
                className="px-3 py-1.5 rounded-none bg-[#252B37] hover:bg-slate-700 text-[#93C5FD] text-xs font-mono transition"
              >
                Modify Mappings
              </button>
              <button
                onClick={handleCancelJob}
                className="px-3 py-1.5 rounded-none bg-[#252B37] hover:bg-slate-700 text-[#93C5FD] hover:text-white text-xs font-mono transition"
              >
                Discard
              </button>
            </div>
          </div>

          {/* 10-Point Score Rubric Breakdown */}
          <div className="p-4 rounded-none bg-[#1F242E] border border-[#333D50] space-y-3">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>Transparent 10-Point Quality Rubric</span>
              <span className="text-[#93C5FD] font-mono text-[11px]">Threshold: &ge; 7.0 / 10.0</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {validationReport.quality_report?.breakdown?.map((item, idx) => (
                <div key={idx} className="p-3 rounded-none bg-[#252B37] border border-[#333D50] space-y-1">
                  <div className="text-[10px] text-[#93C5FD] font-medium uppercase">{item.component}</div>
                  <div className="text-base font-bold font-mono text-[#93C5FD]">
                    {item.score} <span className="text-[10px] text-[#64748B] font-normal">/ {item.max}</span>
                  </div>
                  <div className="text-[10px] text-[#93C5FD] leading-tight">{item.details}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Validation Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#1F242E] rounded-none border border-[#333D50]">
              <div className="text-[10px] text-[#93C5FD] uppercase font-mono">Total Rows</div>
              <div className="text-lg font-mono font-bold text-white mt-1">{validationReport.total_rows}</div>
            </div>
            <div className="p-3 bg-[#93C5FD]/15/30 rounded-none border border-[#93C5FD]/30">
              <div className="text-[10px] text-[#93C5FD] uppercase font-mono">Valid Records</div>
              <div className="text-lg font-mono font-bold text-[#93C5FD] mt-1">{validationReport.valid_rows}</div>
            </div>
            <div className="p-3 bg-[#1F242E] rounded-none border border-[#333D50]">
              <div className="text-[10px] text-[#93C5FD] uppercase font-mono">Quarantined Rows</div>
              <div className="text-lg font-mono font-bold text-[#FF3B4E] mt-1">{validationReport.invalid_rows}</div>
            </div>
            <div className="p-3 bg-[#1F242E] rounded-none border border-[#333D50]">
              <div className="text-[10px] text-[#93C5FD] uppercase font-mono">Duplicates Found</div>
              <div className="text-lg font-mono font-bold text-[#93C5FD] mt-1">{validationReport.duplicate_rows}</div>
            </div>
          </div>

          {/* Fraud Label Distribution */}
          {validationReport.fraud_label_distribution && (
            <div className="p-4 rounded-none bg-[#1F242E] border border-[#333D50] flex items-center justify-between flex-wrap gap-4 text-xs font-mono">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-[#3B82F6]" />
                <div>
                  <div className="text-white font-bold">Fraud Label Distribution</div>
                  <div className="text-[#93C5FD] text-[11px]">
                    {validationReport.fraud_label_distribution.labels_available
                      ? "Supervised labels detected for minority class analysis & GAN augmentation."
                      : "Unlabeled dataset. Will rely on unsupervised GNN topology scoring."}
                  </div>
                </div>
              </div>

              {validationReport.fraud_label_distribution.labels_available && (
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[#93C5FD] text-[10px] block">LEGITIMATE</span>
                    <span className="text-[#93C5FD] font-bold">{validationReport.fraud_label_distribution.legitimate_count}</span>
                  </div>
                  <div>
                    <span className="text-[#93C5FD] text-[10px] block">FRAUDULENT</span>
                    <span className="text-[#FF3B4E] font-bold">{validationReport.fraud_label_distribution.fraud_count}</span>
                  </div>
                  <div>
                    <span className="text-[#93C5FD] text-[10px] block">FRAUD %</span>
                    <span className="text-[#93C5FD] font-bold">{validationReport.fraud_label_distribution.fraud_percentage}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quarantine Warning Sample */}
          {validationReport.quarantine_sample && validationReport.quarantine_sample.length > 0 && (
            <div className="p-3 rounded-none bg-[#FF3B4E]/15/30 border border-[#FF3B4E]/30 text-xs space-y-1 font-mono">
              <div className="font-semibold text-[#FF3B4E] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B4E]" />
                <span>Quarantined Records Sample (Will be skipped safely without aborting import):</span>
              </div>
              {validationReport.quarantine_sample.map((err, i) => (
                <div key={i} className="text-[11px] text-[#FF3B4E] pl-4">• {err}</div>
              ))}
            </div>
          )}

          {/* Commit Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#333D50]">
            <div className="text-xs text-[#93C5FD]">
              {validationReport.can_proceed ? (
                <span className="text-[#93C5FD] flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Quality threshold met (&ge; 7.0/10). Dataset ready to commit.</span>
                </span>
              ) : (
                <span className="text-[#93C5FD] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Quality threshold below 7.0. Recommended to check mappings.</span>
                </span>
              )}
            </div>

            <button
              onClick={handleCommitDataset}
              disabled={isUploading}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-electric-600 hover:from-emerald-500 hover:to-electric-500 text-white font-bold text-xs rounded-none shadow-glow-electric transition disabled:opacity-40 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Inserting Transactions & Updating Graph...</span>
                </>
              ) : (
                <>
                  <span>Commit to Database & Rebuild Graph</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* READY-TO-TEST INVESTIGATION CSV DATASETS */}
      <div className="p-6 rounded-none bg-[#252B37]/75 backdrop-blur-2xl border border-[#333D50] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#60A5FA]" />
            <div>
              <h3 className="text-sm font-bold text-white">Ready-to-Test Investigation CSV Datasets</h3>
              <p className="text-[11px] text-[#93C5FD]">
                Pre-loaded in folder <code className="text-[#93C5FD] font-mono">e:\FinTrace\sample_test_csvs\</code>. Click <strong>Test Ingest</strong> to test directly or drag them from your folder.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#252B37] text-[#93C5FD] border border-[#333D50]">
            {readyDatasets.length} Available Datasets
          </span>
        </div>

        {isLoadingDatasets ? (
          <div className="py-8 text-center text-xs text-[#64748B] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#60A5FA]" />
            <span>Loading Ready-to-Test Datasets...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyDatasets.map((item) => (
              <div
                key={item.dataset_id}
                className="p-3.5 rounded-none bg-[#1F242E] border border-[#333D50] hover:border-[#333D50] transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border text-[#93C5FD] border-[#3B82F6]/30 bg-[#3B82F6]/10">
                      {item.tag || item.scenario_category}
                    </span>
                    <span className="text-[10px] text-[#93C5FD] font-mono">
                      {item.rows} rows &bull; Score: {item.quality_score}/10
                    </span>
                  </div>
                  <div className="font-bold text-xs text-white">{item.title}</div>
                  <div className="text-[10px] text-[#93C5FD] mt-1 leading-relaxed">
                    Provenance: <span className="text-[#93C5FD] font-medium">{item.provenance}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[#333D50]">
                  <button
                    onClick={() => handleTestIngest(item)}
                    disabled={activeTestingId === item.dataset_id || isUploading}
                    className="flex-1 py-1.5 px-2 bg-[#3B82F6]/30 hover:bg-[#3B82F6]/50 border border-[#3B82F6]/40 text-[#93C5FD] text-[11px] font-semibold rounded flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                  >
                    {activeTestingId === item.dataset_id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-[#60A5FA]" />
                        <span>Ingesting...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-[#60A5FA] fill-[#60A5FA]" />
                        <span>Test Ingest</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`/sample_test_csvs/${item.filename}`}
                    download={item.filename}
                    className="p-1.5 rounded bg-[#252B37] hover:bg-slate-700 text-[#93C5FD] transition"
                    title="Download CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT INGESTION AUDIT TRAIL */}
      {recentJobs && recentJobs.length > 0 && (
        <div className="p-5 rounded-none bg-[#252B37]/75 backdrop-blur-2xl border border-[#333D50] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Recent Ingestion Jobs & Audit Trail
              </h3>
            </div>
            <span className="text-[10px] text-[#64748B] font-mono">Stored in ingestion_jobs</span>
          </div>

          <div className="overflow-x-auto rounded-none border border-[#333D50]">
            <table className="w-full text-left text-[11px] font-mono text-[#93C5FD]">
              <thead className="bg-[#1F242E] text-[#93C5FD] text-[10px] border-b border-[#333D50] uppercase">
                <tr>
                  <th className="p-2.5">Job ID</th>
                  <th className="p-2.5">File Name</th>
                  <th className="p-2.5">Total Rows</th>
                  <th className="p-2.5">Valid</th>
                  <th className="p-2.5">Invalid</th>
                  <th className="p-2.5">Score</th>
                  <th className="p-2.5">Stage</th>
                  <th className="p-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333D50] bg-[#252B37]/40">
                {recentJobs.slice(0, 5).map((job) => (
                  <tr key={job.job_id} className="hover:bg-[#252B37]/20">
                    <td className="p-2.5 font-bold text-white">{job.job_id}</td>
                    <td className="p-2.5 text-[#93C5FD]">{job.filename}</td>
                    <td className="p-2.5">{job.total_rows}</td>
                    <td className="p-2.5 text-[#93C5FD]">{job.valid_rows}</td>
                    <td className="p-2.5 text-[#FF3B4E]">{job.invalid_rows}</td>
                    <td className="p-2.5 text-[#3B82F6] font-bold">{job.readiness_score}/10</td>
                    <td className="p-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                        job.stage === 'COMPLETED' ? 'bg-[#93C5FD]/10 text-[#93C5FD] border border-[#93C5FD]/20' : 'bg-[#252B37] text-[#93C5FD]'
                      }`}>
                        {job.stage}
                      </span>
                    </td>
                    <td className="p-2.5 text-[#64748B]">{job.created_at?.slice(0, 19).replace('T', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Canonical Required Schema Specification */}
      <div className="p-5 rounded-none bg-[#252B37]/75 backdrop-blur-2xl border border-[#333D50] space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#3B82F6]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            CANONICAL CSV SCHEMA CRITERIA
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {canonicalFieldsConfig.slice(0, 6).map((col) => (
            <div key={col.key} className="p-3 rounded-none bg-[#1F242E] border border-[#333D50]">
              <div className="font-mono text-xs font-bold text-[#3B82F6]">{col.key}</div>
              <div className="text-[10px] text-[#93C5FD] mt-1">{col.desc}</div>
              <div className="mt-2 flex items-center gap-1 text-[9px] text-[#93C5FD] font-mono">
                <Check className="w-3 h-3" />
                <span>{col.required ? 'MANDATORY' : 'OPTIONAL'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
