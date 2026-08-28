# Supabase account setup

Ascendr creates email accounts with Supabase Auth. After a user confirms their email, the authenticated app starts cloud sync and upserts the local profile into `public.user_profiles` under that user ID.

## Required dashboard settings

In Supabase project `adzfzimuranhrllbxfyf`, open **Authentication** > **URL Configuration** and configure both the website and the native iOS callback:

1. **Site URL:** `https://ascendr.org`
2. **Redirect URLs:**
   - `ascendr://auth/callback`
   - `https://ascendr.org/**`
   - `https://guided-gym.vercel.app/**`

`https://ascendr.org` is the web fallback shown in authentication emails. The iOS app uses `ascendr://auth/callback` as its explicit redirect target and opens the confirmation link directly back in Ascendr. The Vercel URL remains allowlisted while the native app loads the hosted web shell from that domain.

The Sign in screen's **Forgot password?** action uses that same native callback. Ascendr opens its in-app password screen, requires the new password to be confirmed, then saves it and signs the user in through Supabase Auth. No website password-reset page is used. Keep `ascendr://auth/callback` allowlisted exactly as shown above.

Then, in **Authentication** > **Providers**:

1. Keep **Email** enabled and **Confirm email** enabled.
2. Enable **Manual Linking** only if you want to offer Google account linking for legacy users.

## Required production email delivery

Supabase's built-in email service is for testing only. It only sends to authorized team addresses and is rate-limited, so customer confirmation emails will not reliably arrive until custom SMTP is configured.

1. In Resend, verify an Ascendr sending domain (for example `auth.ascendr.org`) and add the DNS records Resend supplies.
2. In Supabase, open **Authentication** > **SMTP Settings** and configure the Resend SMTP credentials there.
3. Use a From address such as `no-reply@auth.ascendr.org` and sender name `Ascendr`.
4. Keep **Confirm email** enabled, save, then create a new test account and use **Resend confirmation email** if needed.
5. In **Authentication** > **Emails** > **Reset password**, keep the template enabled and retain the `{{ .ConfirmationURL }}` link so the recovery email can return to the app.

The Site URL controls redirects; it does not control the sender address. Custom SMTP is what makes messages arrive from your Ascendr domain.

## Verification

1. Build and install a new TestFlight version containing the iOS URL-scheme change.
2. Complete a Premium purchase, create an account on the secure post-purchase screen, and open the confirmation email on the same device.
3. Confirm that the email opens Ascendr and takes the user into the app.
4. In Supabase Dashboard, check **Authentication** > **Users** for the account, then check `public.user_profiles` after cloud sync completes.
5. On the Sign in tab, enter the account email, select **Forgot password?**, open the email on the same iPhone, set a new password in Ascendr, then sign in with it.

Do not use a Supabase service-role key or any secret in the browser for this flow.
