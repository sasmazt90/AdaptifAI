from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv


def main() -> None:
    import easyocr
    import torch
    from diffusers import AutoPipelineForInpainting
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel

    repo_root = Path(__file__).resolve().parents[2]
    load_dotenv(repo_root / ".env.local")
    load_dotenv(repo_root / ".env")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    trocr_model = os.getenv("ADAPTIFAI_TROCR_MODEL", "microsoft/trocr-base-printed")
    inpaint_model = os.getenv("ADAPTIFAI_INPAINT_MODEL", "runwayml/stable-diffusion-inpainting")

    print(f"Device: {device}")
    print("Downloading EasyOCR detector/recognizer weights...")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    easyocr.Reader(["en"], gpu=device == "cuda", verbose=False)

    print(f"Downloading TrOCR model: {trocr_model}")
    TrOCRProcessor.from_pretrained(trocr_model)
    VisionEncoderDecoderModel.from_pretrained(trocr_model)

    print(f"Downloading Stable Diffusion inpainting model: {inpaint_model}")
    dtype = torch.float16 if device == "cuda" else torch.float32
    AutoPipelineForInpainting.from_pretrained(
        inpaint_model,
        torch_dtype=dtype,
        safety_checker=None,
        requires_safety_checker=False,
    )

    print("Model warmup complete.")


if __name__ == "__main__":
    main()
