from __future__ import annotations

import json
import os
import shutil
import tempfile
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated
from uuid import uuid4

import numpy as np
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from openai import OpenAI
from PIL import Image, ImageDraw
from pydantic import BaseModel
from dotenv import load_dotenv


REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env.local")
load_dotenv(REPO_ROOT / ".env")


SUPPORTED_EXTENSIONS = {".png", ".webp", ".jpg", ".jpeg", ".pdf", ".zip"}
MARKETING_HINTS = (
    "buy",
    "shop",
    "sale",
    "save",
    "now",
    "free",
    "new",
    "limited",
    "launch",
    "discover",
    "join",
    "try",
    "start",
    "learn",
    "get",
)

PLACEMENT_DIMENSIONS = {
    "meta-feed": (1080, 1080),
    "meta-stories": (1080, 1920),
    "meta-marketplace": (1080, 1080),
    "meta-right-column": (1200, 628),
    "tiktok-in-feed": (1080, 1920),
    "tiktok-topview": (1080, 1920),
    "tiktok-branded": (1080, 1920),
    "gdn-300x250": (300, 250),
    "gdn-728x90": (728, 90),
    "gdn-160x600": (160, 600),
    "gdn-320x50": (320, 50),
    "gdn-300x600": (300, 600),
    "youtube-16x9": (1920, 1080),
    "youtube-shorts": (1080, 1920),
    "snap-top-snap": (1080, 1920),
    "snap-story-ad": (1080, 1920),
    "linkedin-single-wide": (1200, 628),
    "linkedin-single-square": (1080, 1080),
    "linkedin-sponsored": (1200, 628),
    "native-custom": (1200, 800),
}

OCR_DETECTOR = None
TROCR_PROCESSOR = None
TROCR_MODEL = None
INPAINT_PIPELINE = None


class TextBlock(BaseModel):
    text: str
    role: str
    translate: bool
    bbox: tuple[int, int, int, int]
    font_family: str = "Inter"
    font_weight: int = 700
    color: str = "#111111"


class OutputAsset(BaseModel):
    placement_id: str
    filename: str
    width: int
    height: int
    safe_zone_warnings: list[str]
    download_url: str


class AdaptResponse(BaseModel):
    job_id: str
    stateless: bool
    expires_at: datetime
    credits_estimated: int
    extracted_blocks: list[TextBlock]
    translations: dict[str, str]
    outputs: list[OutputAsset]


app = FastAPI(title="AdaptifAI Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ADAPTIFAI_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def image_extensions() -> set[str]:
    return {".png", ".webp", ".jpg", ".jpeg"}


def first_image_path(paths: list[Path]) -> Path | None:
    return next((path for path in paths if path.suffix.lower() in image_extensions()), None)


def torch_device() -> str:
    import torch

    return "cuda" if torch.cuda.is_available() else "cpu"


def load_ocr_models():
    global OCR_DETECTOR, TROCR_MODEL, TROCR_PROCESSOR

    if OCR_DETECTOR is None:
        import easyocr

        OCR_DETECTOR = easyocr.Reader(["en"], gpu=torch_device() == "cuda", verbose=False)

    if TROCR_PROCESSOR is None or TROCR_MODEL is None:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel

        model_id = os.getenv("ADAPTIFAI_TROCR_MODEL", "microsoft/trocr-base-printed")
        TROCR_PROCESSOR = TrOCRProcessor.from_pretrained(model_id)
        TROCR_MODEL = VisionEncoderDecoderModel.from_pretrained(model_id)
        TROCR_MODEL.to(torch_device())
        TROCR_MODEL.eval()

    return OCR_DETECTOR, TROCR_PROCESSOR, TROCR_MODEL


def load_inpaint_pipeline():
    global INPAINT_PIPELINE

    if INPAINT_PIPELINE is None:
        import torch
        from diffusers import AutoPipelineForInpainting

        model_id = os.getenv("ADAPTIFAI_INPAINT_MODEL", "runwayml/stable-diffusion-inpainting")
        dtype = torch.float16 if torch_device() == "cuda" else torch.float32
        INPAINT_PIPELINE = AutoPipelineForInpainting.from_pretrained(
            model_id,
            torch_dtype=dtype,
            safety_checker=None,
            requires_safety_checker=False,
        )
        INPAINT_PIPELINE.to(torch_device())
        if torch_device() == "cuda":
            INPAINT_PIPELINE.enable_attention_slicing()

    return INPAINT_PIPELINE


def temp_root() -> Path:
    root = Path(os.getenv("ADAPTIFAI_TMP_DIR", Path(tempfile.gettempdir()) / "adaptifai"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def cleanup_old_temp_files() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    for child in temp_root().iterdir():
        try:
            modified = datetime.fromtimestamp(child.stat().st_mtime, tz=timezone.utc)
            if modified < cutoff:
                if child.is_dir():
                    shutil.rmtree(child, ignore_errors=True)
                else:
                    child.unlink(missing_ok=True)
        except OSError:
            continue


async def persist_uploads(files: list[UploadFile], job_dir: Path) -> list[Path]:
    saved: list[Path] = []
    for upload in files:
        suffix = Path(upload.filename or "").suffix.lower()
        if suffix not in SUPPORTED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {upload.filename}")

        target = job_dir / f"{uuid4().hex}{suffix}"
        with target.open("wb") as handle:
            while chunk := await upload.read(1024 * 1024):
                handle.write(chunk)
        saved.append(target)
    return expand_uploads(saved, job_dir)


def expand_uploads(paths: list[Path], job_dir: Path) -> list[Path]:
    expanded: list[Path] = []
    for path in paths:
        if path.suffix.lower() == ".zip":
            expanded.extend(extract_zip_images(path, job_dir / "zip"))
        elif path.suffix.lower() == ".pdf":
            expanded.extend(render_pdf_pages(path, job_dir / "pdf"))
        else:
            expanded.append(path)
    return expanded


def extract_zip_images(zip_path: Path, output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[Path] = []
    with zipfile.ZipFile(zip_path) as archive:
        for index, member in enumerate(archive.infolist()):
            suffix = Path(member.filename).suffix.lower()
            if suffix not in image_extensions() or member.is_dir():
                continue
            target = output_dir / f"{zip_path.stem}-{index}{suffix}"
            with archive.open(member) as source, target.open("wb") as destination:
                shutil.copyfileobj(source, destination)
            extracted.append(target)
    return extracted


def render_pdf_pages(pdf_path: Path, output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        import pypdfium2 as pdfium
    except ImportError:
        return []

    rendered: list[Path] = []
    pdf = pdfium.PdfDocument(str(pdf_path))
    max_pages = int(os.getenv("ADAPTIFAI_PDF_MAX_PAGES", "8"))
    for index in range(min(len(pdf), max_pages)):
        page = pdf[index]
        bitmap = page.render(scale=2).to_pil().convert("RGB")
        target = output_dir / f"{pdf_path.stem}-page-{index + 1}.png"
        bitmap.save(target)
        rendered.append(target)
    return rendered


def run_trocr_ocr(paths: list[Path]) -> list[TextBlock]:
    image_path = first_image_path(paths)
    if not image_path:
        return []

    import torch

    detector, processor, model = load_ocr_models()
    image = Image.open(image_path).convert("RGB")
    detections = detector.readtext(np.array(image), detail=1, paragraph=False)
    blocks: list[TextBlock] = []

    for detection in detections:
        points, detected_text, confidence = detection
        if confidence < float(os.getenv("ADAPTIFAI_OCR_MIN_CONFIDENCE", "0.25")):
            continue

        xs = [int(point[0]) for point in points]
        ys = [int(point[1]) for point in points]
        padding = int(os.getenv("ADAPTIFAI_OCR_BOX_PADDING", "8"))
        left = max(0, min(xs) - padding)
        top = max(0, min(ys) - padding)
        right = min(image.width, max(xs) + padding)
        bottom = min(image.height, max(ys) + padding)
        if right <= left or bottom <= top:
            continue

        crop = image.crop((left, top, right, bottom))
        pixel_values = processor(images=crop, return_tensors="pt").pixel_values.to(torch_device())
        with torch.inference_mode():
            generated_ids = model.generate(pixel_values, max_new_tokens=48)
        recognized = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
        text = recognized or str(detected_text).strip()
        if not text:
            continue

        blocks.append(
            TextBlock(
                text=text,
                role=classify_text_role(text),
                translate=True,
                bbox=(left, top, right, bottom),
            )
        )

    return blocks


def classify_text_role(text: str) -> str:
    normalized = text.lower()
    if any(hint in normalized for hint in MARKETING_HINTS):
        return "cta" if len(text.split()) <= 6 else "headline"
    if text.isupper() and len(text.split()) <= 3:
        return "product_label"
    if any(char.isdigit() for char in text) and len(text.split()) <= 4:
        return "product_label"
    return "headline" if len(text) > 12 else "product_label"


def marketing_filter(blocks: list[TextBlock]) -> list[TextBlock]:
    filtered: list[TextBlock] = []
    for block in blocks:
        normalized = block.text.lower()
        is_marketing = block.role in {"headline", "cta"} or any(hint in normalized for hint in MARKETING_HINTS)
        filtered.append(block.model_copy(update={"translate": is_marketing and block.role != "product_label"}))
    return filtered


def translate_with_gpt4o(blocks: list[TextBlock], languages: list[str]) -> dict[str, str]:
    source = [block.text for block in blocks if block.translate]
    if not source:
        return {}

    if not os.getenv("OPENAI_API_KEY"):
        return {language: " | ".join(f"{text} -> {language}" for text in source) for language in languages}

    client = OpenAI()
    prompt = {
        "task": "Translate only marketing headlines and CTAs. Preserve [BOLD]...[/BOLD] tags exactly around the semantically emphasized phrase. Do not translate product labels, ingredient names, SKU codes, or legal marks.",
        "target_languages": languages,
        "strings": source,
    }
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_TRANSLATION_MODEL", "gpt-4o"),
        temperature=0.2,
        messages=[
            {"role": "system", "content": "You are a localization engine for paid social ad creatives. Return compact JSON only."},
            {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
        ],
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content or "{}"
    parsed = json.loads(content)
    return {language: json.dumps(parsed.get(language, parsed), ensure_ascii=False) for language in languages}


def inpaint_text_regions(paths: list[Path], blocks: list[TextBlock], job_dir: Path) -> Path | None:
    image_path = first_image_path(paths)
    if not image_path:
        return None

    try:
        image = Image.open(image_path).convert("RGB")
    except OSError:
        return None

    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    for block in blocks:
        if not block.translate:
            continue
        left, top, right, bottom = expand_bbox(block.bbox, image.size, int(os.getenv("ADAPTIFAI_INPAINT_PADDING", "18")))
        draw.rounded_rectangle((left, top, right, bottom), radius=8, fill=255)

    if not mask.getbbox():
        output = job_dir / "inpainted-background.jpg"
        image.save(output, quality=92)
        return output

    output = job_dir / "inpainted-background.jpg"
    mode = os.getenv("ADAPTIFAI_INPAINT_BACKEND", "stable-diffusion").lower()
    if mode == "stable-diffusion" and torch_device() == "cpu" and os.getenv("ADAPTIFAI_ALLOW_CPU_STABLE_DIFFUSION") != "1":
        mode = "opencv"

    if mode == "opencv":
        inpaint_with_opencv(image, mask).save(output, quality=92)
        return output

    try:
        inpaint_with_stable_diffusion(image, mask).save(output, quality=92)
    except Exception:
        inpaint_with_opencv(image, mask).save(output, quality=92)

    return output


def expand_bbox(bbox: tuple[int, int, int, int], image_size: tuple[int, int], padding: int) -> tuple[int, int, int, int]:
    width, height = image_size
    left, top, right, bottom = bbox
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )


def fit_for_sd(image: Image.Image, mask: Image.Image) -> tuple[Image.Image, Image.Image, tuple[int, int]]:
    original_size = image.size
    width, height = image.size
    max_side = int(os.getenv("ADAPTIFAI_INPAINT_MAX_SIDE", "128" if torch_device() == "cpu" else "768"))
    scale = min(max_side / max(width, height), 1.0)
    target_width = max(64, int(width * scale) // 8 * 8)
    target_height = max(64, int(height * scale) // 8 * 8)
    if (target_width, target_height) == image.size:
        return image, mask, original_size
    return image.resize((target_width, target_height)), mask.resize((target_width, target_height)), original_size


def inpaint_with_stable_diffusion(image: Image.Image, mask: Image.Image) -> Image.Image:
    pipeline = load_inpaint_pipeline()
    sd_image, sd_mask, original_size = fit_for_sd(image, mask)
    result = pipeline(
        prompt=os.getenv(
            "ADAPTIFAI_INPAINT_PROMPT",
            "clean advertising background, restored texture, no text, no letters, no logo artifacts",
        ),
        negative_prompt=os.getenv("ADAPTIFAI_INPAINT_NEGATIVE_PROMPT", "text, letters, words, watermark, blurry"),
        image=sd_image,
        mask_image=sd_mask,
        num_inference_steps=int(os.getenv("ADAPTIFAI_INPAINT_STEPS", "4" if torch_device() == "cpu" else "24")),
        guidance_scale=float(os.getenv("ADAPTIFAI_INPAINT_GUIDANCE", "6.5")),
    ).images[0]
    return result.resize(original_size) if result.size != original_size else result


def inpaint_with_opencv(image: Image.Image, mask: Image.Image) -> Image.Image:
    import cv2

    image_array = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    mask_array = np.array(mask)
    restored = cv2.inpaint(image_array, mask_array, 5, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(restored, cv2.COLOR_BGR2RGB))


def resize_outputs(placements: list[str], output_format: str, job_dir: Path, inpainted: Path | None) -> list[OutputAsset]:
    outputs: list[OutputAsset] = []
    extension = "png" if output_format.lower() in {"original", "png"} else output_format.lower()

    for placement_id in placements:
        width, height = PLACEMENT_DIMENSIONS.get(placement_id, PLACEMENT_DIMENSIONS["native-custom"])
        filename = f"{placement_id}.{extension}"
        if inpainted and extension in {"png", "jpg", "jpeg", "webp", "pdf"}:
            try:
                with Image.open(inpainted) as image:
                    resized = image.convert("RGB").resize((width, height))
                    if extension == "pdf":
                        resized.save(job_dir / filename, "PDF", resolution=100.0)
                    else:
                        resized.save(job_dir / filename)
            except OSError:
                pass

        warnings = []
        if placement_id in {"tiktok-in-feed", "youtube-shorts", "meta-stories", "snap-story-ad"}:
            warnings.append("Review lower CTA and right action rail before export.")

        outputs.append(
            OutputAsset(
                placement_id=placement_id,
                filename=filename,
                width=width,
                height=height,
                safe_zone_warnings=warnings,
                download_url=f"/api/download/{job_dir.name}/{filename}",
            )
        )

    return outputs


@app.get("/health")
def health() -> dict[str, str]:
    cleanup_old_temp_files()
    return {
        "status": "ok",
        "storage": "stateless-temp-24h",
        "ocr": os.getenv("ADAPTIFAI_TROCR_MODEL", "microsoft/trocr-base-printed"),
        "inpainting": os.getenv("ADAPTIFAI_INPAINT_MODEL", "runwayml/stable-diffusion-inpainting"),
    }


@app.get("/outputs/{job_id}/{filename}")
def download_output(job_id: str, filename: str) -> FileResponse:
    cleanup_old_temp_files()
    safe_job = "".join(char for char in job_id if char.isalnum() or char in {"-", "_"})
    safe_file = Path(filename).name
    path = temp_root() / safe_job / safe_file
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Output file is unavailable or expired.")
    return FileResponse(path, filename=safe_file, media_type="application/octet-stream")


@app.post("/adapt", response_model=AdaptResponse)
async def adapt(
    background_tasks: BackgroundTasks,
    files: Annotated[list[UploadFile], File()],
    target_languages: Annotated[str, Form()],
    output_format: Annotated[str, Form()] = "PNG",
    placements: Annotated[str, Form()] = "meta-stories",
) -> AdaptResponse:
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one creative.")

    cleanup_old_temp_files()
    job_id = uuid4().hex[:12]
    job_dir = temp_root() / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    saved_paths = await persist_uploads(files, job_dir)
    languages = [item.strip().upper() for item in target_languages.split(",") if item.strip()]
    placement_ids = [item.strip() for item in placements.split(",") if item.strip()]

    blocks = marketing_filter(run_trocr_ocr(saved_paths))
    translations = translate_with_gpt4o(blocks, languages)
    inpainted = inpaint_text_regions(saved_paths, blocks, job_dir)
    outputs = resize_outputs(placement_ids, output_format, job_dir, inpainted)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    background_tasks.add_task(cleanup_old_temp_files)

    return AdaptResponse(
        job_id=job_id,
        stateless=True,
        expires_at=expires_at,
        credits_estimated=max(1, len(files) * max(1, len(languages)) * max(1, len(placement_ids))),
        extracted_blocks=blocks,
        translations=translations,
        outputs=outputs,
    )
