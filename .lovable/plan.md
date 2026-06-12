# AI Coach

A new bottom-nav tab that opens a streaming chat with a personal AI fitness coach. The coach reads the user's real profile, goal, nutrition logs, workout history, and weight logs, and can take real in-app actions through tool calls. Chat history is stored in Supabase per user.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud (Supabase) if not already on, plus email + Google auth (required so chats can be scoped to a user).

New tables (all RLS on, scoped to `auth.uid()`, with GRANTs to `authenticated` + `service_role`):

- `coach_threads` — `id uuid pk`, `user_id uuid`, `title text`, `created_at`, `updated_at`. v1 uses a single rolling thread per user, but the table supports future multi-thread.
- `coach_messages` — `id uuid pk`, `thread_id uuid fk`, `user_id uuid`, `role text` (`user` | `assistant`), `parts jsonb` (AI SDK `UIMessage.parts`), `created_at`.

## 2. AI streaming endpoint

`src/routes/api/coach.ts` — TanStack server route, `POST` handler:

1. Verify Supabase bearer token, resolve `userId`.
2. Load user context server-side: profile, current goal/plan via `calorieEngine`, today's nutrition totals, last 7 workouts, last 14 weight logs, equipment, injuries.
3. Build a system prompt with: coach persona (friendly, direct, motivating, safe), safety rules (no extreme deficits, no diagnosis, redirect to doctor on red-flag symptoms), and a compact JSON block of the user context.
4. `streamText` via Lovable AI Gateway using `google/gemini-3-flash-preview` (fast, strong default for chat); tools registered (see §3); `stopWhen: stepCountIs(50)`.
5. Persist the user message before streaming and the final assistant `UIMessage` in `onFinish` to `coach_messages`.
6. Return `toUIMessageStreamResponse({ originalMessages, onFinish })` with `withLovableAiGatewayRunIdHeader`.

`LOVABLE_API_KEY` stays server-side.

## 3. Tool calling (real actions)

Tools defined with `tool({ inputSchema: z..., execute })`. Execute runs server-side and returns a structured result the UI renders as an action card with a button.

- `suggest_workout` — input: `{ focus?, equipment?, durationMin? }`; returns an exercise list. Button: **Add to today's workout** (writes into `workoutSessionStore`).
- `suggest_meal` — input: `{ remainingKcal, remainingProteinG, preferences? }`; returns 2–3 meal options with macros. Button: **Log this meal** (opens nutrition logger prefilled).
- `adjust_today_workout` — input: `{ mode: "easier" | "harder" | "dumbbells_only" | "no_knee" }`; returns a modified version of today's planned session.
- `update_goal` — input: `{ goalWeightLb?, targetDate?, deficitSplit? }`; `needsApproval: true`; on approve, writes to profile.
- `open_screen` — input: `{ screen: "nutrition" | "progress" | "workout" | "goal" }`; UI renders a deep-link button.
- `log_weight` — input: `{ weightLb }`; appends to `weightLogStore`.

Tool results render as inline cards inside the assistant message (collapsed params, primary action button).

## 4. Frontend

Install AI Elements: `conversation`, `message`, `prompt-input`, `tool`, `shimmer`.

New files:

- `src/routes/_app.coach.tsx` — new tab page. Uses `useChat` with `DefaultChatTransport({ api: "/api/coach" })`, chat `id` = active thread id loaded from Supabase. Loads prior messages via a `createServerFn` (`getCoachThread`) on mount.
- `src/components/coach/CoachMessage.tsx` — renders `message.parts`: text via `MessageResponse` (markdown), tool parts via AI Elements `Tool` (collapsed by default) plus a custom action card per tool name.
- `src/components/coach/QuickPrompts.tsx` — horizontal scroll chips above the composer: "Plan my workout today", "What should I eat?", "Check my progress", "Help me hit protein", "Make workout easier", "Motivate me", "Why am I stuck?". Tapping a chip calls `sendMessage`.
- `src/components/coach/CoachComposer.tsx` — `PromptInput` + `PromptInputTextarea` + footer with submit (icon-sm). Keeps textarea focused.
- Clear-chat button in header → `clearCoachThread` server fn deletes messages, keeps thread row.

Bottom nav (`src/components/AppNav.tsx` or equivalent): add **Coach** entry with a custom generated coach avatar icon (not Sparkles). Existing tabs untouched.

States:
- Empty: avatar + "Ask your AI Coach anything — workouts, meals, calories, progress, or motivation." + quick prompts.
- Loading: AI Elements `Shimmer` "Coach is thinking…" while `status === "submitted"`.
- Error: toast + inline "Coach is unavailable right now. Please try again." with retry.

Assistant messages render on the page surface (no bubble). User messages use `primary` / `primary-foreground` bubble to match the dark fitness theme.

## 5. Safety

System prompt enforces:
- Never recommend <1500 kcal (men) / <1200 kcal (women) or >1% bodyweight/week loss; defer to existing `calorieEngine` safe alternative.
- No medical diagnosis. On mentions of chest pain, fainting, severe injury, or ED-pattern language, respond with a brief supportive message and direct to a qualified professional / emergency services.
- Cite the user's actual numbers when giving nutrition/training advice; don't fabricate.

## 6. Out of scope (v1)

- Multi-thread sidebar (schema supports it, UI is single rolling thread).
- Voice input.
- Sharing/exporting transcripts.

## Technical notes

- Stack: TanStack Start; chat endpoint is a server route, not an Edge Function.
- Model: `google/gemini-3-flash-preview` via Lovable AI Gateway (best general chat default — fast, low cost, strong tool calling). Easy to swap later.
- Conversation memory: full `UIMessage[]` for the active thread is replayed on each request (loaded from `coach_messages`).
- Auth: requires sign-in. If user isn't signed in, the Coach tab shows a "Sign in to use the AI Coach" CTA instead of the chat (no redirect loop).
- No existing feature is removed: 3D guidance, workout tracker, nutrition, body scan, progress, paywall, tour, profile all untouched.
