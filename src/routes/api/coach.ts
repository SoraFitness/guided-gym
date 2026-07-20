import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { createOpenRouterProvider, OPENROUTER_COACH_MODEL } from "@/lib/openrouter.server";

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
        const key = process.env.OPENROUTER_API_KEY;
        if (!key) return new Response("Missing OPENROUTER_API_KEY", { status: 500 });

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const { messages, threadId, userContext } = body;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("Missing messages/threadId", { status: 400 });
        }

        const authHeader = request.headers.get("authorization");
        const guestMode = !authHeader && threadId.startsWith("guest-");
        let supabase: ReturnType<typeof createClient<Database>> | null = null;
        let userId: string | null = null;

        if (authHeader) {
          if (!authHeader.startsWith("Bearer ")) {
            return new Response("Unauthorized", { status: 401 });
          }
          const token = authHeader.slice("Bearer ".length);

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return new Response("Backend not configured", { status: 500 });
          }
          supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
          if (claimsErr || !claims?.claims?.sub) {
            return new Response("Unauthorized", { status: 401 });
          }
          userId = claims.claims.sub as string;
        } else if (!guestMode) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (supabase && userId) {
          // Verify the thread belongs to this user
          const { data: thread } = await supabase
            .from("coach_threads")
            .select("id")
            .eq("id", threadId)
            .eq("user_id", userId)
            .maybeSingle();
          if (!thread) return new Response("Thread not found", { status: 404 });
        }

        // Persist latest user message before streaming (last item of messages)
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (supabase && userId && lastUser) {
          // Avoid duplicate insert on retries by checking id existence
          const { data: existing } = await supabase
            .from("coach_messages")
            .select("id")
            .eq("id", lastUser.id)
            .maybeSingle();
          if (!existing) {
            await supabase.from("coach_messages").insert({
              id: lastUser.id,
              thread_id: threadId,
              user_id: userId,
              role: "user",
              parts: lastUser.parts as unknown as Json,
            });
          }
        }

        const openrouter = createOpenRouterProvider(key);
        const model = openrouter(OPENROUTER_COACH_MODEL);

        // Long-term memory: durable facts saved by the coach in past sessions.
        // (consts so the tool closures below keep the non-null narrowing)
        const authedSupabase = supabase;
        const authedUserId = userId;
        let memories: string[] = [];
        if (authedSupabase && authedUserId) {
          const { data: mem } = await authedSupabase
            .from("coach_user_memory")
            .select("memories")
            .eq("user_id", authedUserId)
            .maybeSingle();
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

        const system = `${SYSTEM_PROMPT}${memoryBlock}\n\nUSER_CONTEXT:\n${JSON.stringify(
          userContext ?? {},
          null,
          2,
        )}`;

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
          providerOptions: {
            // Merged into the OpenRouter request body. Qwen 3.5 Plus is a hybrid
            // reasoning model: low effort keeps coach replies snappy, and exclude
            // keeps thinking tokens out of the streamed response. Raise effort or
            // drop exclude to surface step-by-step reasoning in the UI.
            openrouter: {
              reasoning: { enabled: true, effort: "low", exclude: true },
            },
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            if (!supabase || !userId) return;
            const assistant = [...finalMessages].reverse().find((m) => m.role === "assistant");
            if (!assistant) return;
            try {
              const { data: existing } = await supabase
                .from("coach_messages")
                .select("id")
                .eq("id", assistant.id)
                .maybeSingle();
              if (existing) {
                await supabase
                  .from("coach_messages")
                  .update({ parts: assistant.parts as unknown as Json })
                  .eq("id", assistant.id);
              } else {
                await supabase.from("coach_messages").insert({
                  id: assistant.id,
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  parts: assistant.parts as unknown as Json,
                });
              }
              await supabase
                .from("coach_threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId);
            } catch (e) {
              console.error("[coach] persist assistant failed", e);
            }
          },
        });
      },
    },
  },
});
