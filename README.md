# TrafficVision AI
### Explainable Traffic Violation Detection & Smart Enforcement Platform
#### Flipkart Gridlock Hackathon 2.0 — Round 2

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | FastAPI, SQLAlchemy (async), Uvicorn |
| CV Models | Ultralytics YOLOv11n, OpenCV (CLAHE), EasyOCR |
| Database | SQLite (local dev) / PostgreSQL (production) |
| Reports | ReportLab PDF generation |

---

## Quick Start (Local Dev — No Docker Required)

### Step 1 — Install Python dependencies

Open a terminal in the project root and run:

```bash
pip install -r backend/requirements.txt
```

> **Note:** Python 3.10+ is required. On first run, YOLOv11 weights (~6MB) will auto-download.

### Step 2 — Download Custom YOLO Weight Files

The platform uses dedicated YOLO weights for helmet and license plate detection. We have provided a script that downloads them automatically from Hugging Face:

```bash
python download_models.py
```

This downloads `helmet.pt` and `license_plate.pt` directly into `backend/data/models/`.

### Step 3 — Start the FastAPI backend

```bash
# From the project root directory
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```

Or double-click **`start_backend.bat`** (creates venv automatically).

Backend runs at: **http://localhost:8000**  
API Docs (Swagger): **http://localhost:8000/docs**  
Health Check: **http://localhost:8000/health**

### Step 4 — Start the frontend

In a second terminal:

```bash
npm install    # first time only
npm run dev
```

Frontend runs at: **http://localhost:3000**

### Step 5 — Login

Navigate to http://localhost:3000/login

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

---

## Advanced Video Analytics (ByteTrack)

The platform supports a temporal Video Processing pipeline using ByteTrack for persistent vehicle identification and tracking across frames:
- **Automatic Frame Extraction**: Samples feeds at targeted FPS (default: 2 FPS) to limit redundant inference.
- **ByteTrack Tracking**: Assigns unique temporal IDs (`#1`, `#2`, etc.) to tracked vehicles.
- **License Plate Cache**: Aggregates plates read across video keyframes for each vehicle track, avoiding redundant OCR overhead.
- **Violations Aggregation**: Counts violation events temporally (such as wrong-side driving or helmet violations across consecutive frames) and generates a unified report.
- **Annotated Playback**: Streams annotated `.mp4` video results directly to the web client with a one-click download.

---

## Model Training & Setup Pipeline

Operators can configure and trigger custom model training runs directly via terminal scripts. Run status is monitored live inside the **Training Status** page:

1. **Dataset Integration & Split check**:
   ```bash
   python fix_dataset_integration.py
   python resplit_datasets.py
   ```
2. **Setup Directories & Configs**:
   ```bash
   python setup_training.py
   ```
3. **Run YOLOv11 Training**:
   ```bash
   python train_vehicle.py
   python train_helmet.py
   python train_plate.py
   ```
4. **Evaluation & Latency Benchmarks**:
   ```bash
   python evaluate_models.py
   python benchmark_models.py
   ```

Trained weights (`trafficvision_*.pt`) are automatically mirrored to the backend model store (`backend/data/models`) and activated in the inference pipeline.

---

## Detection Pipeline

```
Upload Image / Video Feed
    ↓
OpenCV Preprocessing (CLAHE + Gaussian denoising + unsharp masking)
    ↓
YOLOv11 Object Detection (vehicles, persons, traffic lights)
    ↓
ByteTrack Vehicle Tracking (Persistent tracks across frames)
    ↓
OCR Plate Recognition (ROI plate cropping + EasyOCR / PaddleOCR text extraction)
    ↓
Rule-Based Violation Engine (7 deterministic legal violation rules)
    ↓
Evidence Service (annotated bounding box & track overlay)
    ↓
Database Persistence & PDF Challan Export
    ↓
XAI Response (reason + rule + confidence + suggested action)
```

## Violation Types Detected

| Violation | Rule Applied | Fine |
|-----------|-------------|------|
| Helmet Missing | Section 129 MVA | ₹1,000 |
| Triple Riding | Section 128 MVA | ₹1,000 |
| Seatbelt Missing | Section 138(3) MVA | ₹1,000 |
| Red Light Jump | Section 119 MVA | ₹5,000 |
| Stop Line Cross | Traffic Signs Manual Rule 8 | ₹500 |
| Wrong Side Driving | Section 112 MVA | ₹5,000 |
| Illegal Parking | Section 122 MVA | ₹500 |

## Zero Fake Data Policy

Every number shown in the UI originates from real database queries:
- No hardcoded statistics
- No mock violation counts  
- No random confidence scores
- Charts only populate after real detections are processed
- Empty states shown when no images have been processed
- Real-time backend status checking for model weights

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── config.py          # Settings (SQLite/PostgreSQL)
│   │   ├── database.py        # Async SQLAlchemy engine
│   │   ├── main.py            # FastAPI app entrypoint
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── routers/           # API route handlers
│   │   │   ├── training.py    # Training diagnostics status route [NEW]
│   │   │   └── video.py       # Asynchronous video upload & analysis route [NEW]
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # CV pipeline services
│   │       ├── preprocessing.py    # OpenCV CLAHE pipeline
│   │       ├── detection.py        # YOLOv11 wrapper & custom model loader
│   │       ├── ocr_service.py      # EasyOCR plate extraction
│   │       ├── violation_engine.py # Rule-based violation logic
│   │       ├── evidence_service.py # Annotated image generation
│   │       └── analytics_service.py# DB aggregation queries
│   ├── data/                  # Auto-created: uploads, evidence, reports
│   └── requirements.txt
├── src/
│   ├── pages/                 # React page components
│   │   └── TrainingStatus.jsx # Training pipeline diagnostics panel [NEW]
│   ├── components/            # Reusable UI components
│   ├── context/               
│   │   └── ToastContext.jsx   # Global animated notification context [NEW]
│   ├── services/api.js        # FastAPI HTTP client
│   └── utils/
├── .env                       # Local config (SQLite by default)
├── start_backend.bat          # Windows one-click backend launch
└── package.json
```

---

*Built for Flipkart Gridlock Hackathon 2.0 — Explainable AI Track*
