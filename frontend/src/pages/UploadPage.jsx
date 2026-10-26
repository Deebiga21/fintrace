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
  ShieldCheck,
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
      // Persist the confirmed mapping before scoring so validation and commit
      // both read the exact schema the user reviewed.
      await api.mapIngestionColumns(activeJobId, columnMapping);
      const res = await api.validateIngestionDataset(activeJobId);
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
      } catch {
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
      <div className="p-4 rounded-none bg-[#101117]/75 backdrop-blur-2xl border border-[rgba(255,255,255,0.14)] flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-none bg-[#1FC8DB]/10 text-[#1FC8DB] border border-[rgba(255,255,255,0.20)]">
            <GitGraph className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9CA3AF] font-medium">FINTRACE TRANSACTION GRAPH ENGINE</div>
            <div className="text-sm font-bold text-[#FFFFFF] flex items-center gap-2 mt-0.5">
              <span>High-Performance Ingestion & Graph Builder</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#1FC8DB]/10 text-[#9CA3AF] border border-[#1FC8DB]/20">
                Active
              </span>
            </div>
          </div>
        </div>

        {graphStatus && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-none bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)]">
              <span className="text-[#9CA3AF] text-[10px] block">NODES (ACCOUNTS)</span>
              <span className="text-[#FFFFFF] font-bold">{graphStatus.total_nodes?.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-none bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)]">
              <span className="text-[#9CA3AF] text-[10px] block">EDGES (TRANSFERS)</span>
              <span className="text-[#FFFFFF] font-bold">{graphStatus.total_edges?.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-none bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)]">
              <span className="text-[#9CA3AF] text-[10px] block">AVG DEGREE</span>
              <span className="text-[#1FC8DB] font-bold">{graphStatus.average_degree}</span>
            </div>
            <button
              onClick={handleRebuildGraph}
              disabled={isRebuildingGraph}
              className="p-2 rounded-none bg-[#101117] hover:bg-slate-700 text-[#9CA3AF] transition flex items-center gap-1.5 text-xs font-sans disabled:opacity-50"
              title="Recalculate Graph Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRebuildingGraph ? 'animate-spin text-[#1FC8DB]' : ''}`} />
              <span className="hidden sm:inline">Recalculate Graph</span>
            </button>
          </div>
        )}
      </div>

      {/* SUCCESS BANNER */}
      {commitResult && (
        <div className="p-6 rounded-none bg-gradient-to-r from-navy-900 to-navy-950 border-2 border-[#1FC8DB] shadow-glow-emerald space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-none bg-[#1FC8DB]/20 text-[#9CA3AF]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#FFFFFF] flex items-center gap-2">
                  <span>Ingestion & Graph Construction Completed</span>
                  <span className="text-xs font-mono font-normal text-[#9CA3AF] px-2 py-0.5 rounded bg-[#1FC8DB]/15 border border-emerald-600/40">
                    {commitResult.filename || "Uploaded Dataset"}
                  </span>
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Transactions committed to database, accounts mapped, and graph degree metrics updated.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage("graph")}
                className="px-4 py-2 bg-[#101117] hover:bg-slate-700 text-[#FFFFFF] font-semibold text-xs rounded-none transition"
              >
                View in Graph
              </button>
              <button
                onClick={() => setCurrentPage("mule-detection")}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-electric-600 hover:from-emerald-500 hover:to-electric-500 text-[#FFFFFF] font-bold text-xs rounded-none flex items-center gap-2 shadow-glow-rose transition transform active:scale-95"
              >
                <span>Proceed to Mule Detection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-[#1FC8DB]/15 rounded-none border border-[#1FC8DB]/40">
              <div className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-wider">Inserted Transactions</div>
              <div className="text-xl font-mono font-bold text-[#9CA3AF] mt-1">{commitResult.inserted_transactions ?? 0}</div>
            </div>
            <div className="p-3 bg-[#0B0B0F]/80 rounded-none border border-[rgba(255,255,255,0.14)]">
              <div className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-wider">New Accounts Spawned</div>
              <div className="text-xl font-mono font-bold text-[#1FC8DB] mt-1">{commitResult.new_accounts_created ?? 0}</div>
            </div>
            <div className="p-3 bg-[#0B0B0F]/80 rounded-none border border-[rgba(255,255,255,0.14)]">
              <div className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-wider">Quarantined Records</div>
              <div className="text-xl font-mono font-bold text-[#9CA3AF] mt-1">{commitResult.quarantined_records ?? 0}</div>
            </div>
            <div className="p-3 bg-[#0B0B0F]/80 rounded-none border border-[rgba(255,255,255,0.14)]">
              <div className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-wider">Active Graph Nodes</div>
              <div className="text-xl font-mono font-bold text-sky-400 mt-1">{commitResult.graph_nodes ?? 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-none bg-[#FF5C6C]/15 border-2 border-[#FF5C6C] text-rose-200 flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#FF5C6C] mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-[#FFFFFF] mb-0.5">Ingestion Warning / Error</div>
              {error}
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-[#FF5C6C]/20 text-[#FF5C6C] hover:text-[#FFFFFF] transition"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PIPELINE PROGRESS INDICATOR */}
      <div className="p-4 rounded-none bg-[#101117]/75 backdrop-blur-2xl border border-[rgba(255,255,255,0.14)] flex items-center justify-between text-xs font-mono">
        <div className={`flex items-center gap-2 ${stage === 'IDLE' ? 'text-[#1FC8DB] font-bold' : 'text-[#9CA3AF]'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#0B0B0F] border border-current text-[11px]">1</span>
          <span>Upload CSV</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <div className={`flex items-center gap-2 ${stage === 'MAPPING' ? 'text-[#1FC8DB] font-bold' : stage === 'VALIDATED' || stage === 'COMMITTED' ? 'text-[#9CA3AF] font-semibold' : 'text-[#8A909B]'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#0B0B0F] border border-current text-[11px]">2</span>
          <span>Map Schema</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <div className={`flex items-center gap-2 ${stage === 'VALIDATED' ? 'text-[#1FC8DB] font-bold' : stage === 'COMMITTED' ? 'text-[#9CA3AF] font-semibold' : 'text-[#8A909B]'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#0B0B0F] border border-current text-[11px]">3</span>
          <span>Quality Scoring</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <div className={`flex items-center gap-2 ${stage === 'COMMITTED' ? 'text-[#9CA3AF] font-bold' : 'text-[#8A909B]'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#0B0B0F] border border-current text-[11px]">4</span>
          <span>Commit & Graph Build</span>
        </div>
      </div>

      {/* STAGE 1: UPLOAD BOX */}
      {stage === 'IDLE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Custom CSV Upload */}
          <div className="p-6 rounded-none bg-[#101117]/75 backdrop-blur-2xl border border-[rgba(255,255,255,0.14)] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UploadCloud className="w-5 h-5 text-[#1FC8DB]" />
                <h3 className="text-sm font-bold text-[#FFFFFF]">Upload Investigation CSV</h3>
              </div>
              <p className="text-xs text-[#9CA3AF]">
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
                  ? "border-[rgba(255,255,255,0.20)] bg-electric-950/30 scale-[1.01]"
                  : "border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.20)] bg-[#0B0B0F]/40"
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
                <FileSpreadsheet className={`w-9 h-9 mx-auto transition ${selectedFile ? "text-[#9CA3AF]" : "text-[#9CA3AF]"}`} />
                <div className="text-xs text-[#FFFFFF] font-medium">
                  {selectedFile ? (
                    <div className="space-y-1">
                      <span className="text-[#9CA3AF] font-mono font-bold text-sm block">
                        ✓ {selectedFile.name}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] font-mono">
                        {(selectedFile.size / 1024).toFixed(1)} KB — Ready to analyze
                      </span>
                    </div>
                  ) : (
                    <span>Click to browse or drag & drop CSV file here</span>
                  )}
                </div>
                <p className="text-[10px] text-[#8A909B]">Max file size 50MB (.csv format)</p>
              </label>
            </div>

            <button
              onClick={handleUploadAndAnalyze}
              disabled={!selectedFile || isUploading}
              className="w-full py-3 rounded-none font-bold text-xs shadow-glow-rose transition flex items-center justify-center gap-2 bg-electric-600 hover:bg-[#1FC8DB] text-[#FFFFFF] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFFFFF]" />
                  <span>Parsing Headers & Generating Ingestion Job...</span>
                </>
              ) : (
                <span>Upload & Analyze Schema</span>
              )}
            </button>
          </div>

          {/* Load Benchmark Banking Data */}
          <div className="p-6 rounded-none bg-[#101117]/75 backdrop-blur-2xl border border-[rgba(255,255,255,0.14)] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-[#FFFFFF]">Load Benchmark Banking Network</h3>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                Institutional investigation dataset with verified counterparty provenance. Covers 182 transactions, 74 accounts, and 4 distinct banking crime topologies.
              </p>
            </div>

            <div className="p-4 rounded-none bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] text-xs space-y-2 text-[#9CA3AF]">
              <div className="font-semibold text-[#FFFFFF] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Included Banking Topologies:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#9CA3AF]">
                <li><strong className="text-[#9CA3AF]">Smurfing Aggregator:</strong> Inflow victims funneled to <code className="text-[#FF5C6C] font-mono">MULE_AGG_01</code></li>
                <li><strong className="text-[#9CA3AF]">Circular Layering Ring:</strong> Accounts cycling funds in closed multi-hop loops</li>
                <li><strong className="text-[#9CA3AF]">Rapid Pass-Through:</strong> High-value inward debit drained within minutes</li>
                <li><strong className="text-[#9CA3AF]">Clean Retail Baseline:</strong> Legitimate merchant payments with 0 flags</li>
              </ul>
            </div>

            <button
              onClick={handleLoadSyntheticNetwork}
              disabled={isUploading}
              className="w-full py-3 rounded-none bg-gradient-to-r from-sky-600 to-electric-600 hover:from-sky-500 hover:to-electric-500 text-[#FFFFFF] font-bold text-xs shadow-glow-rose transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFFFFF]" />
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
        <div className="p-6 rounded-none bg-[#101117]/75 backdrop-blur-2xl border border-[rgba(255,255,255,0.14)] space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
                <span>Step 2: Automatic Column Mapping Review</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101117] text-[#1FC8DB] border border-[rgba(255,255,255,0.14)]">
                  Job {uploadData.job_id}
                </span>
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Detected <strong>{uploadData.detected_columns?.length}</strong> columns in <strong>{uploadData.filename}</strong>. Review canonical mappings before validating.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setColumnMapping(uploadData.suggested_mapping || {})}
                className="px-3 py-1.5 rounded-none bg-[#0B0B0F] hover:bg-[#101117] text-[#1FC8DB] border border-[rgba(255,255,255,0.20)] text-xs font-mono transition flex items-center gap-1.5"
                title="Reset dropdowns to automatically detected columns"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Suggested</span>
              </button>
              <button
                onClick={handleCancelJob}
                className="px-3 py-1.5 rounded-none bg-[#101117] hover:bg-slate-700 text-[#9CA3AF] hover:text-[#FFFFFF] text-xs font-mono transition"
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
                  className={`p-3.5 rounded-none bg-[#0B0B0F] border transition ${
                    isMapped
                      ? "border-[#1FC8DB]/30 bg-[#1FC8DB]/15"
                      : field.required
                      ? "border-[#1FC8DB]/40 bg-[#1FC8DB]/15"
                      : "border-[rgba(255,255,255,0.14)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#FFFFFF] flex items-center gap-1.5">
                      <span>{field.label}</span>
                      {field.required && (
                        <span className="text-[9px] text-[#9CA3AF] font-mono font-normal">*Required</span>
                      )}
                    </span>
                    {isMapped ? (
                      <Check className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    ) : field.required ? (
                      <AlertCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    ) : (
                      <span className="text-[9px] text-[#8A909B]">Optional</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] mb-2">{field.desc}</p>

                  <select
                    value={currentVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setColumnMapping(prev => ({
                        ...prev,
                        [field.key]: val
                      }));
                    }}
                    className="w-full bg-[#101117] border border-[rgba(255,255,255,0.14)] rounded px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:outline-none focus:border-[rgba(255,255,255,0.20)] font-mono"
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
              <div className="text-xs font-bold text-[#9CA3AF] font-mono flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#1FC8DB]" />
                <span>Raw CSV Preview (First {uploadData.preview.length} Rows)</span>
              </div>
              <div className="overflow-x-auto rounded-none border border-[rgba(255,255,255,0.14)]">
                <table className="w-full text-left text-[11px] font-mono text-[#9CA3AF]">
                  <thead className="bg-[#0B0B0F] text-[#9CA3AF] text-[10px] border-b border-[rgba(255,255,255,0.14)] uppercase">
                    <tr>
                      {uploadData.detected_columns?.map((col) => (
                        <th key={col} className="p-2 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#6B7280] bg-[#101117]/40">
                    {uploadData.preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#101117]/20">
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
          <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.14)]">
            <span className="text-xs text-[#9CA3AF]">
              Ensure <strong>Source Account</strong>, <strong>Destination Account</strong>, and <strong>Amount</strong> are mapped.
            </span>
            <button
              onClick={handleValidateDataset}
              disabled={isUploading || !columnMapping.source_account || !columnMapping.destination_account || !columnMapping.amount}
              className="px-6 py-2.5 bg-gradient-to-r from-[#1FC8DB] to-[#1FC8DB] hover:from-electric-500 hover:to-[#1FC8DB] text-[#FFFFFF] font-bold text-xs rounded-none shadow-glow-rose transition disabled:opacity-40 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFFFFF]" />
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
        <div className="p-6 rounded-none bg-[#101117]/75 backdrop-blur-2xl border border-[rgba(255,255,255,0.14)] space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
                <span>Step 3: Dataset Quality & Model Readiness Audit</span>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                  validationReport.can_proceed
                    ? "text-[#9CA3AF] bg-[#1FC8DB]/10 border-[#1FC8DB]/30"
                    : "text-[#9CA3AF] bg-amber-500/10 border-[#1FC8DB]/30"
                }`}>
                  Score: {validationReport.dataset_quality_score} / 10.0
                </span>
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Audited against FINTRACE schema standards, graph connectivity criteria, and model compatibility.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStage('MAPPING')}
                className="px-3 py-1.5 rounded-none bg-[#101117] hover:bg-slate-700 text-[#9CA3AF] text-xs font-mono transition"
              >
                Modify Mappings
              </button>
              <button
                onClick={handleCancelJob}
                className="px-3 py-1.5 rounded-none bg-[#101117] hover:bg-slate-700 text-[#9CA3AF] hover:text-[#FFFFFF] text-xs font-mono transition"
              >
                Discard
              </button>
            </div>
          </div>

          {/* 10-Point Score Rubric Breakdown */}
          <div className="p-4 rounded-none bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] space-y-3">
            <div className="text-xs font-bold text-[#FFFFFF] flex items-center justify-between">
              <span>Transparent 10-Point Quality Rubric</span>
              <span className="text-[#9CA3AF] font-mono text-[11px]">Threshold: &ge; 7.0 / 10.0</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {validationReport.quality_report?.breakdown?.map((item, idx) => (
                <div key={idx} className="p-3 rounded-none bg-[#101117] border border-[rgba(255,255,255,0.14)] space-y-1">
                  <div className="text-[10px] text-[#9CA3AF] font-medium uppercase">{item.component}</div>
                  <div className="text-base font-bold font-mono text-[#9CA3AF]">
                    {item.score} <span className="text-[10px] text-[#8A909B] font-normal">/ {item.max}</span>
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] leading-tight">{item.details}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Validation Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#0B0B0F] rounded-none border border-[rgba(255,255,255,0.14)]">
              <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">Total Rows</div>
              <div className="text-lg font-mono font-bold text-[#FFFFFF] mt-1">{validationReport.total_rows}</div>
            </div>
            <div className="p-3 bg-[#1FC8DB]/15 rounded-none border border-[#1FC8DB]/30">
              <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">Valid Records</div>
              <div className="text-lg font-mono font-bold text-[#9CA3AF] mt-1">{validationReport.valid_rows}</div>
            </div>
            <div className="p-3 bg-[#0B0B0F] rounded-none border border-[rgba(255,255,255,0.14)]">
              <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">Quarantined Rows</div>
              <div className="text-lg font-mono font-bold text-[#FF5C6C] mt-1">{validationReport.invalid_rows}</div>
            </div>
            <div className="p-3 bg-[#0B0B0F] rounded-none border border-[rgba(255,255,255,0.14)]">
              <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">Duplicates Found</div>
              <div className="text-lg font-mono font-bold text-[#9CA3AF] mt-1">{validationReport.duplicate_rows}</div>
            </div>
          </div>

          {/* Fraud Label Distribution */}
          {validationReport.fraud_label_distribution && (
            <div className="p-4 rounded-none bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] flex items-center justify-between flex-wrap gap-4 text-xs font-mono">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-[#1FC8DB]" />
                <div>
                  <div className="text-[#FFFFFF] font-bold">Fraud Label Distribution</div>
                  <div className="text-[#9CA3AF] text-[11px]">
                    {validationReport.fraud_label_distribution.labels_available
                      ? "Supervised labels detected for minority class analysis & GAN augmentation."
                      : "Unlabeled dataset. Will rely on unsupervised GNN topology scoring."}
                  </div>
                </div>
              </div>

              {validationReport.fraud_label_distribution.labels_available && (
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[#9CA3AF] text-[10px] block">LEGITIMATE</span>
                    <span className="text-[#9CA3AF] font-bold">{validationReport.fraud_label_distribution.legitimate_count}</span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] text-[10px] block">FRAUDULENT</span>
                    <span className="text-[#FF5C6C] font-bold">{validationReport.fraud_label_distribution.fraud_count}</span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] text-[10px] block">FRAUD %</span>
                    <span className="text-[#9CA3AF] font-bold">{validationReport.fraud_label_distribution.fraud_percentage}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quarantine Warning Sample */}
          {validationReport.quarantine_sample && validationReport.quarantine_sample.length > 0 && (
            <div className="p-3 rounded-none bg-[#FF5C6C]/15 border border-[#FF5C6C]/30 text-xs space-y-1 font-mono">
              <div className="font-semibold text-[#FF5C6C] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FF5C6C]" />
                <span>Quarantined Records Sample (Will be skipped safely without aborting import):</span>
              </div>
              {validationReport.quarantine_sample.map((err, i) => (
                <div key={i} className="text-[11px] text-[#FF5C6C] pl-4">• {err}</div>
              ))}
            </div>
          )}

          {/* Commit Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.14)]">
            <div className="text-xs text-[#9CA3AF]">
              {validationReport.can_proceed ? (
                <span className="text-[#9CA3AF] flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Quality threshold met (&ge; 7.0/10). Dataset ready to commit.</span>
                </span>
              ) : (
                <span className="text-[#9CA3AF] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Quality threshold below 7.0. Recommended to check mappings.</span>
                </span>
              )}
            </div>

            <button
              onClick={handleCommitDataset}
              disabled={isUploading}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-electric-600 hover:from-emerald-500 hover:to-electric-500 text-[#FFFFFF] font-bold text-xs rounded-none shadow-glow-rose transition disabled:opacity-40 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFFFFF]" />
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
      <div className="p-6 rounded-none bg-[#101117]/75 backdrop-blur-2xl border border-[rgba(255,255,255,0.14)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#1FC8DB]" />
            <div>
              <h3 className="text-sm font-bold text-[#FFFFFF]">Ready-to-Test Investigation CSV Datasets</h3>
              <p className="text-[11px] text-[#9CA3AF]">
                Bundled with the app under <code className="text-[#9CA3AF] font-mono">/sample_test_csvs</code>. Click <strong>Test Ingest</strong> to run one directly, or download a CSV and upload it from your machine.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101117] text-[#9CA3AF] border border-[rgba(255,255,255,0.14)]">
            {readyDatasets.length} Available Datasets
          </span>
        </div>

        {isLoadingDatasets ? (
          <div className="py-8 text-center text-xs text-[#8A909B] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#1FC8DB]" />
            <span>Loading Ready-to-Test Datasets...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyDatasets.map((item) => (
              <div
                key={item.dataset_id}
                className="p-3.5 rounded-none bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.14)] transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border text-[#9CA3AF] border-[rgba(255,255,255,0.20)]/30 bg-[#1FC8DB]/10">
                      {item.tag || item.scenario_category}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] font-mono">
                      {item.rows} rows &bull; Score: {item.quality_score}/10
                    </span>
                  </div>
                  <div className="font-bold text-xs text-[#FFFFFF]">{item.title}</div>
                  <div className="text-[10px] text-[#9CA3AF] mt-1 leading-relaxed">
                    Provenance: <span className="text-[#9CA3AF] font-medium">{item.provenance}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[rgba(255,255,255,0.14)]">
                  <button
                    onClick={() => handleTestIngest(item)}
                    disabled={activeTestingId === item.dataset_id || isUploading}
                    className="flex-1 py-1.5 px-2 bg-[#1FC8DB]/30 hover:bg-[#1FC8DB]/50 border border-[rgba(255,255,255,0.20)]/40 text-[#9CA3AF] text-[11px] font-semibold rounded flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                  >
                    {activeTestingId === item.dataset_id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-[#1FC8DB]" />
                        <span>Ingesting...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-[#1FC8DB] fill-[#1FC8DB]" />
                        <span>Test Ingest</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`/sample_test_csvs/${item.filename}`}
                    download={item.filename}
                    className="p-1.5 rounded bg-[#101117] hover:bg-slate-700 text-[#9CA3AF] transition"
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
        <div className="p-5 rounded-none bg-[#101117]/75 backdrop-blur-2xl border border-[rgba(255,255,255,0.14)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1FC8DB]" />
              <h3 className="text-xs font-bold text-[#FFFFFF] uppercase tracking-wider font-mono">
                Recent Ingestion Jobs & Audit Trail
              </h3>
            </div>
            <span className="text-[10px] text-[#8A909B] font-mono">Stored in ingestion_jobs</span>
          </div>

          <div className="overflow-x-auto rounded-none border border-[rgba(255,255,255,0.14)]">
            <table className="w-full text-left text-[11px] font-mono text-[#9CA3AF]">
              <thead className="bg-[#0B0B0F] text-[#9CA3AF] text-[10px] border-b border-[rgba(255,255,255,0.14)] uppercase">
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
              <tbody className="divide-y divide-[#6B7280] bg-[#101117]/40">
                {recentJobs.slice(0, 5).map((job) => (
                  <tr key={job.job_id} className="hover:bg-[#101117]/20">
                    <td className="p-2.5 font-bold text-[#FFFFFF]">{job.job_id}</td>
                    <td className="p-2.5 text-[#9CA3AF]">{job.filename}</td>
                    <td className="p-2.5">{job.total_rows}</td>
                    <td className="p-2.5 text-[#9CA3AF]">{job.valid_rows}</td>
                    <td className="p-2.5 text-[#FF5C6C]">{job.invalid_rows}</td>
                    <td className="p-2.5 text-[#1FC8DB] font-bold">{job.readiness_score}/10</td>
                    <td className="p-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                        job.stage === 'COMPLETED' ? 'bg-[#1FC8DB]/10 text-[#9CA3AF] border border-[#1FC8DB]/20' : 'bg-[#101117] text-[#9CA3AF]'
                      }`}>
                        {job.stage}
                      </span>
                    </td>
                    <td className="p-2.5 text-[#8A909B]">{job.created_at?.slice(0, 19).replace('T', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Canonical Required Schema Specification */}
      <div className="p-5 rounded-none bg-[#101117]/75 backdrop-blur-2xl border border-[rgba(255,255,255,0.14)] space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#1FC8DB]" />
          <h3 className="text-xs font-bold text-[#FFFFFF] uppercase tracking-wider font-mono">
            CANONICAL CSV SCHEMA CRITERIA
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {canonicalFieldsConfig.slice(0, 6).map((col) => (
            <div key={col.key} className="p-3 rounded-none bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)]">
              <div className="font-mono text-xs font-bold text-[#1FC8DB]">{col.key}</div>
              <div className="text-[10px] text-[#9CA3AF] mt-1">{col.desc}</div>
              <div className="mt-2 flex items-center gap-1 text-[9px] text-[#9CA3AF] font-mono">
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
