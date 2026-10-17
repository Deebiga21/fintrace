import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { api } from '../services/api';

export default function UploadPage({ setCurrentPage, setRefreshTrigger }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);

    try {
      const res = await api.uploadTransactionsCsv(selectedFile);
      setResult(res.result);
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to process and ingest CSV.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadSample = async () => {
    setIsUploading(true);
    setError(null);
    try {
      const res = await api.loadSampleDataset();
      setResult(res.result);
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to load sample dataset.");
    } finally {
      setIsUploading(false);
    }
  };

  const requiredCols = [
    { name: "transaction_id", desc: "Unique transaction identifier" },
    { name: "sender_account", desc: "Originating entity account number" },
    { name: "receiver_account", desc: "Beneficiary entity account number" },
    { name: "amount", desc: "Numeric transfer value in currency" },
    { name: "timestamp", desc: "ISO 8601 or standard datetime" },
    { name: "status", desc: "COMPLETED / PENDING / FAILED" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overview Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide">
          Step 1: Transaction Data Ingestion & Ingestion Pipeline
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Ingest institutional transaction CSVs with real-time schema validation, deduplication, and automated graph node creation.
        </p>
      </div>

      {/* Main Upload & Demo Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Custom CSV Upload */}
        <div className="p-6 rounded-xl bg-navy-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UploadCloud className="w-5 h-5 text-electric-400" />
              <h3 className="text-sm font-bold text-white">Upload Investigation CSV</h3>
            </div>
            <p className="text-xs text-slate-400">
              Upload standard banking or core-banking ledger export in CSV format.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-700 hover:border-electric-500/60 rounded-xl p-6 text-center cursor-pointer transition bg-navy-950/40">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer space-y-2 block">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-200 font-medium">
                {selectedFile ? (
                  <span className="text-electric-400 font-mono">{selectedFile.name}</span>
                ) : (
                  <span>Click to select or drag CSV file</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500">Max file size 50MB (.csv format)</p>
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full py-2.5 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs shadow-glow-electric transition disabled:opacity-40"
          >
            {isUploading ? "Validating & Ingesting..." : "Process & Ingest CSV"}
          </button>
        </div>

        {/* Load Synthetic Sample Data */}
        <div className="p-6 rounded-xl bg-navy-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Load Pre-Packaged Synthetic Network</h3>
            </div>
            <p className="text-xs text-slate-400">
              Instant demonstration dataset clearly labelled as synthetic. Simulates 182 transactions, 74 accounts, 4 distinct fraud topologies, and correlated cyber fraud complaints.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-navy-950 border border-slate-800 text-xs space-y-2 text-slate-300">
            <div className="font-semibold text-slate-200">Included Synthetic Scenarios:</div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
              <li><strong className="text-slate-300">Smurfing Aggregator:</strong> 6 phishing victims funneled to <code className="text-rose-400 font-mono">MULE_AGG_01</code></li>
              <li><strong className="text-slate-300">Circular Layering Ring:</strong> 4 accounts passing funds in closed cycle</li>
              <li><strong className="text-slate-300">Rapid Pass-Through:</strong> High value inward debit drained in 15 mins</li>
              <li><strong className="text-slate-300">Legitimate Baseline:</strong> Salaries & merchant retail transactions</li>
            </ul>
          </div>

          <button
            onClick={handleLoadSample}
            disabled={isUploading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-600 to-electric-600 hover:from-sky-500 hover:to-electric-500 text-white font-bold text-xs shadow-glow-electric transition disabled:opacity-40"
          >
            {isUploading ? "Loading Network..." : "Load Sample Fraud Network"}
          </button>
        </div>
      </div>

      {/* Required Schema Specification */}
      <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-electric-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            REQUIRED CSV SCHEMA VALIDATION CRITERIA
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {requiredCols.map((col) => (
            <div key={col.name} className="p-3 rounded-lg bg-navy-950 border border-slate-800">
              <div className="font-mono text-xs font-bold text-electric-300">{col.name}</div>
              <div className="text-[10px] text-slate-400 mt-1">{col.desc}</div>
              <div className="mt-2 flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                <Check className="w-3 h-3" />
                <span>MANDATORY</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ingestion Results Statistics Banner */}
      {result && (
        <div className="p-6 rounded-xl bg-navy-900 border border-emerald-500/40 shadow-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Ingestion Completed Successfully: {result.filename}
              </h3>
            </div>
            <button
              onClick={() => setCurrentPage("mule-detection")}
              className="px-4 py-1.5 bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition"
            >
              <span>Proceed to Mule Detection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-navy-950 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Total Rows</div>
              <div className="text-lg font-mono font-bold text-white">{result.total_records}</div>
            </div>
            <div className="p-3 bg-emerald-950/40 rounded-lg border border-emerald-500/30">
              <div className="text-[10px] text-emerald-300">Valid Records</div>
              <div className="text-lg font-mono font-bold text-emerald-400">{result.valid_records}</div>
            </div>
            <div className="p-3 bg-navy-950 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Duplicates Filtered</div>
              <div className="text-lg font-mono font-bold text-amber-400">{result.duplicate_records}</div>
            </div>
            <div className="p-3 bg-navy-950 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Invalid Rows</div>
              <div className="text-lg font-mono font-bold text-rose-400">{result.invalid_records}</div>
            </div>
            <div className="p-3 bg-navy-950 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Accounts Spawned</div>
              <div className="text-lg font-mono font-bold text-electric-400">{result.new_accounts_created}</div>
            </div>
          </div>

          {result.errors_sample && result.errors_sample.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs space-y-1">
              <div className="font-semibold text-rose-300">Validation Warnings / Rejected Rows:</div>
              {result.errors_sample.map((err, i) => (
                <div key={i} className="text-[11px] text-rose-400 font-mono">• {err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <div className="text-xs">{error}</div>
        </div>
      )}
    </div>
  );
}
