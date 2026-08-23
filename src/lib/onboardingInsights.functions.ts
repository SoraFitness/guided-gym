import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const attributionSchema = z.object({
  landingPath: z.string().max(300),
  referrerHost: z.string().max(120).nullable(),
  referralSource: z.string().max(48).nullable(),
  utmSource: z.string().max(80).nullable(),
  utmMedium: z.string().max(80).nullable(),
  utmCampaign: z.string().max(120).nullable(),
  locale: z.string().max(24).nullable(),
});

const responseSchema = z.object({
  goal: z.string().max(48),
  goals: z.array(z.string().max(48)).max(4),
  experience: z.string().max(48),
  equipment: z.string().max(48),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().min(10).max(180),
  currentWorkoutsPerWeek: z.number().int().min(0).max(7),
  focusAreas: z.array(z.string().max(48)).max(8),
  gender: z.string().max(24),
  activityLevel: z.string().max(32),
  nutritionPlan: z.string().max(32),
  units: z.string().max(16),
  motivation: z.string().max(48).nullable(),
  hasTrainingLimitations: z.boolean(),
});

const startedInput = z.object({
  visitorId: z.string().uuid(),
  flowVersion: z.string().max(64),
  attribution: attributionSchema,
});

const completedInput = startedInput.extend({ responses: responseSchema });

function insightAdminEmails() {
  return new Set(
    (process.env.ONBOARDING_INSIGHTS_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function requireInsightsAdmin(userId: string) {
  const allowlist = insightAdminEmails();
  if (!allowlist.size) {
    throw new Error(
      "Onboarding insights are not configured. Set ONBOARDING_INSIGHTS_ADMIN_EMAILS.",
    );
  }
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !allowlist.has(email))
    throw new Error("Not authorized to view onboarding insights.");
}

export const captureOnboardingStarted = createServerFn({ method: "POST" })
  .validator((data: unknown) => startedInput.parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("onboarding_submissions").upsert(
      {
        visitor_id: data.visitorId,
        flow_version: data.flowVersion,
        attribution: data.attribution,
      },
      { onConflict: "visitor_id,flow_version", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const captureOnboardingCompleted = createServerFn({ method: "POST" })
  .validator((data: unknown) => completedInput.parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("onboarding_submissions").upsert(
      {
        visitor_id: data.visitorId,
        flow_version: data.flowVersion,
        attribution: data.attribution,
        responses: data.responses,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "visitor_id,flow_version" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type OnboardingInsights = {
  started: number;
  completed: number;
  completionRate: number;
  sources: { label: string; count: number }[];
  goals: { label: string; count: number }[];
  motivations: { label: string; count: number }[];
  weeklyDays: { label: string; count: number }[];
  recent: {
    createdAt: string;
    completed: boolean;
    source: string;
    goal: string | null;
    motivation: string | null;
  }[];
};

type SubmissionRow = {
  created_at: string;
  completed_at: string | null;
  attribution: Record<string, unknown>;
  responses: Record<string, unknown>;
};

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function countValues(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value ?? "Not provided";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export const getOnboardingInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({}).parse(data))
  .handler(async ({ context }): Promise<OnboardingInsights> => {
    await requireInsightsAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("onboarding_submissions")
      .select("created_at,completed_at,attribution,responses")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as SubmissionRow[];
    const completedRows = rows.filter((row) => Boolean(row.completed_at));
    const sourceFor = (row: SubmissionRow) =>
      stringValue(row.attribution.referralSource) ??
      stringValue(row.attribution.utmSource) ??
      stringValue(row.attribution.referrerHost);

    return {
      started: rows.length,
      completed: completedRows.length,
      completionRate: rows.length ? Math.round((completedRows.length / rows.length) * 100) : 0,
      sources: countValues(rows.map(sourceFor)).slice(0, 8),
      goals: countValues(completedRows.map((row) => stringValue(row.responses.goal))).slice(0, 8),
      motivations: countValues(
        completedRows.map((row) => stringValue(row.responses.motivation)),
      ).slice(0, 8),
      weeklyDays: countValues(
        completedRows.map((row) =>
          typeof row.responses.daysPerWeek === "number"
            ? `${row.responses.daysPerWeek} days`
            : null,
        ),
      ).slice(0, 8),
      recent: rows.slice(0, 12).map((row) => ({
        createdAt: row.created_at,
        completed: Boolean(row.completed_at),
        source: sourceFor(row) ?? "Direct / unknown",
        goal: stringValue(row.responses.goal),
        motivation: stringValue(row.responses.motivation),
      })),
    };
  });
