import { describe, expect, it } from "vitest";
import { estimateLocalizeCredits, estimateResizeCredits } from "./credit-pricing";

describe("estimateLocalizeCredits", () => {
  it("charges per source image, generated language image, and non-PDF output format", () => {
    expect(estimateLocalizeCredits({ fileCount: 2, languageCount: 3, outputFormat: "PNG" })).toBe(38);
  });

  it("charges PDF output per generated image", () => {
    expect(estimateLocalizeCredits({ fileCount: 2, languageCount: 3, outputFormat: "pdf" })).toBe(54);
  });

  it("clamps zero and negative counts to one billable unit", () => {
    expect(estimateLocalizeCredits({ fileCount: 0, languageCount: -4, outputFormat: "PNG" })).toBe(12);
  });
});

describe("estimateResizeCredits", () => {
  it("charges every generated source-image and placement pair", () => {
    expect(estimateResizeCredits({ fileCount: 2, dimensionCount: 3, outputFormat: "WebP" })).toBe(20);
  });

  it("charges PDF output per generated resize image", () => {
    expect(estimateResizeCredits({ fileCount: 2, dimensionCount: 3, outputFormat: "PDF" })).toBe(36);
  });

  it("scales multi-file multi-placement jobs with output count", () => {
    expect(estimateResizeCredits({ fileCount: 10, dimensionCount: 3, outputFormat: "PNG" })).toBe(92);
  });

  it("clamps zero and negative resize counts to one billable unit", () => {
    expect(estimateResizeCredits({ fileCount: -2, dimensionCount: 0, outputFormat: "PNG" })).toBe(7);
  });
});
