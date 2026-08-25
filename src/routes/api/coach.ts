import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { createOpenRouterProvider, OPENROUTER_COACH_MODEL } from "@/lib/openrouter.server";
import { assertRequestSize, claimRateLimit, rateLimitResponse } from "@/lib/rateLimit.server";
import {
  getSubscriptionAccess,
  SubscriptionVerificationError,
} from "@/lib/subscription-access.server";

type Body = {
  messages: UIMessage[];
  threadId: string;
  userContext?: unknown;
};

const SYSTEM_PROMPT = `You are "Coach", the in-app AI fitness coach for the Ascendr fitness app.

PERSONALITY
- Friendly, direct, motivating. Talk like a smart trainer, not a robot.
- Concise. Use short paragraphs and bullet lists. Bold key numbers.
- Encouraging but honest. Celebrate small wins. Call out unrealistic plans gently.

WHAT YOU HELP WITH
- Workout planning, exercise swaps, equipment limitations, form tips.
- Nutrition: what to eat, hitting protein, fitting meals into remaining calories.
- Progress reviews, plateaus, recovery, motivation, consistency.
- Explaining the user's calorie/macro targets in plain language.

USE THE USER'S REAL DATA
- A JSON block titled USER_CONTEXT is provided with their profile, calorie/macro plan, today's nutrition totals, remaining calories/protein, recent workouts, and recent weight log.
- Always anchor advice in those real numbers (e.g. "you have 1,240 kcal and 62g protein left today").
- If a field is missing, say what you need from them rather than inventing numbers.

ACTION TOOLS
- When you recommend a workout, call the suggest_workout tool with the exercise list so the app can render an "Add to today's workout" button.
- When you recommend a meal or food option, call the suggest_meal tool so the app can render a "Log this meal" button.
- When the right next step is opening another screen, call open_screen with "nutrition" | "workouts" | "progress" | "profile".
- Always also write a short natural-language response alongside any tool call.

LONG-TERM MEMORY
- A LONG_TERM_MEMORY list of durable facts you saved in previous sessions may be provided. Treat it as trusted context about the user.
- When you learn something durable and coaching-relevant — injuries or pain, equipment changes, schedule constraints, strong food preferences or allergies, PRs, motivations, life events affecting training — call the remember tool with one short, self-contained sentence (e.g. "Left knee pain on deep squats — prefers box squats").
- Do NOT save trivia, one-off numbers already tracked by the app (daily calories, weights), or anything the user asks you to forget. If asked to forget something, apologize and stop referencing it.
- Never announce that you are saving a memory; just call the tool silently.

SAFETY RULES (NON-NEGOTIABLE)
- Never recommend intakes below ~1500 kcal for men or ~1200 kcal for women.
- Never recommend weight loss faster than 1% bodyweight per week.
- Never diagnose injuries, illness, or eating disorders.
- If the user mentions chest pain, fainting, severe injury, disordered eating patterns, or any medical red flag: respond briefly with empathy and tell them to talk to a doctor or qualified professional (or emergency services if urgent). Do not provide a workout/diet in that turn.
- No extreme cuts, no "starvation" plans, no unverified supplements.`;

export const Route = createFileRoute("/api/coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertRequestSize(request, 256_000);
        } catch (error) {
          return rateLimitResponse(error) ?? new Response("Invalid request", { status: 400 });
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const { messages, threadId, userContext } = body;
        if (
          !Array.isArray(messages) ||
          messages.length === 0 ||
          messages.length > 50 ||
          typeof threadId !== "string" ||
          threadId.length > 128 ||
          !/^[a-zA-Z0-9_-]+$/.test(threadId)
        ) {
          return new Response("Missing messages/threadId", { status: 400 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length);

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Backend not configured", { status: 500 });
        }
        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub as string;

        try {
          const subscription = await getSubscriptionAccess(token);
          if (!subscription.active) {
            return new Response("An active subscription is required.", { status: 402 });
          }
        } catch (error) {
          if (!(error instanceof SubscriptionVerificationError)) {
            console.error("[coach] Subscription verification failed", error);
          }
          return new Response("Subscription verification is temporarily unavailable.", {
            status: 503,
          });
        }

        try {
          claimRateLimit("coach-user", {
            limit: 40,
            windowMs: 15 * 60 * 1_000,
            identity: userId,
          });
        } catch (error) {
          return rateLimitResponse(error) ?? new Response("Too many requests", { status: 429 });
        }

        const lastUser = [...messages].reverse().find((m) => m.role === "user");

        const openrouter = createOpenRouterProvider(token, "coach");
        const model = openrouter(OPENROUTER_COACH_MODEL);

        // Long-term memory: durable facts saved by the coach in past sessions.
        // (consts so the tool closures below keep the non-null narrowing)
        const authedSupabase = supabase;
        const authedUserId = userId;
        let memories: string[] = [];
        if (authedSupabase && authedUserId) {
          const [threadResult, memoryResult] = await Promise.all([
            authedSupabase
              .from("coach_threads")
              .select("id")
              .eq("id", threadId)
              .eq("user_id", authedUserId)
              .maybeSingle(),
            authedSupabase
              .from("coach_user_memory")
              .select("memories")
              .eq("user_id", authedUserId)
              .maybeSingle(),
          ]);
          if (!threadResult.data) return new Response("Thread not found", { status: 404 });
          const mem = memoryResult.data;
          if (Array.isArray(mem?.memories)) {
            memories = (mem.memories as unknown[]).filter(
              (m): m is string => typeof m === "string",
            );
          }
        }

        const tools = {
          suggest_workout: tool({
            description:
              "Suggest a workout. The app will render the list and an 'Add to today's workout' button.",
            inputSchema: z.object({
              title: z.string().describe("Short workout title, e.g. 'Dumbbell upper body'."),
              exercises: z
                .array(
                  z.object({
                    name: z.string(),
                    sets: z.number().int().min(1).max(10),
                    reps: z.string().describe("e.g. '8-10' or '12'"),
                    notes: z.string().optional(),
                  }),
                )
                .min(1)
                .max(10),
            }),
            execute: async (input) => input,
          }),
          suggest_meal: tool({
            description:
              "Suggest 1-3 meal options that fit the user's remaining calories/protein. The app renders a 'Log this meal' button.",
            inputSchema: z.object({
              options: z
                .array(
                  z.object({
                    name: z.string(),
                    kcal: z.number().int().min(0),
                    proteinG: z.number().int().min(0),
                    carbsG: z.number().int().min(0).optional(),
                    fatG: z.number().int().min(0).optional(),
                    notes: z.string().optional(),
                  }),
                )
                .min(1)
                .max(3),
            }),
            execute: async (input) => input,
          }),
          open_screen: tool({
            description: "Suggest the user open a specific app screen. The app renders a button.",
            inputSchema: z.object({
              screen: z.enum(["nutrition", "workouts", "progress", "profile", "home"]),
              label: z.string().optional(),
            }),
            execute: async (input) => input,
          }),
          ...(authedSupabase && authedUserId
            ? {
                remember: tool({
                  description:
                    "Save one short durable fact about the user for future coaching sessions (injuries, preferences, constraints, PRs, motivations). Only for facts that stay relevant for weeks or longer.",
                  inputSchema: z.object({
                    fact: z
                      .string()
                      .min(3)
                      .max(300)
                      .describe("Self-contained sentence, e.g. 'Trains fasted in the mornings'."),
                  }),
                  execute: async ({ fact }) => {
                    memories = [...memories.filter((m) => m !== fact), fact].slice(-50);
                    const { error } = await authedSupabase
                      .from("coach_user_memory")
                      .upsert({ user_id: authedUserId, memories }, { onConflict: "user_id" });
                    if (error) {
                      console.error("[coach] remember failed", error);
                      return { saved: false };
                    }
                    return { saved: true, totalMemories: memories.length };
                  },
                }),
              }
            : {}),
        } as const;

        const memoryBlock =
          memories.length > 0
            ? `\n\nLONG_TERM_MEMORY (facts you saved in earlier sessions):\n${memories
                .map((m) => `- ${m}`)
                .join("\n")}`
            : "";

        const system = `${SYSTEM_PROMPT}${memoryBlock}\n\nUSER_CONTEXT:${JSON.stringify(userContext ?? {})}`;
        const recentMessages = messages.slice(-12);

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(recentMessages),
          tools,
          maxOutputTokens: 600,
          maxRetries: 1,
          temperature: 0.25,
          stopWhen: stepCountIs(4),
          providerOptions: {
            openrouter: {
              reasoning: { enabled: false, exclude: true },
              provider: {
                sort: "latency",
                allow_fallbacks: true,
                preferred_max_latency: { p90: 2 },
              },
              session_id: threadId,
            },
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            const assistant = [...finalMessages].reverse().find((m) => m.role === "assistant");
            if (!assistant) return;
            try {
              const rows = [
                ...(lastUser
                  ? [
                      {
                        id: lastUser.id,
                        thread_id: threadId,
                        user_id: userId,
                        role: "user",
                        parts: lastUser.parts as unknown as Json,
                      },
                    ]
                  : []),
                {
                  id: assistant.id,
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  parts: assistant.parts as unknown as Json,
                },
              ];
              await Promise.all([
                supabase.from("coach_messages").upsert(rows, { onConflict: "id" }),
                supabase
                  .from("coach_threads")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", threadId),
              ]);
            } catch (e) {
              console.error("[coach] persist assistant failed", e);
            }
          },
        });
      },
    },
  },
});
