# RevenueCat setup

The iOS SDK uses the public RevenueCat iOS SDK key and entitlement identifier
`VITE_REVENUECAT_ENTITLEMENT_ID`. Every iOS build must include
`VITE_REVENUECAT_IOS_API_KEY`; subscription products load directly through the RevenueCat iOS
SDK and Apple StoreKit, without a Supabase checkout request. The iOS SDK key is public app
configuration, not a RevenueCat secret API key.

RevenueCat verification happens only in the `subscription-access` Supabase Edge Function. The
paywall fetches the current RevenueCat offering and completes purchases directly through the iOS
SDK; it does not call a Supabase Edge Function.
Configure these Supabase Edge Function secrets yourself:

- `REVENUECAT_SECRET_API_KEY` - RevenueCat REST API V1 secret key.
- `REVENUECAT_ENTITLEMENT_ID` - the entitlement identifier, currently `pro`.

Do not put the RevenueCat secret API key in a `VITE_` variable, the iOS app bundle, or a
committed file. See `docs/supabase-edge-secrets.md` for all secret and deployment commands.
