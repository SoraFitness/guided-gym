import type { Profile } from "./profile";

export interface BodyScanScores {
  posture: number;
  symmetry: number;
  proportions: number;
  definition: number;
  conditioning: number;
  upperBody: number;
  lowerBody: number;
  core: number;
}

export type PhysiqueLevel =
  | "Starting Point"
  | "Building Base"
  | "Athletic"
  | "Strong"
  | "Advanced";

export interface BodyScanResult {
  id: string;
  createdAt: string;
  source: "ai" | "mock";
  overallScore: number;
  level: PhysiqueLevel;
  scores: BodyScanScores;
  summary: string;
  strengths: string[];
  improvements: string[];
  trainingFocus: string[];
  nutritionFocus: string[];
  confidence: number;
  disclaimer: string;
  thumbnail?: string; // small data URL of the front photo
}

export const SCAN_DISCLAIMER =
  "Body Scan provides visual fitness feedback only. It is not medical advice and may not be perfectly accurate.";

export function levelFor(score: number): PhysiqueLevel {
  if (score >= 86) return "Advanced";
  if (score >= 73) return "Strong";
  if (score >= 56) return "Athletic";
  if (score >= 36) return "Building Base";
  return "Starting Point";
}

export const SCORE_LABELS: Record<keyof BodyScanScores, string> = {
  posture: "Posture",
  symmetry: "Symmetry",
  proportions: "Proportions",
  definition: "Definition",
  conditioning: "Conditioning",
  upperBody: "Upper Body",
  lowerBody: "Lower Body",
  core: "Core",
};

// Deterministic hash so the same profile -> same mock result
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function jitter(seed: number, n: number, range = 8) {
  const x = Math.sin(seed * (n + 1)) * 10000;
  const f = x - Math.floor(x);
  return Math.round((f - 0.5) * 2 * range);
}
const clamp = (n: number) => Math.max(20, Math.min(98, Math.round(n)));

export function mockScanFor(profile: Profile): BodyScanResult {
  const seed = hash(
    `${profile.goal}|${profile.experience}|${profile.daysPerWeek}|${profile.currentWeightKg}|${profile.heightCm}|${profile.age}`,
  );

  const bmi = profile.currentWeightKg / Math.pow(profile.heightCm / 100, 2);
  const baseFromExp =
    profile.experience === "advanced" ? 78 : profile.experience === "intermediate" ? 66 : 54;
  const bmiAdj = bmi >= 18.5 && bmi <= 26 ? 4 : -6;
  const base = baseFromExp + bmiAdj;

  const scores: BodyScanScores = {
    posture: clamp(base + jitter(seed, 1)),
    symmetry: clamp(base + jitter(seed, 2)),
    proportions: clamp(base + jitter(seed, 3)),
    definition: clamp(
      base + jitter(seed, 4) + (profile.goal === "lose_weight" ? -4 : 0),
    ),
    conditioning: clamp(
      base + jitter(seed, 5) + (profile.goal === "endurance" ? 6 : 0),
    ),
    upperBody: clamp(
      base + jitter(seed, 6) + (profile.focusAreas.includes("chest") ? 3 : 0),
    ),
    lowerBody: clamp(
      base + jitter(seed, 7) + (profile.focusAreas.includes("legs") ? 4 : 0),
    ),
    core: clamp(base + jitter(seed, 8) - 4),
  };

  const overallScore = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / 8,
  );

  const strengthsPool = [
    "Balanced shoulder-to-waist ratio",
    "Solid lower-body structure",
    "Good baseline muscle mass",
    "Consistent training foundation",
    "Healthy weight range",
    "Symmetrical upper body",
  ];
  const improvementsPool = [
    "Improve core definition",
    "Add upper-chest volume",
    "Work on posture and shoulder positioning",
    "Build posterior chain strength",
    "Tighten waistline through conditioning",
    "Increase overall muscle density",
  ];
  const pick = <T,>(arr: T[], n: number, s: number) =>
    arr
      .map((v, i) => ({ v, k: (s * 31 + i * 17) % 1000 }))
      .sort((a, b) => a.k - b.k)
      .slice(0, n)
      .map((x) => x.v);

  const trainingFocus =
    profile.goal === "lose_weight"
      ? [
          "Full-body strength 3-4x/week",
          "Conditioning circuits 2x/week",
          "Core training 3x/week",
          "Daily walking 8k+ steps",
        ]
      : profile.goal === "build_muscle"
        ? [
            "Push / Pull / Legs hypertrophy split",
            "Progressive overload weekly",
            "Upper-chest and back priority",
            "Core 3x/week",
          ]
        : profile.goal === "endurance"
          ? [
              "Zone-2 conditioning 3x/week",
              "Full-body strength 2x/week",
              "Mobility 2x/week",
              "Core 3x/week",
            ]
          : [
              "Strength + hypertrophy hybrid",
              "Posture and mobility 2x/week",
              "Core 3x/week",
              "Light conditioning 2x/week",
            ];

  const nutritionFocus =
    profile.goal === "lose_weight"
      ? [
          "Slight calorie deficit (~400 kcal)",
          "Keep protein at ~2 g/kg bodyweight",
          "Prioritise whole foods and fibre",
          "Hydrate 2-3 L water daily",
        ]
      : profile.goal === "build_muscle"
        ? [
            "Slight calorie surplus (~250 kcal)",
            "Protein 2-2.2 g/kg bodyweight",
            "Carbs around training",
            "Sleep 7-9h for recovery",
          ]
        : [
            "Maintenance calories",
            "Protein 1.8-2 g/kg bodyweight",
            "Consistent meal timing",
            "Stay hydrated and well-rested",
          ];

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: "mock",
    overallScore,
    level: levelFor(overallScore),
    scores,
    summary:
      profile.goal === "lose_weight"
        ? "Solid base with clear room to improve definition. Focus on a consistent deficit, protein, and conditioning."
        : profile.goal === "build_muscle"
          ? "Good foundation to build from. Prioritise progressive overload, upper-body volume, and consistent recovery."
          : "Balanced starting point. Train consistently, keep protein high, and focus on posture and core work.",
    strengths: pick(strengthsPool, 3, seed),
    improvements: pick(improvementsPool, 3, seed + 7),
    trainingFocus,
    nutritionFocus,
    confidence: 0.5,
    disclaimer: SCAN_DISCLAIMER,
  };
}

// Suggested nutrition targets derived from a scan + profile
export function suggestedTargetsFor(profile: Profile) {
  const w = profile.currentWeightKg;
  const base = Math.round(w * 32);
  const kcal =
    profile.goal === "lose_weight"
      ? base - 400
      : profile.goal === "build_muscle"
        ? base + 250
        : base;
  return {
    kcal,
    protein: Math.round(w * 2),
    carbs: Math.round((kcal * 0.45) / 4),
    fat: Math.round((kcal * 0.25) / 9),
  };
}
