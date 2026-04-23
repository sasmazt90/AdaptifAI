export const creditPricing = {
  localizeImage: 6,
  localizeLanguagePerGeneratedImage: 4,
  localizeOutputFormat: 2,
  localizePdfOutput: 3,
  localizeModify: 5,
  resizeImage: 3,
  resizeDimension: 2,
  resizeOutputFormat: 2,
  resizePdfOutput: 3,
  resizeModify: 3,
} as const;

type EstimateLocalizeCreditsInput = {
  fileCount: number;
  languageCount: number;
  outputFormat: string;
};

type EstimateResizeCreditsInput = {
  fileCount: number;
  dimensionCount: number;
  outputFormat: string;
};

function positiveCount(value: number) {
  return Math.max(1, Math.trunc(value));
}

export function estimateLocalizeCredits({ fileCount, languageCount, outputFormat }: EstimateLocalizeCreditsInput) {
  const files = positiveCount(fileCount);
  const languages = positiveCount(languageCount);
  const generatedImages = files * languages;
  const formatCost = outputFormat.toLowerCase() === "pdf"
    ? generatedImages * creditPricing.localizePdfOutput
    : creditPricing.localizeOutputFormat;

  return files * creditPricing.localizeImage
    + generatedImages * creditPricing.localizeLanguagePerGeneratedImage
    + formatCost;
}

export function estimateResizeCredits({ fileCount, dimensionCount, outputFormat }: EstimateResizeCreditsInput) {
  const files = positiveCount(fileCount);
  const dimensions = positiveCount(dimensionCount);
  const formatCost = outputFormat.toLowerCase() === "pdf"
    ? dimensions * creditPricing.resizePdfOutput
    : creditPricing.resizeOutputFormat;

  return files * creditPricing.resizeImage
    + dimensions * creditPricing.resizeDimension
    + formatCost;
}

export function estimateEditCredits(mode: "adapt" | "resize" | string) {
  return mode === "resize" ? creditPricing.resizeModify : creditPricing.localizeModify;
}
