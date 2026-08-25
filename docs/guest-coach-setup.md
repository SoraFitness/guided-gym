# Guest Coach setup

Coach creates a Supabase anonymous identity for a Premium guest before it sends an AI request. This lets the existing authenticated `ai-gateway` and subscription checks protect the feature without placing any server key in the app.

Before deploying this version, enable **Anonymous Sign-Ins** in the Supabase Dashboard for project `adzfzimuranhrllbxfyf`:

1. Open **Authentication** > **Providers**.
2. Enable **Anonymous Sign-Ins** and save.
3. If guests can save their account with Google, also enable **Manual Linking** in the authentication settings.

Email account creation upgrades the same anonymous identity, preserving its Coach data and RevenueCat customer association. Do not enable anonymous sign-ins without the normal Supabase Auth rate limits and CAPTCHA protections for production.
