# AdaptifAI Backend

FastAPI service for the stateless creative localization pipeline.

## Local setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/warm_models.py
python -m uvicorn app.main:app --reload --port 8000
```

The Next.js app proxies `/api/adapt` to `http://127.0.0.1:8000` by default.

## Pipeline contract

1. Saves uploads to an OS temp directory under `adaptifai/<job-id>`.
2. Runs EasyOCR text detection and Microsoft TrOCR recognition.
3. Filters marketing headlines and CTAs while protecting product labels.
4. Calls GPT-4o when `OPENAI_API_KEY` is configured and preserves `[BOLD]...[/BOLD]` emphasis.
5. Runs Stable Diffusion inpainting over text masks, with OpenCV Telea fallback if the diffusion pipeline is unavailable.
6. Produces placement-aware resize metadata and optional raster exports.

Temporary files are eligible for deletion after 24 hours and no user/session state is stored.
