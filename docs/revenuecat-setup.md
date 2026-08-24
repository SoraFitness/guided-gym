# RevenueCat setup

The app uses the current RevenueCat offering and grants premium access only when the `pro` entitlement is active. The Capacitor SDK is configured with the signed-in Supabase user ID when available, so purchases stay linked to the same Ascendr account across devices.

## Dashboard configuration

1. Create an iOS app in RevenueCat with bundle ID `com.ascendr.org` and add the App Store Connect credentials requested by RevenueCat.
2. In App Store Connect, create the auto-renewable products for weekly, monthly, and yearly access. Add them to the same subscription group.
3. In RevenueCat, import those products, create an entitlement named `pro`, and attach every subscription product to it.
4. Create a default Offering. Add the products as the built-in `Weekly`, `Monthly`, and `Annual` packages. The app reads this offering live, including localized store prices.
5. Add the public iOS SDK key to `.env` as `VITE_REVENUECAT_IOS_API_KEY`. Leave `VITE_REVENUECAT_ENTITLEMENT_ID` as `pro` unless the entitlement uses another identifier.

## Build and test

1. Run `npm run build` and `npx cap sync ios` after setting the environment values.
2. Open `ios/App/App.xcworkspace` in Xcode, sign with the `com.ascendr.org` App ID, and run on a physical iPhone using a Sandbox tester account.
3. Confirm that a purchase, app relaunch, and Restore Purchases each activate the `pro` entitlement in RevenueCat and unlock the app.

The web build intentionally never grants access through the Capacitor purchase plugin. Test subscription purchases in the native iOS app.
