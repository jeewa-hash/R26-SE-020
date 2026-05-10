"""
fake_detector.py — Detects AI-generated, fake, or irrelevant images.
Fully local — no API needed.

Detection layers:
    1. Metadata analysis   — real photos have EXIF data
    2. Noise pattern       — AI images have unnaturally smooth noise
    3. Frequency analysis  — AI images lack natural high-frequency detail
    4. Blur detection      — blurry images are low quality
    5. CLIP relevance      — image must look like real service work
"""

import numpy as np
import cv2
from PIL import Image, ExifTags


# ─── Thresholds ───────────────────────────────────────────────────────────────

BLUR_THRESHOLD       = 80.0    # Below = too blurry
NOISE_THRESHOLD      = 2.5     # Below = suspiciously smooth (AI-like)
FREQUENCY_THRESHOLD  = 12.0    # Below = lacks natural texture (AI-like)
CLIP_RELEVANCE_MIN   = 0.12    # Below = image not related to any service
AI_SCORE_THRESHOLD   = 60      # Above = likely AI generated (0-100 scale)


# ─── CLIP Relevance Checker ───────────────────────────────────────────────────

# These describe what real service work images look like
REAL_SERVICE_PROMPTS = [
    "a real photo of home repair or maintenance work",
    "a real photo of cleaning service work",
    "a real photo of garden or landscaping work",
    "a real photograph taken at a work site",
    "a photo of a tradesperson doing their job",
]

FAKE_PROMPTS = [
    "an AI generated image or digital artwork",
    "a computer generated 3D render",
    "an animated or cartoon image",
    "a stock photo or illustration",
    "a digitally manipulated image",
]


class FakeImageDetector:
    def __init__(self):
        self.clip_model     = None
        self.clip_processor = None
        self._load_clip()

    def _load_clip(self):
        try:
            from transformers import CLIPProcessor, CLIPModel
            self.clip_model     = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            print("✅ Fake detector CLIP loaded")
        except ImportError:
            print("⚠️  transformers not installed — CLIP check disabled")
        except Exception as e:
            print(f"⚠️  CLIP load error: {e}")

    # ─── Main Check ────────────────────────────────────────────────────────────

    def check(self, image_path: str) -> dict:
        """
        Run all detection layers on an image.

        Returns:
        {
            "is_valid":     True/False,
            "is_fake":      True/False,
            "fake_score":   0-100 (higher = more likely fake),
            "reason":       "explanation if rejected",
            "checks":       {details of each check}
        }
        """
        checks  = {}
        reasons = []
        score   = 0  # fake score 0-100

        # ── Layer 1: File validation ──────────────────────────────────────────
        file_check = self._check_file(image_path)
        checks["file"] = file_check
        if not file_check["valid"]:
            return self._reject("Invalid or corrupted image file.", score, checks)

        # ── Layer 2: Metadata / EXIF ──────────────────────────────────────────
        meta_check = self._check_metadata(image_path)
        checks["metadata"] = meta_check
        if not meta_check["has_exif"]:
            score += 15  # suspicious but not conclusive alone
            reasons.append("no camera metadata")

        # ── Layer 3: Blur detection ───────────────────────────────────────────
        blur_check = self._check_blur(image_path)
        checks["blur"] = blur_check
        if not blur_check["is_sharp"]:
            score += 10
            reasons.append("image too blurry")

        # ── Layer 4: Noise pattern ────────────────────────────────────────────
        noise_check = self._check_noise(image_path)
        checks["noise"] = noise_check
        if noise_check["is_suspiciously_smooth"]:
            score += 30
            reasons.append("unnaturally smooth noise pattern (AI-like)")

        # ── Layer 5: Frequency analysis ───────────────────────────────────────
        freq_check = self._check_frequency(image_path)
        checks["frequency"] = freq_check
        if freq_check["lacks_natural_texture"]:
            score += 25
            reasons.append("lacks natural high-frequency texture (AI-like)")

        # ── Layer 6: CLIP real vs fake ────────────────────────────────────────
        if self.clip_model is not None:
            clip_check = self._check_clip(image_path)
            checks["clip"] = clip_check
            if clip_check["looks_ai_generated"]:
                score += 30
                reasons.append("image visually resembles AI-generated content")
            if not clip_check["is_service_relevant"]:
                score += 20
                reasons.append("image does not appear to show real service work")

        checks["fake_score"] = score

        # ── Final decision ────────────────────────────────────────────────────
        if score >= AI_SCORE_THRESHOLD:
            reason = f"Image rejected: {', '.join(reasons)}. Please upload a real photo of your work."
            return self._reject(reason, score, checks)

        return {
            "is_valid":   True,
            "is_fake":    False,
            "fake_score": score,
            "reason":     None,
            "checks":     checks,
        }

    # ─── Layer checks ──────────────────────────────────────────────────────────

    def _check_file(self, image_path: str) -> dict:
        """Verify the file is a valid image."""
        try:
            img = Image.open(image_path)
            img.verify()
            return {"valid": True, "format": img.format}
        except Exception as e:
            return {"valid": False, "error": str(e)}

    def _check_metadata(self, image_path: str) -> dict:
        """
        Real photos taken by cameras have EXIF metadata.
        AI-generated images and screenshots usually have none.
        """
        try:
            img  = Image.open(image_path)
            exif = img._getexif()

            if exif is None:
                return {"has_exif": False, "details": {}}

            details = {}
            for tag_id, value in exif.items():
                tag = ExifTags.TAGS.get(tag_id, tag_id)
                if tag in ["Make", "Model", "DateTime", "Software", "GPSInfo"]:
                    details[tag] = str(value)

            # If Software tag exists and looks like AI tool — flag it
            software = details.get("Software", "").lower()
            ai_tools = ["midjourney", "stable diffusion", "dall-e", "firefly", "adobe ai"]
            if any(tool in software for tool in ai_tools):
                return {"has_exif": True, "ai_software_detected": True, "details": details}

            return {"has_exif": True, "ai_software_detected": False, "details": details}

        except Exception:
            return {"has_exif": False, "details": {}}

    def _check_blur(self, image_path: str) -> dict:
        """Check if image is too blurry to be useful."""
        img      = cv2.imread(image_path)
        gray     = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        return {
            "is_sharp":       variance >= BLUR_THRESHOLD,
            "blur_score":     round(float(variance), 2),
            "threshold":      BLUR_THRESHOLD,
        }

    def _check_noise(self, image_path: str) -> dict:
        """
        AI images have unnaturally uniform, smooth noise.
        Real photos have natural sensor noise with higher std deviation.
        """
        img  = cv2.imread(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)

        # Apply Gaussian blur and subtract to isolate noise
        blurred    = cv2.GaussianBlur(gray, (5, 5), 0)
        noise      = gray - blurred
        noise_std  = float(np.std(noise))

        return {
            "is_suspiciously_smooth": noise_std < NOISE_THRESHOLD,
            "noise_std":              round(noise_std, 4),
            "threshold":              NOISE_THRESHOLD,
        }

    def _check_frequency(self, image_path: str) -> dict:
        """
        Use FFT to check high-frequency content.
        Real photos have natural high-frequency details (edges, textures).
        AI images often have smoother, less detailed high-frequency components.
        """
        img  = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        img  = cv2.resize(img, (224, 224))
        f    = np.fft.fft2(img)
        fshift   = np.fft.fftshift(f)
        magnitude= np.log(np.abs(fshift) + 1)

        # High-frequency energy = outer ring of FFT
        h, w = magnitude.shape
        cy, cx = h // 2, w // 2
        radius = min(h, w) // 4
        mask   = np.ones((h, w), dtype=bool)
        y, x   = np.ogrid[:h, :w]
        mask[(y - cy) ** 2 + (x - cx) ** 2 <= radius ** 2] = False
        high_freq_energy = float(np.mean(magnitude[mask]))

        return {
            "lacks_natural_texture": high_freq_energy < FREQUENCY_THRESHOLD,
            "high_freq_energy":      round(high_freq_energy, 4),
            "threshold":             FREQUENCY_THRESHOLD,
        }

    def _check_clip(self, image_path: str) -> dict:
        """
        Use CLIP to compare image against real vs AI-generated descriptions.
        Also checks if image is relevant to service work at all.
        """
        try:
            import torch

            image     = Image.open(image_path).convert("RGB")
            all_texts = REAL_SERVICE_PROMPTS + FAKE_PROMPTS
            inputs    = self.clip_processor(
                text=all_texts,
                images=image,
                return_tensors="pt",
                padding=True
            )

            with torch.no_grad():
                outputs = self.clip_model(**inputs)
                probs   = outputs.logits_per_image.softmax(dim=1)[0]

            real_score = float(probs[:len(REAL_SERVICE_PROMPTS)].sum())
            fake_score = float(probs[len(REAL_SERVICE_PROMPTS):].sum())
            best_real  = float(probs[:len(REAL_SERVICE_PROMPTS)].max())

            return {
                "looks_ai_generated":  fake_score > real_score,
                "is_service_relevant": best_real >= CLIP_RELEVANCE_MIN,
                "real_score":          round(real_score * 100, 1),
                "fake_score":          round(fake_score * 100, 1),
            }

        except Exception as e:
            return {
                "looks_ai_generated":  False,
                "is_service_relevant": True,
                "error":               str(e),
            }

    def _reject(self, reason: str, score: int, checks: dict) -> dict:
        return {
            "is_valid":   False,
            "is_fake":    True,
            "fake_score": score,
            "reason":     reason,
            "checks":     checks,
        }