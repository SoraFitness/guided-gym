# RevenueCat setup

The iOS SDK uses the public `VITE_REVENUECAT_IOS_API_KEY` and entitlement identifier
`VITE_REVENUECAT_ENTITLEMENT_ID`. They are app configuration, not server secrets.

RevenueCat verification happens only in the `subscription-access` Supabase Edge Function.
Configure these Supabase Edge Function secrets yourself:

- `REVENUECAT_SECRET_API_KEY` - RevenueCat REST API V1 secret key.
- `REVENUECAT_ENTITLEMENT_ID` - the entitlement identifier, currently `pro`.

Do not put the RevenueCat secret API key in a `VITE_` variable, the iOS app bundle, or a
committed file. See `docs/supabase-edge-secrets.md` for all secret and deployment commands.
