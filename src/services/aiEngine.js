// ============================================================
//  ⚠️  DEPRECATED — NOT USED IN PRODUCTION
//
//  This file has been permanently retired.
//
//  It was a MOCK pipeline simulation that has been REPLACED
//  by the real FastAPI + YOLOv11 + EasyOCR backend pipeline.
//
//  Real pipeline flow:
//    Detection.jsx → ViolationContext.uploadAndProcess()
//    → api.uploadImage() + api.runDetection()
//    → FastAPI /upload + /detect/{image_id}
//    → OpenCV preprocessing → YOLO inference → EasyOCR OCR
//    → Rule-based violation engine → Evidence generation
//
//  NOTHING in this file is called from the active application.
//  All functions here generated FAKE/SIMULATED data and have
//  been removed to prevent confusion and build errors.
//
//  Do NOT import or call anything from this file.
// ============================================================

export const _DEPRECATED = true;
