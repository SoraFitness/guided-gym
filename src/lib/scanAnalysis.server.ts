import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { formatMemberContext } from "@/lib/scanMemberContext";

// Server helpers shared by the Body Scan and Face Scan analyzers.

export interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: { message?: string };
}

export function contentText(payload: OpenRouterResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");
  return "";
}

export async function photoFingerprint(bytes: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
  return `sha256:${hex}`;
}

export async function loadPhotoBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`Could not read scan photo (${response.status}).`);
  return response.arrayBuffer();
}

/** The member's onboarding answers for the prompt, or null when unavailable. */
export async function loadMemberContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("gender,goal,experience,height_cm,current_weight_kg,goal_weight_kg,profile")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("Scan member context unavailable:", error.message);
    return null;
  }
  return data ? formatMemberContext(data) : null;
}

export function formatScanDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "an earlier date" : date.toISOString().slice(0, 10);
}
