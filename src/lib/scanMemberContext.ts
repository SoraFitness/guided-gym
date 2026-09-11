import { EQUIPMENT_LABELS, GOAL_LABELS, type EquipmentSetup, type Goal } from "./profile";

export interface ScanMemberProfile {
  gender: string | null;
  goal: string | null;
  experience: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  profile: unknown;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Self-reported onboarding answers that let the scan tailor its plan (bulking
 * vs. cutting, equipment, schedule) and calibrate the body-fat range, without
 * asking the model to guess anything about the person from the photo.
 */
export function formatMemberContext(member: ScanMemberProfile): string | null {
  const profile =
    member.profile && typeof member.profile === "object" && !Array.isArray(member.profile)
      ? (member.profile as Record<string, unknown>)
      : {};
  const lines: string[] = [];

  if (member.gender === "male" || member.gender === "female") {
    lines.push(`Sex: ${member.gender}`);
  }

  const goals = [...(Array.isArray(profile.goals) ? profile.goals : []), member.goal].filter(
    (goal): goal is Goal => typeof goal === "string" && goal in GOAL_LABELS,
  );
  if (goals.length) {
    lines.push(`Goals: ${[...new Set(goals)].map((goal) => GOAL_LABELS[goal]).join(", ")}`);
  }

  const training = [
    member.experience ? `${member.experience} experience` : null,
    typeof profile.daysPerWeek === "number"
      ? `${profile.daysPerWeek} training days per week`
      : null,
    typeof profile.sessionMinutes === "number" ? `${profile.sessionMinutes}-minute sessions` : null,
    typeof profile.equipment === "string" && profile.equipment in EQUIPMENT_LABELS
      ? EQUIPMENT_LABELS[profile.equipment as EquipmentSetup]
      : null,
  ].filter(Boolean);
  if (training.length) lines.push(`Training: ${training.join(", ")}`);

  const body = [
    member.height_cm ? `height ${Math.round(member.height_cm)} cm` : null,
    member.current_weight_kg ? `weight ${round1(member.current_weight_kg)} kg` : null,
    member.goal_weight_kg ? `goal weight ${round1(member.goal_weight_kg)} kg` : null,
  ].filter(Boolean);
  if (body.length) lines.push(`Body: ${body.join(", ")}`);

  if (!lines.length) return null;
  return [
    "MEMBER CONTEXT (self-reported in the app). Use it only to tailor the action plan and calibrate estimates; never infer anything else about the person.",
    ...lines.map((line) => `- ${line}`),
  ].join("\n");
}
