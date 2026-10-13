import Foundation
import Capacitor

/// Bridges the web layer to `TikTokEvents`.
///
/// The web app is served from a hosted URL, so the business logic that knows when a
/// member registers or subscribes lives in JavaScript. These methods let it hand those
/// moments to the native SDK, which is what actually reports to TikTok. Install, launch
/// and retention need no bridge — the SDK reports them natively on its own.
///
/// Every method resolves rather than rejecting when the SDK is not configured, so a
/// build without TikTok credentials behaves exactly like the app does today.
@objc(TikTokEventsPlugin)
public class TikTokEventsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TikTokEventsPlugin"
    public let jsName = "TikTokEvents"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestTrackingAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "identify", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "trackRegistration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "trackTrialStarted", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "trackSubscription", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "flush", returnType: CAPPluginReturnPromise),
    ]

    @objc func getStatus(_ call: CAPPluginCall) {
        let status = TikTokEvents.status()
        call.resolve([
            "configured": status.configured,
            "initialized": status.initialized,
            "trackingEnabled": status.trackingEnabled,
            "userTrackingEnabled": status.userTrackingEnabled,
            "debugMode": status.debugMode,
            "sdkVersion": status.sdkVersion,
        ])
    }

    @objc func requestTrackingAuthorization(_ call: CAPPluginCall) {
        TikTokEvents.requestTrackingAuthorization { status in
            call.resolve(["status": Int(status)])
        }
    }

    @objc func identify(_ call: CAPPluginCall) {
        TikTokEvents.identify(
            externalId: call.getString("externalId"),
            externalUserName: call.getString("userName"),
            phoneNumber: call.getString("phoneNumber"),
            email: call.getString("email")
        )
        call.resolve()
    }

    @objc func logout(_ call: CAPPluginCall) {
        TikTokEvents.logout()
        call.resolve()
    }

    @objc func trackRegistration(_ call: CAPPluginCall) {
        guard let userId = call.getString("userId"), !userId.isEmpty else {
            call.reject("userId is required")
            return
        }
        let reported = TikTokEvents.trackRegistration(userId: userId, method: call.getString("method"))
        call.resolve(["reported": reported])
    }

    @objc func trackTrialStarted(_ call: CAPPluginCall) {
        guard let dedupeKey = call.getString("dedupeKey"), !dedupeKey.isEmpty else {
            call.reject("dedupeKey is required")
            return
        }
        let reported = TikTokEvents.trackStartTrial(
            dedupeKey: dedupeKey,
            productId: call.getString("productId"),
            value: call.getDouble("value"),
            currency: call.getString("currency")
        )
        call.resolve(["reported": reported])
    }

    /// A paid subscription: reports `Subscribe` (for event optimisation) and, when a
    /// price is known, `Purchase` with revenue (for value-based optimisation).
    @objc func trackSubscription(_ call: CAPPluginCall) {
        guard let dedupeKey = call.getString("dedupeKey"), !dedupeKey.isEmpty else {
            call.reject("dedupeKey is required")
            return
        }
        let productId = call.getString("productId")
        let currency = call.getString("currency")
        let value = call.getDouble("value")

        let subscribed = TikTokEvents.trackSubscribe(
            dedupeKey: dedupeKey,
            productId: productId,
            value: value,
            currency: currency
        )

        var purchased = false
        if let value, value > 0 {
            purchased = TikTokEvents.trackPurchase(
                dedupeKey: dedupeKey,
                productId: productId,
                value: value,
                currency: currency
            )
        }

        call.resolve(["reported": subscribed || purchased])
    }

    @objc func flush(_ call: CAPPluginCall) {
        TikTokEvents.flush()
        call.resolve()
    }
}
