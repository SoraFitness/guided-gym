# Body Scan — premium physique analysis

## Architecture

**Storage**: localStorage. No backend exists; the user said "use localStorage if no Supabase." Skipping Cloud keeps the change focused and avoids forcing a database for v1. (Easy to migrate later — service layer is the only thing that needs swapping.)

**AI analysis**: provision `LOVABLE_API_KEY` (via `ai_gateway--create`) and use Lovable AI Gateway with `google/gemini-2.5-flash` (multimodal: text+image→text) for real vision analysis. If the key call fails, we fall back to a deterministic local heuristic so the flow never breaks.

**Server boundary**: `createServerFn` (POST) — typed RPC is the right shape (one-shot JSON, not streaming). The handler receives front/side/back as base64 data URLs plus a minimal profile blob, calls the gateway with an `Output.object` Zod schema (constrained JSON), and returns a `BodyScanResult`.

## Files

**New types & service**
- `src/lib/bodyScan.ts` — types (`BodyScanScores`, `BodyScanResult`, `BodyScanInput`), level mapping (0–35 Starting Point, 36–55 Building Base, 56–72 Athletic, 73–85 Strong, 86–100 Advanced), and the deterministic mock generator that derives stable scores from profile (goal, experience, weight/height BMI, days/week) — same input → same output.
- `src/lib/bodyScan.functions.ts` — `analyzeBodyScan` server fn. Builds a multimodal chat message (text prompt + image_url blocks with data URLs), enforces Zod `Output.object`. Returns `{ source: "ai" | "mock", result }`. On any error (missing key, 429, 402, parsing): returns `{ source: "mock", result: mockFor(profile) }`.
- `src/lib/bodyScanStore.ts` — same useSyncExternalStore pattern as `nutritionStore`. Functions: `saveScan`, `deleteScan`, `useScans`, `useLatestScan`. Key: `fitness:bodyScans`. Stores result + thumbnail (front image downscaled to ~480px JPEG via canvas before save to keep localStorage small).

**New components**
- `src/components/bodyscan/BodyScoreBar.tsx` — labeled lime progress bar, large numeral on the right, animated width with framer-motion.
- `src/components/bodyscan/BodyScoreCard.tsx` — image preview card with overlaid "Overall Score 85" + level badge (matches reference screenshots: dark card, lime numerals, fine lime bars under labels).
- `src/components/bodyscan/BodyPhotoUploader.tsx` — three slots (Front required, Side & Back optional). Each slot opens a sheet with "Take photo" (uses `<input type="file" accept="image/*" capture="environment">`) and "Upload photo". Shows preview, swap, remove. Returns data URLs.
- `src/components/bodyscan/BodyScanAnalyzer.tsx` — fullscreen overlay with scanning-line animation over the front photo and rotating status text.

**New routes** (all under existing `/_app` layout)
- `src/routes/_app.scan.tsx` — Scan hub with two big tiles: **Food Scan** (links to `/nutrition` add modal) and **Body Scan** (links to `/scan/body`). Becomes the destination of the new bottom-nav "Scan" tab.
- `src/routes/_app.scan.body.tsx` — Body Scan intro: hero, "Start Body Scan" CTA, history list, disclaimer.
- `src/routes/_app.scan.body.new.tsx` — Multi-step flow inside one route, state machine: `guide → upload → analyzing → results`. Single page with framer-motion `AnimatePresence` between steps so transitions feel premium.
- `src/routes/_app.scan.body.$id.tsx` — view a saved scan + previous-scan comparison (score deltas).

**Edits**
- `src/routes/_app.tsx` — bottom nav becomes Home / Workouts / **Scan** / Nutrition / Profile (5 tabs, Scan in the middle). Existing Progress moves into Profile (already linked from there) — or, to stay non-destructive, swap Progress for Scan in the nav and keep `/progress` reachable from Profile via a row link. I'll swap Progress→Scan in nav.
- `src/routes/_app.profile.tsx` — add a small "View progress" row pointing to `/progress` so the route stays accessible.

**Optional but planned**
- Profile + Nutrition integration: results screen exposes "Apply suggested nutrition targets" → calls `setNutritionGoals()` (existing store) after a confirm. "Generate plan from scan" navigates to `/workouts` with a hint param.

## Server function shape

```ts
// src/lib/bodyScan.functions.ts (sketch)
export const analyzeBodyScan = createServerFn({ method: "POST" })
  .inputValidator((d: { front: string; side?: string; back?: string; profile: ProfileSlim }) => d)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { source: "mock", result: mockFor(data.profile) };
    try {
      const gateway = createLovableAiGatewayProvider(key);
      const { output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        output: Output.object({ schema: ScanSchema }),
        messages: [{ role: "user", content: [
          { type: "text", text: PROMPT(data.profile) },
          { type: "image_url", image_url: { url: data.front } },
          ...(data.side ? [{ type: "image_url", image_url: { url: data.side } }] : []),
          ...(data.back ? [{ type: "image_url", image_url: { url: data.back } }] : []),
        ]}],
      });
      return { source: "ai", result: { ...output, id: crypto.randomUUID(), createdAt: new Date().toISOString() } };
    } catch {
      return { source: "mock", result: mockFor(data.profile) };
    }
  });
```

`createLovableAiGatewayProvider` lives in `src/lib/ai-gateway.server.ts` (new, server-only).

**Prompt** is explicit: visual fitness assessment only, no medical claims, score every field 0–100, return arrays with 3–5 items, include a disclaimer string.

Will install `ai` and `@ai-sdk/openai-compatible` (and `zod` if not present) before writing the function file. Will run `ai_gateway--create` to ensure the key exists.

## UX details from the reference screenshots

- Dark card with photo bleeding to the edges, large "OVERALL SCORE" label + huge numeral overlay.
- Two-column score grid (Posture / Symmetry / Proportions / Definition / Conditioning / Upper / Lower / Core) — label + thin lime bar + numeral, matching the references.
- Level chip beside the overall score (Starting Point / Building Base / Athletic / Strong / Advanced).
- Strengths and Improvements as separate glass cards with bullets (lime check / amber arrow).
- Training Focus and Nutrition Focus cards below.
- Sticky bottom bar with "Save scan" + "Retake."
- Disclaimer fixed at the bottom of intro + results: *"Body Scan provides visual fitness feedback only. It is not medical advice and may not be perfectly accurate."*

## Safety & privacy

- Upload guidance copy + warning: "Upload fitness-appropriate photos only."
- Privacy line: "Photos are only used to generate your scan and stay on this device unless you save them."
- Delete button on every saved scan + bulk delete in history.

## Acceptance

- Front photo upload → preview → tap Analyze → scanning animation → real or mock result renders.
- Save → appears in `/scan/body` history; tapping opens the saved result with previous-score comparison.
- Bottom nav shows Scan tab; tapping it lands on the hub (Food Scan / Body Scan).
- Nutrition / Home / Workouts continue to work; `useNutrition` + `useProgress` unchanged.
- No TypeScript or import errors; `vite build` passes.
