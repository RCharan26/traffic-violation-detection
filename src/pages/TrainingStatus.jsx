import React, { useState, useEffect } from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import { 
  CheckCircle, AlertCircle, Play, Database, Server, Copy, 
  RefreshCw, Terminal, Clock, FileText, Zap, HelpCircle
} from 'lucide-react';
import { api } from '../services/api.js';

export default function TrainingStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchStatus = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getTrainingStatus();
      setStatus(data);
    } catch (err) {
      console.error("Failed to load training status:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopy = (command, id) => {
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderCommand = (title, cmd, id) => {
    const isCopied = copiedId === id;
    return (
      <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-950/80 border border-white/5 font-mono text-xs">
        <div className="flex justify-between items-center text-slate-500 text-[10px] uppercase font-bold tracking-wider">
          <span>{title}</span>
          <button 
            onClick={() => handleCopy(cmd, id)}
            className="flex items-center gap-1 hover:text-white transition-colors py-0.5 px-2 rounded bg-white/[0.03] border border-white/5 active:bg-white/10"
          >
            <Copy size={10} />
            <span>{isCopied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <div className="text-blue-400 select-all truncate whitespace-pre-wrap">{cmd}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <PageShell
        label="Training Pipeline"
        title="Training & Setup Status"
        subtitle="Check dataset splits, trained model weights, evaluation metrics, and benchmarking configurations"
        accent
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-sm text-slate-400 font-medium">Querying pipeline registry status...</p>
        </div>
      </PageShell>
    );
  }

  // Model keys mapping
  const models = [
    {
      key: 'vehicle',
      name: 'Vehicle Detector',
      customWeights: 'trafficvision_vehicle.pt',
      baseWeights: 'yolo11n.pt',
      trainCmd: 'python train_vehicle.py',
      evalFile: 'vehicle_metrics.json',
      datasetFolder: 'vehicle',
      description: 'Locates vehicle categories (cars, motorcycles, buses, trucks, etc.) and pedestrians.'
    },
    {
      key: 'helmet',
      name: 'Helmet Classifier',
      customWeights: 'trafficvision_helmet.pt',
      baseWeights: 'helmet.pt',
      trainCmd: 'python train_helmet.py',
      evalFile: 'helmet_metrics.json',
      datasetFolder: 'helmet',
      description: 'Detects missing helmet safety violations for two-wheeler operators & pillion riders.'
    },
    {
      key: 'plate',
      name: 'License Plate Detector',
      customWeights: 'trafficvision_plate.pt',
      baseWeights: 'license_plate.pt',
      trainCmd: 'python train_plate.py',
      evalFile: 'plate_metrics.json',
      datasetFolder: 'license_plate',
      description: 'Localizes license plates under high aspect ratio variations for OCR extraction.'
    }
  ];

  return (
    <PageShell
      label="Training Pipeline"
      title="Training & Setup Status"
      subtitle="Check dataset splits, trained model weights, evaluation metrics, and benchmarking configurations"
      accent
    >
      {/* Overview stats & action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 p-4 rounded-2xl bg-white/[0.015] border border-white/5">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">System Pipeline Diagnostics</h2>
          <p className="text-xs text-slate-500 mt-1">Status as of: {new Date().toLocaleTimeString()}</p>
        </div>
        <button
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-xs font-semibold text-white transition-all shadow-md active:scale-95 flex-shrink-0"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {models.map(model => {
          const modelData = status?.models?.[model.key];
          const dataset = status?.datasets?.[model.key];
          const fileInfo = modelData?.file;
          const metrics = modelData?.metrics;

          // Compute status
          const hasDataset = dataset?.exists && Object.values(dataset.splits).some(s => s.images > 0);
          const hasWeights = fileInfo?.exists;
          const hasEval = !!metrics;

          return (
            <div key={model.key} className="card p-5 flex flex-col justify-between h-full space-y-5">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">{model.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{model.description}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    hasWeights 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {hasWeights ? 'Custom Active' : 'Base Fallback'}
                  </span>
                </div>

                <hr className="border-white/5" />

                {/* 1. Dataset Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Database size={13} className="text-blue-400" />
                      1. Dataset Status
                    </span>
                    {hasDataset ? (
                      <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold"><CheckCircle size={10} /> Ready</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold"><AlertCircle size={10} /> Missing</span>
                    )}
                  </div>
                  {dataset?.exists ? (
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      {Object.entries(dataset.splits).map(([split, counts]) => (
                        <div key={split} className="text-center">
                          <p className="text-[9px] uppercase font-bold text-slate-600">{split}</p>
                          <p className="text-[11px] font-bold text-slate-300 mt-0.5">{counts.images} img</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{counts.labels} labels</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80 leading-relaxed">
                      Dataset folder <code className="text-[11px] font-mono bg-white/5 px-1 py-0.5 rounded text-amber-300">datasets/{model.datasetFolder}</code> was not found. Please run the dataset setup/download script.
                    </div>
                  )}
                </div>

                {/* 2. Custom Weights Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Server size={13} className="text-purple-400" />
                      2. Model Weights
                    </span>
                    {hasWeights ? (
                      <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold"><CheckCircle size={10} /> Trained</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold"><AlertCircle size={10} /> Base Fallback</span>
                    )}
                  </div>
                  {hasWeights ? (
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/15 space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Weights Name:</span>
                        <span className="font-bold font-mono text-green-400">{model.customWeights}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>File Size:</span>
                        <span className="font-bold text-slate-200">{formatBytes(fileInfo.size_bytes)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Trained On:</span>
                        <span className="font-semibold text-slate-300">{formatDate(fileInfo.modified_at)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80 leading-relaxed space-y-1">
                      <p>Custom weights not found. System falls back to base weights: <code className="text-[11px] font-mono text-amber-300 bg-white/5 px-1 rounded">{model.baseWeights}</code>.</p>
                    </div>
                  )}
                </div>

                {/* 3. Evaluation Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={13} className="text-teal-400" />
                      3. Evaluation Metrics
                    </span>
                    {hasEval ? (
                      <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold"><CheckCircle size={10} /> Complete</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold"><HelpCircle size={10} /> Unverified</span>
                    )}
                  </div>
                  {hasEval ? (
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/15 text-center">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-500">mAP@0.5</p>
                        <p className="text-xs font-black text-teal-400 mt-0.5">
                          {metrics.metrics?.mAP50 ? `${Math.round(metrics.metrics.mAP50 * 1000) / 10}%` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-500">Precision</p>
                        <p className="text-xs font-black text-teal-400 mt-0.5">
                          {metrics.metrics?.precision ? `${Math.round(metrics.metrics.precision * 1000) / 10}%` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-500">Recall</p>
                        <p className="text-xs font-black text-teal-400 mt-0.5">
                          {metrics.metrics?.recall ? `${Math.round(metrics.metrics.recall * 1000) / 10}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-500 leading-relaxed">
                      No evaluation record found for this model variant.
                    </div>
                  )}
                </div>
              </div>

              {/* Commands wrapper */}
              <div className="space-y-2 pt-4">
                {renderCommand("Train Model", model.trainCmd, `${model.key}-train`)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Global Tasks: Datasets Setup, Evaluation and Benchmarking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datasets Setup & Evaluation */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="text-blue-400" size={16} />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Dataset Verification & Integrations</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Use the following commands to split datasets, verify their annotations (checks bounding box constraints and formats), or prepare directory structures.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {renderCommand("Dataset Integrations", "python fix_dataset_integration.py", "ds-integration")}
            {renderCommand("Dataset Splits", "python resplit_datasets.py", "ds-splits")}
            {renderCommand("Setup Directory & Configs", "python setup_training.py", "ds-setup")}
            {renderCommand("Evaluate All Models", "python evaluate_models.py", "eval-all")}
          </div>
        </div>

        {/* Benchmarking & Performance */}
        <div className="card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="text-amber-400" size={16} />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Computational Benchmarking</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Test inference speeds across different processing hardware (CPU/GPU) to find potential bottlenecks. Running a benchmark creates a detailed performance profile.
            </p>

            {status?.benchmark ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="text-center border-r border-white/5">
                  <p className="text-[9px] uppercase font-bold text-slate-500">Benchmark Date</p>
                  <p className="text-xs font-bold text-slate-200 mt-1 truncate">
                    {status.benchmark.timestamp ? formatDate(status.benchmark.timestamp) : 'Complete'}
                  </p>
                </div>
                <div className="text-center border-r border-white/5">
                  <p className="text-[9px] uppercase font-bold text-slate-500">Device</p>
                  <p className="text-xs font-bold text-slate-200 mt-1 uppercase">
                    {status.benchmark.device || 'CPU'}
                  </p>
                </div>
                <div className="text-center border-r border-white/5">
                  <p className="text-[9px] uppercase font-bold text-slate-500">Latency</p>
                  <p className="text-xs font-black text-amber-400 mt-1">
                    {status.benchmark.latency_ms ? `${Math.round(status.benchmark.latency_ms)} ms` : 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold text-slate-500">Throughput</p>
                  <p className="text-xs font-black text-amber-400 mt-1">
                    {status.benchmark.fps ? `${Math.round(status.benchmark.fps * 10) / 10} FPS` : 'N/A'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-500 flex items-center gap-2">
                <AlertCircle size={13} className="text-slate-500" />
                <span>No computational benchmark records found on this system host.</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            {renderCommand("Run Hardware Benchmark", "python benchmark_models.py", "bench-cmd")}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
