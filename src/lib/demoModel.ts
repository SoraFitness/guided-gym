import type { DemoModelPreference, Profile } from "./profile";

export type DemoAvatarGender = "male" | "female" | "neutral";

export const DEMO_MODEL_OPTIONS: DemoModelPreference[] = ["auto", "male", "female"];

export const DEMO_MODEL_LABELS: Record<DemoModelPreference, string> = {
  auto: "Auto from onboarding",
  male: "Male model",
  female: "Female model",
};

export function resolveDemoModelGender(profile: Profile | null | undefined): DemoAvatarGender {
  const preference = profile?.demoModelPreference ?? "auto";
  if (preference === "male" || preference === "female") return preference;
  if (profile?.gender === "male" || profile?.gender === "female") return profile.gender;
  return "neutral";
}
