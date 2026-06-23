import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, Play, CheckCircle, AlertCircle, Loader2, Camera, Cpu, Eye, 
  FileCheck, Zap, ChevronRight, RefreshCw, AlertTriangle, FileDown, Film, Video as VideoIcon
} from 'lucide-react';
import { useViolations } from '../context/ViolationContext.jsx';
import { api } from '../services/api.js';
import PageShell from '../components/layout/PageShell.jsx';

const STAGES = [
  { id: 0, label: 'CLAHE Image Enhancement', icon: Camera, desc: 'Brightness, contrast & noise correction' },
  { id: 1, label: 'YOLOv11 Target Detection', icon: Eye, desc: 'Object classification (vehicles & riders)' },
  { id: 2, label: 'Rule-Based Logic Engine', icon: AlertCircle, desc: 'Violation classifier rules validation' },
  { id: 3, label: 'OCR ANPR Character Reader', icon: Cpu, desc: 'License registration number reading' },
  { id: 4, label: 'Explainable AI Compiler', icon: Zap, desc: 'Compiling rules, reasons & suggestions' },
  { id: 5, label: 'Evidence Image Overlay', icon: FileCheck, desc: 'Generating visual annotated challan' },
];

const VIOLATION_COLORS = {
  helmet_missing: 'bg-red-500/10 text-red-400 border-red-500/20',
  seatbelt_missing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  triple_riding: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  wrong_side: 'bg-red-500/10 text-red-400 border-red-500/20',
  stop_line: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red_light: 'bg-red-500/10 text-red-400 border-red-500/20',
  illegal_parking: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const SEVERITY_COLORS = {
  critical: 'bg-red-600/20 text-red-400 border-red-600/30',
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
};

export default function Detection() {
  const { actions } = useViolations();
  
  // Tab control
  const [activeTab, setActiveTab] = useState('image'); // 'image' or 'video'

  // Image states
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [completedStages, setCompletedStages] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [modelStatus, setModelStatus] = useState(null);

  // Video states
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [videoTaskId, setVideoTaskId] = useState(null);
  const [videoStatus, setVideoStatus] = useState(null);
  const [videoRunning, setVideoRunning] = useState(false);
  const [videoResult, setVideoResult] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [videoDragOver, setVideoDragOver] = useState(false);
  const videoFileInputRef = useRef(null);

  useEffect(() => {
    api.getModelStatus()
      .then(status => setModelStatus(status))
      .catch(err => console.error('Failed to retrieve model status:', err));
  }, []);

  // Polling helper for video status
  useEffect(() => {
    let interval = null;
    if (videoRunning && videoTaskId) {
      interval = setInterval(async () => {
        try {
          const statusData = await api.getVideoStatus(videoTaskId);
          setVideoStatus(statusData);
          if (statusData.status === 'completed') {
            setVideoResult(statusData);
            setVideoRunning(false);
            clearInterval(interval);
          } else if (statusData.status === 'failed') {
            setVideoError(statusData.error || 'The video analytics pipeline failed.');
            setVideoRunning(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error polling video status:", err);
          setVideoError("Failed to check video processing status.");
          setVideoRunning(false);
          clearInterval(interval);
        }
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [videoRunning, videoTaskId]);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }
    setError(null);
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
    setCompletedStages([]);
    setCurrentStage(-1);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const runMockStageProgression = async () => {
    const completed = [];
    for (let i = 0; i < 6; i++) {
      setCurrentStage(i);
      await new Promise(resolve => setTimeout(resolve, 300));
      completed.push(i);
      setCompletedStages([...completed]);
    }
  };

  const handleRunDetection = async () => {
    if (!imageFile) return;
    
    setRunning(true);
    setError(null);
    setResult(null);
    setCompletedStages([]);
    setCurrentStage(0);

    try {
      const visualProgress = runMockStageProgression();
      const pipelineResult = await actions.uploadAndProcess(imageFile, locationLabel);
      await visualProgress;
      setResult(pipelineResult);
      setCurrentStage(6);
    } catch (err) {
      console.error(err);
      setError(err.message || 'The computer vision pipeline failed to execute.');
      setCompletedStages([]);
      setCurrentStage(-1);
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setCompletedStages([]);
    setCurrentStage(-1);
    setError(null);
    setLocationLabel('');
  };

  const handleVideoFile = useCallback((file) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.avi') || file.name.endsWith('.mov') || file.name.endsWith('.mkv');
    if (!isVideo) {
      setVideoError('Please upload a valid video file (MP4, AVI, MOV, MKV).');
      return;
    }
    setVideoError(null);
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    setVideoResult(null);
    setVideoStatus(null);
  }, []);

  const handleVideoDrop = useCallback((e) => {
    e.preventDefault();
    setVideoDragOver(false);
    const file = e.dataTransfer.files[0];
    handleVideoFile(file);
  }, [handleVideoFile]);

  const handleRunVideoPipeline = async () => {
    if (!videoFile) return;
    setVideoRunning(true);
    setVideoError(null);
    setVideoResult(null);
    setVideoStatus(null);
    try {
      const response = await api.uploadVideo(videoFile);
      setVideoTaskId(response.task_id);
    } catch (err) {
      console.error(err);
      setVideoError(err.message || 'Failed to upload video to the server.');
      setVideoRunning(false);
    }
  };

  const handleVideoReset = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoTaskId(null);
    setVideoStatus(null);
    setVideoResult(null);
    setVideoError(null);
  };

  return (
    <PageShell
      label="Detection Center"
      title="AI Violation Detection Pipeline"
      subtitle="Upload camera feeds and captures to run OpenCV enhancement, YOLO object recognition, ByteTrack, and OCR analysis"
      accent
    >
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/[0.02] border border-white/5 max-w-[260px]">
        <button
          onClick={() => setActiveTab('image')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'image'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Image Feed
        </button>
        <button
          onClick={() => setActiveTab('video')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'video'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Video Stream
        </button>
      </div>

      {activeTab === 'image' ? (
        <>
          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex gap-2 items-start">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Execution Failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* ── LEFT: Config & Inputs ──────────────────────────────── */}
            <div className="xl:col-span-1 space-y-5">
              
              {/* Metadata context */}
              <div className="card p-5 bg-slate-900 border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Intersection / Camera Location Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. MG Road Junction Camera 04"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  value={locationLabel}
                  onChange={e => setLocationLabel(e.target.value)}
                  disabled={running}
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  This metadata tag is linked to the image record to aggregate analytics by hotspots.
                </p>
              </div>

              {/* Upload card */}
              <div className="card p-5 bg-slate-900 border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Upload CCTV Capture File
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => !running && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    running ? 'opacity-40 cursor-not-allowed border-slate-800' :
                    dragOver
                      ? 'border-blue-500 bg-blue-500/5 cursor-pointer'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 cursor-pointer'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={running}
                    onChange={e => handleFile(e.target.files[0])}
                  />
                  <Upload className="mx-auto mb-3 text-slate-500" size={28} />
                  <p className="text-xs font-bold text-slate-300 text-center truncate max-w-full">
                    {imageFile ? imageFile.name : 'Drop image here or click to browse'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Supports JPEG, PNG, WEBP up to 20MB
                  </p>
                </div>

                {previewUrl && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleRunDetection}
                      disabled={running}
                      className="btn-primary flex-1 justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5"
                    >
                      {running ? (
                        <><Loader2 size={14} className="animate-spin" /> Processing...</>
                      ) : (
                        <><Play size={14} /> Run Pipeline</>
                      )}
                    </button>
                    <button onClick={handleReset} disabled={running} className="btn-secondary px-3.5 border-slate-800 text-slate-400 hover:text-slate-200">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Active Model Status Card */}
              {modelStatus && (
                <div className="card p-5 bg-slate-900 border-slate-800 text-xs text-slate-400 space-y-2.5">
                  <div className="flex items-center gap-2 mb-1.5 font-bold text-slate-300 uppercase tracking-wider">
                    <Cpu size={14} className="text-blue-400" />
                    <span>Active Pipeline Models</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span>Vehicle Detector:</span>
                    <span className={modelStatus.vehicle?.loaded ? "text-green-400 font-semibold" : "text-slate-500 font-medium"}>
                      {modelStatus.vehicle?.loaded ? modelStatus.vehicle.name : 'YOLO11n (COCO)'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span>Helmet Detector:</span>
                    <span className={modelStatus.helmet?.loaded ? "text-green-400 font-semibold" : "text-slate-500 font-medium"}>
                      {modelStatus.helmet?.loaded ? modelStatus.helmet.name : 'Heuristic (fallback)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plate Detector:</span>
                    <span className={modelStatus.plate?.loaded ? "text-green-400 font-semibold" : "text-slate-500 font-medium"}>
                      {modelStatus.plate?.loaded ? modelStatus.plate.name : 'Heuristic (fallback)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Progress Stages */}
              <div className="card p-5 bg-slate-900 border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Pipeline Status Monitoring</p>
                <div className="space-y-3">
                  {STAGES.map(stage => {
                    const Icon = stage.icon;
                    const completed = completedStages.includes(stage.id);
                    const active = currentStage === stage.id && running;
                    return (
                      <div key={stage.id} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                          completed ? 'bg-green-500/10 border border-green-500/20' : active ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-slate-950 border border-slate-900'
                        }`}>
                          {completed ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : active ? (
                            <Loader2 size={14} className="text-blue-400 animate-spin" />
                          ) : (
                            <Icon size={14} className="text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className={`text-[11px] font-bold ${
                              completed ? 'text-green-400' : active ? 'text-blue-400' : 'text-slate-400'
                            }`}>{stage.label}</p>
                            {completed && result && (
                              <span className="text-[9px] text-slate-500 font-mono">
                                {stage.id === 0 ? `${Math.round(result.preprocessing_ms || 0)}ms` :
                                 stage.id === 1 ? `${Math.round(result.detection_ms || 0)}ms` :
                                 stage.id === 2 ? `~10ms` :
                                 stage.id === 3 ? `${Math.round(result.ocr_ms || 0)}ms` :
                                 stage.id === 4 ? `~5ms` :
                                 stage.id === 5 ? `${Math.round(result.evidence_ms || 0)}ms` : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{stage.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* ── RIGHT: Screen Preview & Outputs ────────────────────── */}
            <div className="xl:col-span-2 space-y-5">

              {/* Visual Output */}
              <div className="card p-5 bg-slate-900 border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {result ? 'Annotated Evidence Bounding Banners' : 'Live Image Feed'}
                  </p>
                  {result && (
                    <span className="badge-paid text-[10px]">
                      ✓ Inference Complete
                    </span>
                  )}
                </div>

                {previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-850 flex items-center justify-center min-h-[300px]">
                    {result ? (
                      <img
                        src={api.getEvidenceUrl(`evidence_${result.image_id}.jpg`)}
                        alt="Evidence BBoxes"
                        className="w-full object-contain max-h-[450px]"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Preview Source"
                        className="w-full object-contain max-h-[400px]"
                      />
                    )}

                    {running && !result && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center">
                        <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Running Computer Vision Models
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Executing YOLO inference, plate cropping and OCR reads.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-800 rounded-xl h-72 flex flex-col items-center justify-center text-slate-500 bg-slate-900/30">
                    <Camera size={36} className="mb-3 opacity-30 text-slate-400" />
                    <p className="text-xs font-bold text-slate-400">No active media stream.</p>
                    <p className="text-[10px] mt-1 text-slate-500">Upload a surveillance snapshot to deploy models.</p>
                  </div>
                )}
              </div>

              {/* Results dashboard grid */}
              {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* License Plate ANPR */}
                  <div className="card p-5 bg-slate-900 border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Automatic License Plate OCR</p>

                    {result.license_plates && result.license_plates.length > 0 ? (
                      <>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center mb-4">
                          <span className="text-2xl font-bold font-mono tracking-widest text-blue-400">
                            {result.license_plates[0].raw_ocr_text || result.license_plates[0].plate_text}
                          </span>
                          <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-wider">
                            Exact {result.license_plates[0].ocr_engine || 'OCR'} Output
                          </p>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-slate-850 pb-1.5">
                            <span className="text-slate-500">OCR Confidence</span>
                            <span className="font-bold text-slate-300">
                              {result.license_plates[0].ocr_confidence != null
                                ? `${Math.round(result.license_plates[0].ocr_confidence * 100)}%`
                                : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-850 pb-1.5">
                            <span className="text-slate-500">OCR Engine Source</span>
                            <span className="font-bold text-green-400 text-[10px] uppercase">
                              {result.license_plates[0].ocr_engine || 'EasyOCR'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Format Valid</span>
                            {result.license_plates[0].raw_ocr_text
                              ? (() => {
                                  const compact = (result.license_plates[0].raw_ocr_text || '').replace(/\s+/g, '').toUpperCase();
                                  const valid = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/.test(compact);
                                  return (
                                    <span className={`font-bold text-[10px] ${valid ? 'text-green-400' : 'text-amber-400'}`}>
                                      {valid ? 'YES — Indian Plate' : 'NO — Non-standard'}
                                    </span>
                                  );
                                })()
                              : <span className="text-slate-600">—</span>
                            }
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-slate-950 border border-amber-500/20 rounded-xl p-4 text-center mb-3">
                        <p className="text-amber-400 font-bold text-xs mb-1">License Plate: Not Recognized</p>
                        <p className="text-[10px] text-amber-500/80 font-semibold mb-2">Status: OCR Failed</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Plate could not be read. Possible causes: blur, low resolution,
                          occlusion, glare, angle, or poor lighting.
                        </p>
                        <p className="text-[9px] text-slate-600 mt-2 italic">
                          No registration number has been fabricated or guessed.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timing Diagnostics — real values from backend */}
                  <div className="card p-5 bg-slate-900 border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">System Execution Speed</p>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-slate-500">Total Processing Wall Time</span>
                        <span className="font-bold text-blue-400 font-mono">{Math.round(result.processing_time_ms)} ms</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-slate-500">Image Preprocessing</span>
                        <span className="font-bold text-slate-300 font-mono">
                          {result.preprocessing_ms != null ? `${Math.round(result.preprocessing_ms)} ms` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-slate-500">YOLO Inference & Detection</span>
                        <span className="font-bold text-slate-300 font-mono">
                          {result.detection_ms != null ? `${Math.round(result.detection_ms)} ms` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-slate-500">OCR Plate Reading ({result.license_plates?.[0]?.ocr_engine || 'EasyOCR'})</span>
                        <span className="font-bold text-slate-300 font-mono">
                          {result.ocr_ms != null ? `${Math.round(result.ocr_ms)} ms` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Evidence Image Generation</span>
                        <span className="font-bold text-slate-300 font-mono">
                          {result.evidence_ms != null ? `${Math.round(result.evidence_ms)} ms` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Violations detail list (Explainable AI) */}
                  <div className="card p-5 bg-slate-900 border-slate-800 md:col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      Explainable AI (XAI) Violation Banners ({result.violations_found})
                    </p>

                    {result.violations.length > 0 ? (
                      <div className="space-y-4">
                        {result.violations.map((v, i) => (
                          <div key={i} className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                              <span className="text-xs font-bold text-red-400 uppercase">
                                ⚠ {v.violation_type.replace('_', ' ')}
                              </span>
                              <span className={`badge ${SEVERITY_COLORS[v.severity] || 'badge-medium'} text-[9px] uppercase font-bold tracking-wider`}>
                                {v.severity}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500">Reason</p>
                                <p className="text-slate-300 mt-0.5">{v.reason}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500">Legal Rule Broken</p>
                                <p className="text-slate-300 font-semibold mt-0.5">{v.rule_applied}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500">Confidence Level</p>
                                <p className="text-slate-300 font-bold mt-0.5">{Math.round(v.confidence * 100)}%</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500">Recommended Action</p>
                                <p className="text-blue-400 font-semibold mt-0.5">{v.suggested_action}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-slate-850/60 justify-end">
                              <a
                                href={api.getReportUrl(v.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary text-2xs uppercase font-bold tracking-wider py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                              >
                                <FileDown size={11} /> Generate Challan PDF
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6 text-slate-500">
                        <CheckCircle size={28} className="text-green-500 mb-2" />
                        <p className="text-xs font-bold text-slate-300">No traffic violation detected.</p>
                        <p className="text-[10px] text-slate-500 mt-1">Vehicle objects processed successfully under law thresholds.</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

          </div>
        </>
      ) : (
        <>
          {videoError && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex gap-2 items-start">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Video Processing Failed</p>
                <p className="mt-0.5">{videoError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* ── LEFT: Video Config & Upload ────────────────────────── */}
            <div className="xl:col-span-1 space-y-5">
              
              {/* Location config */}
              <div className="card p-5 bg-slate-900 border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Intersection / Camera Location Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. MG Road Junction Camera 04"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  value={locationLabel}
                  onChange={e => setLocationLabel(e.target.value)}
                  disabled={videoRunning}
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Associated metadata location tag for aggregated video violations.
                </p>
              </div>

              {/* Video upload card */}
              <div className="card p-5 bg-slate-900 border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Upload Surveillance Video Stream
                </label>
                <div
                  onDrop={handleVideoDrop}
                  onDragOver={e => { e.preventDefault(); setVideoDragOver(true); }}
                  onDragLeave={() => setVideoDragOver(false)}
                  onClick={() => !videoRunning && videoFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    videoRunning ? 'opacity-40 cursor-not-allowed border-slate-800' :
                    videoDragOver
                      ? 'border-blue-500 bg-blue-500/5 cursor-pointer'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 cursor-pointer'
                  }`}
                >
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    disabled={videoRunning}
                    onChange={e => handleVideoFile(e.target.files[0])}
                  />
                  <Film className="mx-auto mb-3 text-slate-500" size={28} />
                  <p className="text-xs font-bold text-slate-300 text-center truncate max-w-full">
                    {videoFile ? videoFile.name : 'Drop video feed or click to browse'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Supports MP4, AVI, MOV, MKV files
                  </p>
                </div>

                {videoPreviewUrl && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleRunVideoPipeline}
                      disabled={videoRunning}
                      className="btn-primary flex-1 justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5"
                    >
                      {videoRunning ? (
                        <><Loader2 size={14} className="animate-spin" /> Analyzing Feed...</>
                      ) : (
                        <><Play size={14} /> Run Video Pipeline</>
                      )}
                    </button>
                    <button onClick={handleVideoReset} disabled={videoRunning} className="btn-secondary px-3.5 border-slate-800 text-slate-400 hover:text-slate-200">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Status monitoring card */}
              {videoRunning && videoStatus && (
                <div className="card p-5 bg-slate-900 border-slate-800 text-xs text-slate-400 space-y-3">
                  <p className="font-bold text-slate-300 uppercase tracking-wider">Job Tracking Console</p>
                  <div className="flex justify-between border-b border-slate-850 pb-2">
                    <span>Task Reference ID:</span>
                    <span className="font-mono text-slate-300 select-all text-[10px]">{videoTaskId}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-2">
                    <span>Current Pipeline State:</span>
                    <span className="font-bold text-blue-400 uppercase text-[10px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      {videoStatus.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Surveillance feeds are processed through ByteTrack temporal vehicle state vectors. This may take 30-60 seconds depending on the file duration.
                  </p>
                </div>
              )}

            </div>

            {/* ── RIGHT: Video Analytics Output ──────────────────────── */}
            <div className="xl:col-span-2 space-y-5">
              
              <div className="card p-5 bg-slate-900 border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {videoResult ? 'Annotated Playback Stream' : 'Video Monitor Stream'}
                  </p>
                  {videoResult && (
                    <span className="badge-paid text-[10px]">
                      ✓ Processing Complete
                    </span>
                  )}
                </div>

                {videoResult ? (
                  <div className="space-y-4">
                    <video 
                      src={videoResult.annotated_video_url} 
                      controls 
                      className="w-full rounded-xl bg-black max-h-[450px]"
                    />
                    <div className="flex justify-end">
                      <a
                        href={videoResult.annotated_video_url}
                        download
                        className="btn-primary text-xs uppercase font-bold tracking-wider py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                      >
                        <FileDown size={13} /> Download Annotated Video (.mp4)
                      </a>
                    </div>
                  </div>
                ) : videoRunning ? (
                  <div className="border border-slate-800 rounded-xl h-80 bg-slate-950 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 size={36} className="text-blue-500 animate-spin mb-3" />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Processing Video Feed...</p>
                    <p className="text-[10px] mt-1 text-slate-500">Spawning OpenCV frames, YOLO detections, ByteTrack, & plate OCR.</p>
                  </div>
                ) : videoPreviewUrl ? (
                  <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/80 flex items-center justify-center min-h-[300px]">
                    <video 
                      src={videoPreviewUrl} 
                      controls 
                      className="w-full object-contain max-h-[400px]"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-800 rounded-xl h-72 flex flex-col items-center justify-center text-slate-500 bg-slate-900/30">
                    <VideoIcon size={36} className="mb-3 opacity-30 text-slate-400" />
                    <p className="text-xs font-bold text-slate-400">No active video stream.</p>
                    <p className="text-[10px] mt-1 text-slate-500">Upload a CCTV video file to start processing.</p>
                  </div>
                )}
              </div>

              {/* Video Analytics results */}
              {videoResult && videoResult.result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Stats */}
                  <div className="card p-5 bg-slate-900 border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Pipeline Speed & Diagnostics</p>
                    <div className="space-y-2.5 text-xs text-slate-300">
                      <div className="flex justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-slate-500">Analysis Duration</span>
                        <span className="font-bold text-blue-400">{videoResult.result.processing.total_duration_seconds} s</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-slate-500">Frames Processed</span>
                        <span className="font-bold text-slate-200">{videoResult.result.processing.frames_processed}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-slate-500">FPS Analytics Target</span>
                        <span className="font-bold text-slate-200">{videoResult.result.processing.sample_fps} FPS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Avg Latency per Frame</span>
                        <span className="font-bold text-slate-200 font-mono">{videoResult.result.processing.avg_ms_per_frame} ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Violations and Plates Summary */}
                  <div className="card p-5 bg-slate-900 border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Violations Aggregation</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Total Violations Flagged</span>
                        <span className="text-red-400 font-black text-sm">{videoResult.result.summary.total_violations}</span>
                      </div>

                      {Object.keys(videoResult.result.summary.total_violations_by_type).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {Object.entries(videoResult.result.summary.total_violations_by_type).map(([vtype, count]) => (
                            <span key={vtype} className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${VIOLATION_COLORS[vtype] || 'bg-slate-950 border-slate-850 text-slate-400'}`}>
                              {vtype.replace('_', ' ')}: {count}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">No violations detected in this surveillance video stream.</p>
                      )}

                      <div className="border-t border-slate-850 pt-3">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Unique License Plates Recognized</p>
                        {videoResult.result.summary.unique_plates_read && videoResult.result.summary.unique_plates_read.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {videoResult.result.summary.unique_plates_read.map((plate, idx) => (
                              <span key={idx} className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {plate}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-600 italic">No license plates recognized in the keyframes.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </>
      )}
    </PageShell>
  );
}
