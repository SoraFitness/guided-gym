# Supabase account setup

Ascendr creates email accounts with Supabase Auth. After a user confirms their email, the authenticated app starts cloud sync and upserts the local profile into `public.user_profiles` under that user ID.

## Required dashboard settings

In Supabase project `adzfzimuranhrllbxfyf`, open **Authentication** > **URL Configuration** and set:

1. **Site URL** to the HTTPS production URL stored in Codemagic as `ASCENDR_APP_URL`.
2. **Redirect URLs** to that same origin with a path wildcard, such as `https://your-production-app.example/**`.

The redirect URLs must cover `/home`, `/profile`, `/coach`, `/photos`, `/scan/face`, and `/scan/body/new` because account prompts can appear on each of those screens.

Then, in **Authentication** > **Providers**:

1. Keep **Email** enabled and **Confirm email** enabled.
2. Enable **Anonymous Sign-Ins** for secure Premium guest Coach access.
3. Enable **Manual Linking** if guests can save their account with Google.

## Verification

1. Create an account in the app and open the confirmation email on the same device.
2. Confirm that the app returns to the production app URL and shows the saved-account state on Profile.
3. In Supabase Dashboard, check **Authentication** > **Users** for the account, then check `public.user_profiles` after cloud sync completes.

Do not use a Supabase service-role key or any secret in the browser for this flow.
