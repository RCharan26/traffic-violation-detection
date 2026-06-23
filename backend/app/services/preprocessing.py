"""
Image Preprocessing Service — OpenCV pipeline.

Applies: brightness/contrast normalization, CLAHE, Gaussian denoising,
unsharp masking, and condition-aware corrections (fog, blur, low light, noise).

Condition detection is gated by settings.PREPROCESSING_DETECT_CONDITIONS.
"""
import cv2
import numpy as np
import time
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def load_image(file_path: str) -> np.ndarray:
    """Load image from disk into BGR numpy array."""
    img = cv2.imread(str(file_path))
    if img is None:
        raise ValueError(f"Cannot read image at: {file_path}")
    return img


def apply_clahe(img: np.ndarray) -> np.ndarray:
    """Apply CLAHE to the L channel of LAB color space."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)
    enhanced_lab = cv2.merge([l_enhanced, a, b])
    return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)


def reduce_noise(img: np.ndarray) -> np.ndarray:
    """Gaussian denoising for mild noise reduction."""
    return cv2.GaussianBlur(img, (3, 3), 0)


def sharpen(img: np.ndarray) -> np.ndarray:
    """Unsharp masking to recover edge clarity after noise reduction."""
    blurred = cv2.GaussianBlur(img, (0, 0), 3)
    return cv2.addWeighted(img, 1.5, blurred, -0.5, 0)


def normalize_brightness(img: np.ndarray) -> np.ndarray:
    """
    Stretch pixel intensities to use full 0-255 range if the image
    is too dark (<80 mean) or too bright (>200 mean).
    """
    mean_val = img.mean()
    if mean_val < 80:
        alpha = min(1.8, 128.0 / (mean_val + 1e-6))
        img = np.clip(img * alpha, 0, 255).astype(np.uint8)
    elif mean_val > 200:
        alpha = max(0.7, 180.0 / (mean_val + 1e-6))
        img = np.clip(img * alpha, 0, 255).astype(np.uint8)
    return img


# ── Condition Detection ────────────────────────────────────────────────────────

def detect_conditions(img: np.ndarray) -> dict:
    """
    Analyze image conditions and return a flags dict.

    Returns:
        {
            "low_light":  bool,  # mean brightness < 60
            "foggy":      bool,  # low contrast std with high brightness
            "blurry":     bool,  # Laplacian variance < 80
            "noisy":      bool,  # high std in flat regions
            "overexposed":bool,  # mean brightness > 210
        }
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mean_brightness = float(gray.mean())
    std_brightness  = float(gray.std())
    laplacian_var   = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    low_light   = mean_brightness < 60
    overexposed = mean_brightness > 210
    # Fog: high mean + low contrast spread
    foggy       = (mean_brightness > 140) and (std_brightness < 40)
    # Blur: low edge sharpness
    blurry      = laplacian_var < 80
    # Noise proxy: compute std in 20×20 uniformly dark patch (top-left corner)
    patch = gray[:20, :20]
    noisy = float(patch.std()) > 18

    conditions = {
        "low_light":   low_light,
        "foggy":       foggy,
        "blurry":      blurry,
        "noisy":       noisy,
        "overexposed": overexposed,
        "mean_brightness": round(mean_brightness, 1),
        "laplacian_var":   round(laplacian_var, 1),
    }
    return conditions


# ── Condition-Aware Corrections ────────────────────────────────────────────────

def apply_gamma(img: np.ndarray, gamma: float) -> np.ndarray:
    """Fast gamma correction via LUT."""
    inv_gamma = 1.0 / gamma
    table = np.array([
        ((i / 255.0) ** inv_gamma) * 255
        for i in range(256)
    ], dtype=np.uint8)
    return cv2.LUT(img, table)


def dehaze(img: np.ndarray) -> np.ndarray:
    """
    Simple single-image dehazing using dark channel prior subtraction.
    Lightweight approximation — does not require guided filter for speed.
    """
    # Estimate atmospheric light from bright region
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Dark channel: minimum across colour channels in small patch
    kernel = np.ones((15, 15), np.uint8)
    dark = cv2.erode(np.min(img, axis=2), kernel)
    atmospheric_light = float(np.percentile(img, 97))
    atmospheric_light = max(atmospheric_light, 100.0)

    # Transmission estimate
    t = 1.0 - 0.9 * (dark.astype(np.float32) / (atmospheric_light + 1e-6))
    t = np.clip(t, 0.1, 1.0)

    # Recover scene radiance
    img_f = img.astype(np.float32)
    dehazed = np.zeros_like(img_f)
    for c in range(3):
        dehazed[:, :, c] = (img_f[:, :, c] - atmospheric_light) / (t + 1e-6) + atmospheric_light
    return np.clip(dehazed, 0, 255).astype(np.uint8)


def deblur(img: np.ndarray) -> np.ndarray:
    """
    Sharpen a blurry image using a Wiener-filter approximation (unsharp mask
    with stronger parameters than the standard sharpening pass).
    """
    blurred = cv2.GaussianBlur(img, (0, 0), 2)
    return cv2.addWeighted(img, 2.0, blurred, -1.0, 0)


def denoise_heavy(img: np.ndarray) -> np.ndarray:
    """Non-local means denoising — slower but more effective for high-noise images."""
    return cv2.fastNlMeansDenoisingColored(img, None, h=7, hColor=7, templateWindowSize=7, searchWindowSize=21)


# ── Main Pipeline ──────────────────────────────────────────────────────────────

def preprocess(file_path: str) -> dict:
    """
    Full preprocessing pipeline.

    Returns:
        dict with keys:
            - enhanced_image: np.ndarray (BGR)
            - original_image: np.ndarray (BGR)
            - width, height: int
            - duration_ms: float
            - steps_applied: list[str]
            - conditions_detected: dict (if detection enabled)
    """
    t0 = time.perf_counter()
    steps = []

    img = load_image(file_path)
    original = img.copy()
    h, w = img.shape[:2]

    # ── Standard Pass ─────────────────────────────────────────────────────────
    img = normalize_brightness(img)
    steps.append("brightness_normalization")

    img = reduce_noise(img)
    steps.append("gaussian_denoising")

    img = apply_clahe(img)
    steps.append("clahe")

    img = sharpen(img)
    steps.append("unsharp_masking")

    # ── Condition-Aware Pass ───────────────────────────────────────────────────
    conditions_detected = {}
    try:
        from app.config import settings
        detect_enabled = settings.PREPROCESSING_DETECT_CONDITIONS
    except Exception:
        detect_enabled = True  # Default on when imported standalone

    if detect_enabled:
        conditions_detected = detect_conditions(img)
        active_conds = [k for k, v in conditions_detected.items() if isinstance(v, bool) and v]

        if active_conds:
            logger.debug(f"[PREPROCESS] Conditions detected: {active_conds}")

        if conditions_detected.get("low_light"):
            img = apply_gamma(img, gamma=1.5)
            steps.append("gamma_correction_low_light")

        if conditions_detected.get("foggy"):
            img = dehaze(img)
            steps.append("dehazing")

        if conditions_detected.get("blurry"):
            img = deblur(img)
            steps.append("deblur_unsharp")

        if conditions_detected.get("noisy"):
            img = denoise_heavy(img)
            steps.append("nlm_denoising")

        if conditions_detected.get("overexposed"):
            img = apply_gamma(img, gamma=0.7)
            steps.append("gamma_correction_overexposed")

    duration_ms = (time.perf_counter() - t0) * 1000
    logger.debug(
        f"Preprocessing done in {duration_ms:.1f}ms for {file_path} | "
        f"steps={steps} | conditions={conditions_detected}"
    )

    return {
        "enhanced_image":     img,
        "original_image":     original,
        "width":              w,
        "height":             h,
        "duration_ms":        duration_ms,
        "steps_applied":      steps,
        "conditions_detected": conditions_detected,
    }
