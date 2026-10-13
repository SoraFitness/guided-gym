import Capacitor
import UIKit

/// Capacitor only auto-registers plugins listed in the generated `capacitor.config.json`,
/// which covers npm plugin packages (Apple Sign In, App, RevenueCat) but not plugins that
/// live in this app target. `TikTokEventsPlugin` is one of ours, so it is registered here.
///
/// Without this the web layer's `registerPlugin("TikTokEvents")` call would resolve to a
/// stub and every event would fail at runtime rather than at build time.
class AscendrBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(TikTokEventsPlugin())
    }
}
