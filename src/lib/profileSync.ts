import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Profile } from "@/lib/profile";

export async function syncProfileToCloud(userId: string, profile: Profile | null) {
  if (!profile) return { synced: false };
  const profileJson = JSON.parse(JSON.stringify(profile)) as Json;

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      display_name: profile.name,
      goal: profile.goal,
      experience: profile.experience,
      gender: profile.gender,
      current_weight_kg: profile.currentWeightKg,
      goal_weight_kg: profile.goalWeightKg,
      height_cm: profile.heightCm,
      age: profile.age,
      demo_model_preference: profile.demoModelPreference ?? "auto",
      profile: profileJson,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
  return { synced: true };
}
