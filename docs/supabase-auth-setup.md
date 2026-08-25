# Supabase account setup

Ascendr creates email accounts with Supabase Auth. After a user confirms their email, the authenticated app starts cloud sync and upserts the local profile into `public.user_profiles` under that user ID.

## Required dashboard settings

In Supabase project `adzfzimuranhrllbxfyf`, open **Authentication** > **URL Configuration** and set the native iOS callback:

1. **Site URL:** `ascendr://auth/callback`
2. **Redirect URLs:** `ascendr://auth/callback`

The iOS app registers the `ascendr` URL scheme and completes the Supabase session after the confirmation link opens it. Add your HTTPS production app URL separately only if browser-based sign-in is also supported.

Then, in **Authentication** > **Providers**:

1. Keep **Email** enabled and **Confirm email** enabled.
2. Enable **Anonymous Sign-Ins** for secure Premium guest Coach access.
3. Enable **Manual Linking** if guests can save their account with Google.

## Verification

1. Build and install a new TestFlight version containing the iOS URL-scheme change.
2. Create an account in the app and open the confirmation email on the same device.
3. Confirm that the email opens Ascendr and shows the saved-account state on Profile.
4. In Supabase Dashboard, check **Authentication** > **Users** for the account, then check `public.user_profiles` after cloud sync completes.

Do not use a Supabase service-role key or any secret in the browser for this flow.
