import { corsPreflightResponse, jsonResponse } from "../_shared/cors.ts";
import { UnauthorizedError, createAdminClient, requireUser } from "../_shared/auth.ts";
import { optionalEnv } from "../_shared/env.ts";

type RecordValue = Record<string, unknown>;

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function validVisitorId(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validStartPayload(value: unknown): value is {
  visitorId: string;
  flowVersion: string;
  attribution: RecordValue;
} {
  if (!value || typeof value !== "object") return false;
  const payload = value as RecordValue;
  return validVisitorId(payload.visitorId) &&
    typeof payload.flowVersion === "string" &&
    payload.flowVersion.length <= 64 &&
    Boolean(payload.attribution && typeof payload.attribution === "object");
}

function countValues(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value ?? "Not provided";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

async function requireInsightsAdmin(request: Request) {
  const { user } = await requireUser(request);
  const allowlist = new Set(
    (optionalEnv("ONBOARDING_INSIGHTS_ADMIN_EMAILS") || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!allowlist.size || !user.email || !allowlist.has(user.email.toLowerCase())) {
    throw new UnauthorizedError();
  }
}

async function getInsights() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onboarding_submissions")
    .select("created_at,completed_at,attribution,responses")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    created_at: string;
    completed_at: string | null;
    attribution: RecordValue;
    responses: RecordValue;
  }>;
  const completedRows = rows.filter((row) => Boolean(row.completed_at));
  const sourceFor = (row: (typeof rows)[number]) =>
    stringValue(row.attribution.referralSource) ||
    stringValue(row.attribution.utmSource) ||
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
        typeof row.responses.daysPerWeek === "number" ? `${row.responses.daysPerWeek} days` : null,
      ),
    ).slice(0, 8),
    recent: rows.slice(0, 12).map((row) => ({
      createdAt: row.created_at,
      completed: Boolean(row.completed_at),
      source: sourceFor(row) || "Direct / unknown",
      goal: stringValue(row.responses.goal),
      motivation: stringValue(row.responses.motivation),
    })),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = (await request.json()) as { action?: string; payload?: unknown };
    if (body.action === "started" || body.action === "completed") {
      if (!validStartPayload(body.payload)) return jsonResponse({ error: "Invalid onboarding event" }, 400);
      const payload = body.payload as RecordValue & {
        visitorId: string;
        flowVersion: string;
        attribution: RecordValue;
      };
      if (body.action === "completed" && (!payload.responses || typeof payload.responses !== "object")) {
        return jsonResponse({ error: "Invalid onboarding completion" }, 400);
      }
      const admin = createAdminClient();
      const record = {
        visitor_id: payload.visitorId,
        flow_version: payload.flowVersion,
        attribution: payload.attribution,
        ...(body.action === "completed"
          ? { responses: payload.responses as RecordValue, completed_at: new Date().toISOString() }
          : {}),
      };
      const { error } = await admin
        .from("onboarding_submissions")
        .upsert(record, { onConflict: "visitor_id,flow_version", ignoreDuplicates: body.action === "started" });
      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    if (body.action === "insights") {
      await requireInsightsAdmin(request);
      return jsonResponse(await getInsights());
    }
    return jsonResponse({ error: "Unsupported onboarding action" }, 400);
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonResponse({ error: "Not authorized." }, 403);
    console.error("[onboarding] failed", error);
    return jsonResponse({ error: "Onboarding request failed" }, 500);
  }
});
