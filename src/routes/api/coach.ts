import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Body = {
  messages: UIMessage[];
  threadId: string;
  userContext?: unknown;
};

const SYSTEM_PROMPT = `You are "Coach", the in-app AI fitness coach for the Pulse fitness app.

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
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length);

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Backend not configured", { status: 500 });
        }
        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub as string;

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

        // Verify the thread belongs to this user
        const { data: thread } = await supabase
          .from("coach_threads")
          .select("id")
          .eq("id", threadId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        // Persist latest user message before streaming (last item of messages)
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
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
              parts: lastUser.parts as unknown as object,
            });
          }
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

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
        } as const;

        const system = `${SYSTEM_PROMPT}\n\nUSER_CONTEXT:\n${JSON.stringify(
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
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
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
                  .update({ parts: assistant.parts as unknown as object })
                  .eq("id", assistant.id);
              } else {
                await supabase.from("coach_messages").insert({
                  id: assistant.id,
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  parts: assistant.parts as unknown as object,
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
