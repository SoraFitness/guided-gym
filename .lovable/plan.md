## Part 1 — Make it feel like a native iOS PWA (installable only, no service worker)

**New files in `public/`** (icons via `imagegen`, dark background with neon accent mark):

- `manifest.webmanifest` — `name: "Sora"`, `short_name: "Sora"`, `display: "standalone"`, `start_url: "/"`, `scope: "/"`, `background_color: "#0A0A0A"`, `theme_color: "#0A0A0A"`, `orientation: "portrait"`, icons 192/512 + maskable 512.
- `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon-180.png`, `favicon.ico`.
- `apple-splash-{1290x2796, 1179x2556, 1170x2532, 1284x2778, 1125x2436, 828x1792, 750x1334}.png` — generated dark splash with centered logo.

**`src/routes/__root.tsx`** — add head tags:

- `<link rel="manifest" href="/manifest.webmanifest">`
- `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title" content="Sora">`
- `<meta name="format-detection" content="telephone=no">`
- Confirm viewport already has `viewport-fit=cover` (it does).
- One `<link rel="apple-touch-startup-image">` per splash size with `media="(device-width: …px) and (device-height: …px) and (-webkit-device-pixel-ratio: …) and (orientation: portrait)"`.

**`src/styles.css`** — safe-area + native feel:

- `html, body { height: 100%; overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; }`
- `body { background: hsl(var(--background)); }` to kill white rubber-band gap.
- `* { -webkit-touch-callout: none; }` on app shell.
- Utility classes: `.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe` mapping to `env(safe-area-inset-*)`.
- `.tap` → `min-height: 44px; min-width: 44px; touch-action: manipulation;`
- `.scroll-smooth-ios { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }`

**`src/routes/_app.tsx`** — apply safe areas:

- Outer wrapper gets `pt-safe`.
- Bottom-nav `<nav>` gets `pb-safe` and `pb-[max(20px,env(safe-area-inset-bottom))]`.
- Content area padding-bottom uses `calc(safe-area + 96px)`.
- Add a thin app-style page transition: wrap `<Outlet />` in framer-motion with `AnimatePresence mode="wait"` keyed on pathname (slide+fade, 180ms).

**No service worker, no `vite-plugin-pwa`** (per "installable only").

---

## Part 2 — Onboarding: layer the missing steps on top

Keep the existing `/onboarding` flow but extend `Draft` and add four steps. New optional fields persisted to profile state (no migration needed unless we want analytics in DB — see Referral section).

**Extended Draft fields:**

- `referralSource: "tiktok" | "instagram" | "youtube" | "friend" | "appstore" | "google" | "other" | null`
- `referralCode: string | null`

**New step screens (inserted in the existing step array, same card style as today's screens — selected cards highlighted, big tap targets, Continue gated):**

1. **Referral source** — placed right after the Goal step. Single-select cards (TikTok, Instagram, YouTube, Friend, App Store, Google, Other). Saved to profile.
2. **Referral code** — placed after weights. Text input + Skip + Apply. Track-only: stores string on profile; no validation, no discount.
3. **Body scan teaser** — placed right before final review/save. Marketing screen with bullets (Upload or scan, AI feedback, Track changes, Progress photos, Personalized recommendations) and a single "Continue" CTA. **Does NOT launch the scan** (per your "marketing screen only" choice). Note: your original spec mentioned "Start Body Scan" — confirm in build mode if you'd prefer that linked instead.
4. **Customizing your plan loader** — full-screen step that runs after Save, before navigating to `/paywall` or `/home`. Sequence of 6 lines that tick on in order (200–500ms each) with a single animated progress bar from 0→100% over ~3s:
   - Analyzing your goal
   - Building your workout plan
   - Setting your calorie target
   - Matching exercises to your equipment
   - Personalizing your nutrition
   - Preparing your dashboard

Other spec items mapped to existing steps (already collected, just reordered / relabeled where needed): gender, experience, days/week, goal, equipment (multi-select — current flow is single-select; switch the Equipment step to multi-select array stored as `equipmentSetups: EquipmentSetup[]` with primary = first), name, age, units, current weight, goal weight.

**Save behavior:** Continue to save the whole `Draft` to profile on the existing final step; the new fields ride along. Referral code + source are stored on the profile object.

**Progress bar:** existing top progress indicator continues to work since steps are part of the same array.

---

## Part 3 — Paywall: add referral input (track-only)

`src/routes/paywall.tsx`:

- New collapsible "Have a referral code?" section above the CTA.
- Input + Apply button → on apply, persist to profile (`referralCode`), show inline `✓ Code saved` state. No price change, no validation.
- Safe-area padding (`pb-safe`).

---

## Part 4 — Use onboarding data

Mostly already wired (`workoutRecommendationService`, `suggestNutrition`, `saveGoals` are already called on the final onboarding step). Verification + small fixes only:

- Confirm goal, experience, daysPerWeek, equipment, currentWeight, goalWeight, age, gender flow into the existing recommendation calls. Adjust calls if the equipment field becomes an array (use first item as primary for the existing single-equipment engine).
- Personalize Home greeting using `profile.name` (already supported by `useProfile`).
- No new plan engine; we're not re-architecting business logic (out of scope per "UI change → keep work in frontend").

---

## Part 5 — Quality checklist (what we'll verify before closing)

- App opens in standalone mode after Add to Home Screen (manifest + apple meta).
- No white rubber-band gap (body bg + `overscroll-behavior: none`).
- Bottom nav clears the home indicator (`pb-safe`).
- Onboarding steps all advance, save, and route to `/paywall` then `/home`.
- Referral code visible in onboarding and on paywall.
- Body scan teaser renders and continues.
- Customizing-plan loader runs and routes correctly.

---

## Technical notes

- **Icons & splashes**: generated with `imagegen` (dark `#0A0A0A` bg, neon `#C6FF00`-style mark) and placed in `public/`. ~10 PNGs total.
- **No DB migration**: referral source/code stored on the in-memory/persisted `Profile` (the existing `ProfileProvider`). If you later want analytics in Supabase, we can add a `referrals` table in a follow-up — flagged but not in this plan.
- **No new packages.**
- **Files touched (estimate)**: `public/*` (new), `src/routes/__root.tsx`, `src/styles.css`, `src/routes/_app.tsx`, `src/routes/onboarding.tsx`, `src/routes/paywall.tsx`, `src/lib/profile.tsx` (extend Profile/Draft types).

## Out of scope (call out)

- Service worker / offline caching.
- Referral discount logic or backend validation.
- Native body-scan launch from the teaser step (marketing-only).
- New plan generation engine — we reuse the existing services.
