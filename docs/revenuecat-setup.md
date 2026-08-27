# RevenueCat setup

The iOS SDK uses the public RevenueCat iOS SDK key and entitlement identifier
`VITE_REVENUECAT_ENTITLEMENT_ID`. Every iOS build must include
`VITE_REVENUECAT_IOS_API_KEY`; subscription products load directly through the RevenueCat iOS
SDK and Apple StoreKit, without a Supabase checkout request. The iOS SDK key is public app
configuration, not a RevenueCat secret API key.

RevenueCat verification happens only in the `subscription-access` Supabase Edge Function.
Configure these Supabase Edge Function secrets yourself:

- `REVENUECAT_SECRET_API_KEY` - RevenueCat REST API V1 secret key.
- `REVENUECAT_ENTITLEMENT_ID` - the entitlement identifier, currently `pro`.
- `REVENUECAT_IOS_API_KEY` - public iOS SDK key served only to initialize the iOS SDK in hosted builds.

Do not put the RevenueCat secret API key in a `VITE_` variable, the iOS app bundle, or a
committed file. See `docs/supabase-edge-secrets.md` for all secret and deployment commands.
