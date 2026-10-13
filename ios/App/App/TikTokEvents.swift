import Foundation
import TikTokBusinessSDK

/// Owns the TikTok App Events SDK for the app.
///
/// Credentials come from Info.plist (populated from `ios/tiktok.xcconfig`, which is
/// git-ignored) so nothing sensitive reaches the JavaScript bundle or the repository.
/// When the keys are absent the SDK stays off and every call here is a no-op, so a
/// checkout without the config file still builds and runs normally.
///
/// Install / LaunchAPP / 2DRetention are reported automatically by the SDK.
/// Registration, StartTrial, Subscribe and Purchase are reported explicitly from the
/// app, deduplicated in `reportOnce(key:)` so a repeated call can never double count.
enum TikTokEvents {

    private enum InfoKey {
        static let appStoreId = "TikTokAppStoreID"
        static let tiktokAppId = "TikTokAppID"
        static let appSecret = "TikTokAppSecret"
    }

    private static let dedupePrefix = "com.ascendr.tiktok.reported."
    /// Apple asks that the ATT prompt not interrupt launch; the SDK also holds its first
    /// flush for this long so the opening events can carry the IDFA when consent is given.
    private static let attDelaySeconds: Int = 5

    private(set) static var isConfigured = false

    // MARK: - Configuration

    private static func infoValue(_ key: String) -> String? {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        // An unset xcconfig variable resolves to the literal "$(NAME)" or an empty string.
        guard !trimmed.isEmpty, !trimmed.hasPrefix("$(") else { return nil }
        return trimmed
    }

    /// Starts the SDK. Safe to call more than once.
    static func start() {
        guard !isConfigured else { return }

        guard let appStoreId = infoValue(InfoKey.appStoreId),
              let tiktokAppId = infoValue(InfoKey.tiktokAppId),
              let appSecret = infoValue(InfoKey.appSecret)
        else {
            print("[tiktok] Not configured; skipping SDK start. See ios/tiktok.xcconfig.example")
            return
        }

        // `accessToken:` is the SDK's own parameter name, but the SDK uses this value
        // as an HMAC-SHA256 signing secret (X-TT-Signature), so it is the App Secret
        // from TikTok Events Manager — not a bearer token.
        guard let config = TikTokConfig(accessToken: appSecret, appId: appStoreId, tiktokAppId: tiktokAppId) else {
            print("[tiktok] TikTokConfig could not be created; check the configured values")
            return
        }

        // Automatic InstallApp / LaunchAPP / 2DRetention stay on: those are the install and
        // app-open signals TikTok attributes against, and they need no app code.
        //
        // Automatic payment tracking is turned OFF on purpose. The SDK's StoreKit observer
        // would emit its own purchase event for every transaction, which would double count
        // against the Subscribe/Purchase events this app sends from RevenueCat — and it
        // cannot tell an introductory/trial transaction apart from a paid one. RevenueCat is
        // the single source of truth for entitlement here, so the app reports those itself.
        config.disablePaymentTracking()

        // Give the user a moment to answer the ATT prompt before the first flush.
        config.setDelayForATTUserAuthorizationInSeconds(attDelaySeconds)

        #if DEBUG
        config.setLogLevel(TikTokLogLevelDebug)
        #endif

        TikTokBusiness.initializeSdk(config) { success, error in
            if success {
                isConfigured = true
                print("[tiktok] SDK initialized (v\(TikTokBusiness.getSDKVersion()))")
            } else {
                print("[tiktok] SDK failed to initialize: \(error?.localizedDescription ?? "unknown error")")
            }
        }
    }

    /// Presents the App Tracking Transparency prompt if it has not been answered yet.
    /// The SDK no longer raises this dialog on its own, so the app has to ask.
    static func requestTrackingAuthorization(completion: ((UInt) -> Void)? = nil) {
        TikTokBusiness.requestTrackingAuthorization { status in
            completion?(status)
        }
    }

    // MARK: - Deduplication

    /// Runs `work` only the first time it is called for `key` on this device.
    @discardableResult
    private static func reportOnce(key: String, work: () -> Void) -> Bool {
        let defaultsKey = dedupePrefix + key
        guard !UserDefaults.standard.bool(forKey: defaultsKey) else { return false }
        UserDefaults.standard.set(true, forKey: defaultsKey)
        work()
        return true
    }

    // MARK: - Identity

    static func identify(externalId: String?, externalUserName: String?, phoneNumber: String?, email: String?) {
        TikTokBusiness.identify(
            withExternalID: externalId,
            externalUserName: externalUserName,
            phoneNumber: phoneNumber,
            email: email
        )
    }

    static func logout() {
        TikTokBusiness.logout()
    }

    // MARK: - Events

    /// TikTok standard `Registration` event, reported once per account.
    @discardableResult
    static func trackRegistration(userId: String, method: String?) -> Bool {
        return reportOnce(key: "registration." + userId) {
            let event = TikTokBaseEvent(eventName: TTEventName.registration.rawValue)
            if let method { event.addProperty(withKey: "registration_method", value: method) }
            TikTokBusiness.trackTTEvent(event)
        }
    }

    /// TikTok standard `StartTrial` event, reported once per subscription.
    @discardableResult
    static func trackStartTrial(dedupeKey: String, productId: String?, value: Double?, currency: String?) -> Bool {
        return reportOnce(key: "start_trial." + dedupeKey) {
            let event = TikTokBaseEvent(eventName: TTEventName.startTrial.rawValue)
            if let productId { event.addProperty(withKey: "content_id", value: productId) }
            event.addProperty(withKey: "content_type", value: "product")
            if let value { event.addProperty(withKey: "value", value: NSNumber(value: value)) }
            if let currency { event.addProperty(withKey: "currency", value: currency) }
            TikTokBusiness.trackTTEvent(event)
        }
    }

    /// TikTok standard `Subscribe` event, reported once per subscription.
    @discardableResult
    static func trackSubscribe(dedupeKey: String, productId: String?, value: Double?, currency: String?) -> Bool {
        return reportOnce(key: "subscribe." + dedupeKey) {
            let event = TikTokBaseEvent(eventName: TTEventName.subscribe.rawValue)
            if let productId { event.addProperty(withKey: "content_id", value: productId) }
            event.addProperty(withKey: "content_type", value: "product")
            if let value { event.addProperty(withKey: "value", value: NSNumber(value: value)) }
            if let currency { event.addProperty(withKey: "currency", value: currency) }
            TikTokBusiness.trackTTEvent(event)
        }
    }

    /// TikTok standard `Purchase` event with revenue, reported once per transaction.
    /// This is what value-based optimisation (VBO) bids against.
    @discardableResult
    static func trackPurchase(dedupeKey: String, productId: String?, value: Double, currency: String?) -> Bool {
        return reportOnce(key: "purchase." + dedupeKey) {
            let event = TikTokPurchaseEvent(eventId: dedupeKey)
            event.setContentType("product")
            if let productId { event.setContentId(productId) }
            event.setValue(String(value))
            if let currency { event.setCurrency(TTCurrency(rawValue: currency)) }
            TikTokBusiness.trackTTEvent(event)
        }
    }

    // MARK: - Diagnostics

    /// Plain values so the Capacitor layer can build its own JSObject; Capacitor's
    /// JSValue protocol does not accept an untyped [String: Any].
    struct Status {
        let configured: Bool
        let initialized: Bool
        let trackingEnabled: Bool
        let userTrackingEnabled: Bool
        let debugMode: Bool
        let sdkVersion: String
    }

    static func status() -> Status {
        return Status(
            configured: isConfigured,
            initialized: TikTokBusiness.isInitialized(),
            trackingEnabled: TikTokBusiness.isTrackingEnabled(),
            userTrackingEnabled: TikTokBusiness.isUserTrackingEnabled(),
            debugMode: TikTokBusiness.isDebugMode(),
            sdkVersion: TikTokBusiness.getSDKVersion()
        )
    }

    static func flush() {
        TikTokBusiness.explicitlyFlush()
    }
}
