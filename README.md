# AdaptifAI

AdaptifAI is a stateless web app for ad creative localization. It extracts marketing copy from uploaded creatives, translates it contextually, prepares inpainted backgrounds, and previews resized assets against platform-specific placement UI and safe zones.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, optimized for Vercel.
- Backend: FastAPI for local OCR, translation, inpainting and resize orchestration.
- OCR: EasyOCR text detection plus Microsoft TrOCR local recognition.
- Inpainting: Stable Diffusion inpainting over OCR text masks, with OpenCV fallback.
- Translation: GPT-4o through `OPENAI_API_KEY`, with `[BOLD]...[/BOLD]` tag preservation.
- Payments: Stripe Checkout route for credit packs.
- Credits: local JSON credit ledger for account balance and Stripe webhook reconciliation.
- Data policy: creative files stay in temporary storage and are eligible for deletion after 24 hours.

## Local setup

Create local environment files from the example:

```powershell
Copy-Item .env.example .env.local
```

Install frontend dependencies:

```powershell
npm install
```

Install backend dependencies:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/warm_models.py
cd ..
```

Run both services in separate terminals:

```powershell
npm run dev:backend
npm run dev
```

Open `http://localhost:3000`.

## Environment

Required for production-grade translation:

```text
OPENAI_API_KEY=...
OPENAI_TRANSLATION_MODEL=gpt-4o
```

Local model settings:

```text
ADAPTIFAI_TROCR_MODEL=microsoft/trocr-base-printed
ADAPTIFAI_INPAINT_BACKEND=stable-diffusion
ADAPTIFAI_INPAINT_MODEL=runwayml/stable-diffusion-inpainting
ADAPTIFAI_INPAINT_MAX_SIDE=128
ADAPTIFAI_INPAINT_STEPS=4
```

Optional font matching:

```text
GOOGLE_FONTS_API_KEY=
```

Required for Stripe Checkout:

```text
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Implemented Product Surface

- Multi-upload support for PNG, WebP, JPG, JPEG, PDF and ZIP.
- PDF pages are rasterized for OCR and ZIP files are expanded for supported image assets.
- Target languages: EN, DE, FR, IT, ES, PT, TR, AR, ZH and JA.
- Output formats: Original, PNG, JPG, WebP and PDF.
- Exact placement selector for Meta, TikTok, Google, Snapchat, LinkedIn and Native/Web.
- Device preview with platform overlays and safe-zone warnings.
- Post-process editor controls for masking, erasing, moving and copy override.
- Credit counter and Stripe Checkout integration route.
- Credit counter is user-scoped by the account email field in the header.
- Stripe webhook adds purchased credits to the local credit ledger.
- Generated exports are available through temporary download URLs.
- Terms, Privacy GDPR/KVKK and Refund Policy pages are included.
- Google Fonts matching endpoint is available at `/api/fonts/match`.

## Notes

The first backend run downloads model weights for EasyOCR, Microsoft TrOCR and Stable Diffusion inpainting. This can take several minutes and multiple GB of disk space. Run `python scripts/warm_models.py` from `backend/` to preload them before starting the API. The checked-in defaults are CPU-friendly; on a CUDA GPU, increase `ADAPTIFAI_INPAINT_MAX_SIDE` to `768` and `ADAPTIFAI_INPAINT_STEPS` to `24`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
