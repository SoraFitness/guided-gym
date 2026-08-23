import type { BodyScanAiResult } from "./bodyScan.functions";

export const BODY_SCAN_DEMO_PHOTO = "/media/ascendr-sample-body-scan.png";
export const BODY_SCAN_DEMO_DATE = "2026-08-15T15:30:00.000Z";

export const BODY_SCAN_DEMO_RESULT: BodyScanAiResult = {
  photoUsable: true,
  photoIssue: null,
  overallScore: 84,
  overallSummary:
    "A lean, athletic frame with strong shoulder-to-waist proportions and balanced visible development. The clearest opportunities are adding upper-chest thickness, back width, and lower-body size while maintaining the current waistline.",
  muscleDevelopment: {
    score: 86,
    insight:
      "Visible muscularity is strongest through the shoulders, arms, chest, and quads, with room to build more total thickness.",
  },
  muscleGroups: {
    upperBody: {
      shoulders: {
        score: 89,
        visibility: "clear",
        insight: "Rounded delts create a strong frame and visibly lead the upper body.",
      },
      chest: {
        score: 82,
        visibility: "clear",
        insight: "Good lower and mid-chest shape; more upper-chest volume would improve fullness.",
      },
      back: {
        score: null,
        visibility: "not_visible",
        insight: "A front-facing photo cannot reliably show back thickness or detail.",
      },
      arms: {
        score: 85,
        visibility: "clear",
        insight: "Balanced arm development supports the shoulder width without overpowering it.",
      },
    },
    core: {
      core: {
        score: 88,
        visibility: "clear",
        insight: "Clear abdominal structure and a tight waist reinforce the V-taper.",
      },
    },
    lowerBody: {
      glutes: {
        score: null,
        visibility: "not_visible",
        insight: "The front pose does not show glute shape clearly enough to score.",
      },
      quads: {
        score: 78,
        visibility: "clear",
        insight: "Visible quad shape is athletic, with room for more sweep and overall size.",
      },
      hamstrings: {
        score: null,
        visibility: "not_visible",
        insight: "Hamstring development needs a rear or side photo for a reliable read.",
      },
      calves: {
        score: 76,
        visibility: "clear",
        insight:
          "Calves are proportionate, though additional size would strengthen lower-body balance.",
      },
    },
  },
  bodyFatEstimate: {
    lowPercent: 11,
    highPercent: 14,
    insight:
      "The visible waist, abdominal structure, and muscle separation suggest a lean visual range, not a measured percentage.",
  },
  vTaper: {
    score: 88,
    insight:
      "Broad shoulders and a controlled waist create a pronounced athletic taper from the front.",
  },
  symmetry: {
    score: 85,
    insight:
      "Left-to-right balance appears strong in the shoulders, arms, waist, and visible leg position.",
  },
  potential: {
    score: 92,
    insight:
      "The visible frame should respond well to more back width, upper-chest volume, and lower-body mass.",
  },
  strongestAreas: [
    "Shoulder width creates a strong visual frame.",
    "A lean waist makes the current V-taper stand out.",
    "Visible upper-body development is balanced from left to right.",
  ],
  actionPlan: [
    {
      title: "Build upper-chest thickness",
      detail:
        "Lead one push session each week with incline pressing and progress the load or reps consistently.",
    },
    {
      title: "Add back width",
      detail:
        "Prioritize controlled pull-ups, pulldowns, and one-arm rows to strengthen the taper from every angle.",
    },
    {
      title: "Bring up lower-body size",
      detail:
        "Use a repeatable squat, hinge, and split-squat progression twice per week instead of adding random leg volume.",
    },
    {
      title: "Keep the waistline stable",
      detail:
        "Use a small calorie surplus, high protein, and regular steps so new size does not hide your strongest proportion.",
    },
  ],
  confidence: 0.91,
  comparison: {
    status: "baseline",
    direction: "unchanged",
    confidence: 0.91,
    summary:
      "This report establishes the baseline. Future scans will need to clear Ascendr's visual-change threshold before the scores move.",
    basis: "baseline",
    previousScanId: null,
  },
};
