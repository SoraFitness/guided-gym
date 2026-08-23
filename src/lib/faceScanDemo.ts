import type { FaceScanResult } from "./faceScan.functions";

export const FACE_SCAN_DEMO_PHOTO = "/media/ascendr-sample-face-scan.png";
export const FACE_SCAN_DEMO_DATE = "2026-08-15T15:30:00.000Z";

export const FACE_SCAN_DEMO_RESULT: FaceScanResult = {
  photoUsable: true,
  photoIssue: null,
  overallScore: 86,
  overallSummary:
    "Strong facial balance, a defined lower face, and clear skin presentation create a polished baseline. The highest-upside changes are hairstyle structure, eye-area freshness, and more intentional lighting.",
  facialSymmetry: {
    score: 89,
    insight:
      "The eyes, brows, nose, and mouth read as well balanced from this front-facing angle, with only minor natural variation.",
  },
  jawlineDefinition: {
    score: 87,
    insight:
      "The jaw has a clear angle and good chin-to-neck separation, giving the lower face a defined shape.",
  },
  skinQuality: {
    score: 84,
    insight:
      "Skin appears generally clear and even in this photo, with a small amount of visible texture under direct light.",
  },
  eyeArea: {
    score: 81,
    insight:
      "The eye area is balanced and expressive, though softer lighting and better-rested presentation could add brightness.",
  },
  looksmaxPotential: {
    score: 93,
    insight:
      "The current structure provides strong upside from hairstyle refinement, consistent grooming, skincare, and better photo setup.",
  },
  strongestFeatures: [
    "Balanced facial proportions read clearly from the front.",
    "Jaw and chin definition create a strong lower-face outline.",
    "Thick hair provides several high-impact styling options.",
  ],
  actionPlan: [
    {
      title: "Add structure to your hairstyle",
      detail:
        "Keep texture on top while cleaning the sides slightly so the hairstyle frames the face instead of covering it.",
    },
    {
      title: "Brighten the eye area",
      detail:
        "Use softer front lighting and a consistent sleep routine to improve how rested the eye area appears in photos.",
    },
    {
      title: "Keep skincare simple and consistent",
      detail:
        "Use a gentle cleanser, moisturizer, and daily SPF rather than changing several products at once.",
    },
    {
      title: "Use cleaner portrait lighting",
      detail:
        "Face a large window or soft light source and keep the camera near eye level for more repeatable comparisons.",
    },
  ],
  confidence: 0.92,
};
