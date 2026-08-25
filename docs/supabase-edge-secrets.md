# Supabase Edge Function secrets

All backend credentials now live in Supabase Edge Function secrets for project
`adzfzimuranhrllbxfyf`. Do not add any of them to `.env`, `.env.example`, or `VITE_`
variables.

## Migration map

| Current variable | Secret/public | Previously used by | New Supabase location |
| --- | --- | --- |
| `REVENUECAT_SECRET_API_KEY` | Secret | TanStack subscription checks and Coach | `subscription-access`; reused by paid Edge Functions |
| `REVENUECAT_ENTITLEMENT_ID` | Server configuration | TanStack subscription checks | `subscription-access`; reused by paid Edge Functions. Optional when the entitlement is `pro`, which is the built-in default. |
| `OPENROUTER_API_KEY` | Secret | Coach, scans, food scan, reports, workout plans, cron | `ai-gateway`, `finalize-weekly-reports` |
| `OPENROUTER_FACE_SCAN_API_KEY` | Secret | Face Scan | `ai-gateway` |
| `OPENROUTER_BODY_SCAN_API_KEY` | Secret | Body Scan | `ai-gateway` |
| `LOVABLE_API_KEY` | Secret | Food Scan, progress photos, reports, cron | `ai-gateway`, `finalize-weekly-reports` |
| `NUTRITIONIX_APP_ID` | Secret credential | Nutrition search | `food-provider` |
| `NUTRITIONIX_API_KEY` | Secret | Nutrition search | `food-provider` |
| `USDA_API_KEY` | Secret | USDA food search | `food-provider` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Account deletion, onboarding insights, weekly cron | Platform-injected only: `account-delete`, `onboarding`, `finalize-weekly-reports` |
| `CRON_SECRET` | Secret | App-hosted weekly report cron | `finalize-weekly-reports` |
| `ONBOARDING_INSIGHTS_ADMIN_EMAILS` | Server policy configuration | Onboarding admin screen | `onboarding` |

| Client configuration | Classification | Reason |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | Required to connect the browser to Supabase; database access is constrained by RLS and user JWTs. |
| `VITE_REVENUECAT_IOS_API_KEY` | Public | RevenueCat’s iOS SDK key is designed to ship in the app bundle. |
| `VITE_REVENUECAT_ENTITLEMENT_ID` | Public identifier | Used by the iOS SDK UI state only; Edge Functions make the authoritative paid-access decision. |
| `ASCENDR_APP_URL`, `NODE_ENV`, `VERCEL` | Non-secret deployment configuration | Used only by Capacitor/Vite runtime behavior. |

Open Food Facts has no credential and remains a public backend lookup. Supabase browser data access
continues to use the publishable key and row-level security; it does not use a service-role key.

Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
into Edge Functions. Do not set or expose those platform-managed values manually.

## Configure production secrets

Run each command locally and replace only the placeholder after the equals sign. Never paste
the values into source control or chat.

```powershell
npx supabase link --project-ref adzfzimuranhrllbxfyf
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf REVENUECAT_SECRET_API_KEY=<your-value>
# Optional only if your RevenueCat entitlement ID is not `pro`:
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf REVENUECAT_ENTITLEMENT_ID=<your-entitlement-id>
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf OPENROUTER_API_KEY=<your-value>
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf OPENROUTER_FACE_SCAN_API_KEY=<your-value>
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf OPENROUTER_BODY_SCAN_API_KEY=<your-value>
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf LOVABLE_API_KEY=<your-value>
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf NUTRITIONIX_APP_ID=<your-value>
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf NUTRITIONIX_API_KEY=<your-value>
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf USDA_API_KEY=<your-value>
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf CRON_SECRET=<your-value>
npx supabase secrets set --project-ref adzfzimuranhrllbxfyf ONBOARDING_INSIGHTS_ADMIN_EMAILS=<comma-separated-admin-emails>
```

Only set the optional provider-specific OpenRouter secrets when you use distinct keys for those
features. Otherwise omit them and `OPENROUTER_API_KEY` is used.

## Deploy

```powershell
npx supabase functions deploy subscription-access --project-ref adzfzimuranhrllbxfyf
npx supabase functions deploy ai-gateway --project-ref adzfzimuranhrllbxfyf
npx supabase functions deploy food-provider --project-ref adzfzimuranhrllbxfyf
npx supabase functions deploy account-delete --project-ref adzfzimuranhrllbxfyf
npx supabase functions deploy onboarding --project-ref adzfzimuranhrllbxfyf
npx supabase functions deploy finalize-weekly-reports --project-ref adzfzimuranhrllbxfyf
```

Point the weekly scheduler at `https://adzfzimuranhrllbxfyf.supabase.co/functions/v1/finalize-weekly-reports`
with `Authorization: Bearer <CRON_SECRET>`. Retire the old app-hosted
`/api/public/hooks/finalize-weekly-reports` schedule after this function is deployed.

## Local development

Copy `supabase/.env.example` to `supabase/.env.local`, enter values locally, and keep that file
untracked. Add local Supabase platform values from `npx supabase status` when running privileged
functions locally.

```powershell
Copy-Item supabase/.env.example supabase/.env.local
npx supabase start
npx supabase functions serve ai-gateway --env-file supabase/.env.local
```

The browser only needs the public values documented in the root `.env.example`.
