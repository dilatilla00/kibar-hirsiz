import UIKit
import GoogleMobileAds
import UserMessagingPlatform
import AppTrackingTransparency

/// Ödüllü reklamlar (AdMob).
/// Sıra: Google onay penceresi (UMP, AB/İngiltere vb. için) → Apple izleme izni (ATT) → AdMob başlat → reklamı önceden yükle.
/// Oyuncu "reklam izle" dediğinde hazır reklam gösterilir; ödül ancak reklam sonuna kadar izlenirse verilir.
final class AdsManager: NSObject, FullScreenContentDelegate {
    static let shared = AdsManager()

    /// Ödüllü reklam birimi. Yayın (Release/App Store) derlemesinde Info.plist'teki KHRewardedAdUnitID
    /// (AdMob hesabındaki gerçek kimlik) kullanılır. Xcode'dan çalıştırılan Debug derlemesinde ise her zaman
    /// Google'ın resmi test kimliği kullanılır: geliştirirken kendi gerçek reklamlarımıza tıklamak
    /// AdMob kurallarına aykırıdır ve hesabın kapatılmasına yol açabilir.
    private static let testUnitID = "ca-app-pub-3940256099942544/1712485313"
    private let unitID: String = {
        #if DEBUG
        return AdsManager.testUnitID
        #else
        return (Bundle.main.object(forInfoDictionaryKey: "KHRewardedAdUnitID") as? String)
            .flatMap { $0.isEmpty ? nil : $0 } ?? AdsManager.testUnitID
        #endif
    }()

    private var prepared = false
    private var started = false
    private var ad: RewardedAd?
    private var loading = false
    private var earned = false
    private var current: ((String) -> Void)?
    private var waiting: ((String) -> Void)?

    /// Oyun başlayınca bir kez: onay ve izin sorulur, SDK başlar. status(gizlilik seçenekleri gerekli mi)
    func prepare(status: @escaping (Bool) -> Void) {
        guard !prepared else { status(privacyRequired); return }
        prepared = true
        let params = RequestParameters()
        ConsentInformation.shared.requestConsentInfoUpdate(with: params) { [weak self] _ in
            DispatchQueue.main.async {
                ConsentForm.loadAndPresentIfRequired(from: Self.topVC()) { _ in
                    DispatchQueue.main.async {
                        self?.afterConsent()
                        status(self?.privacyRequired ?? false)
                    }
                }
            }
        }
    }

    private var privacyRequired: Bool { ConsentInformation.shared.privacyOptionsRequirementStatus == .required }

    private func afterConsent() {
        guard ConsentInformation.shared.canRequestAds else { return }
        // Apple izleme izni: onay penceresi kapandıktan kısa süre sonra, uygulama öndeyken sorulur.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
            if #available(iOS 14, *), ATTrackingManager.trackingAuthorizationStatus == .notDetermined {
                ATTrackingManager.requestTrackingAuthorization { _ in DispatchQueue.main.async { self?.startSDK() } }
            } else {
                self?.startSDK()
            }
        }
    }

    private func startSDK() {
        guard !started else { return }
        started = true
        MobileAds.shared.start { [weak self] _ in DispatchQueue.main.async { self?.load() } }
    }

    private func load() {
        guard started, !loading, ad == nil else { return }
        loading = true
        RewardedAd.load(with: unitID, request: Request()) { [weak self] rewarded, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.loading = false
                if let error { NSLog("[KibarHirsiz] reklam yüklenemedi: %@", error.localizedDescription) }
                self.ad = rewarded
                self.ad?.fullScreenContentDelegate = self
                if let w = self.waiting { self.waiting = nil; self.present(done: w) }
            }
        }
    }

    /// done: "ok" (ödül kazanıldı), "skip" (yarıda kapatıldı), "noad" (şu an reklam yok)
    func show(done: @escaping (String) -> Void) {
        if !ConsentInformation.shared.canRequestAds && prepared { done("noad"); return }
        if ad != nil { present(done: done); return }
        // Reklam henüz hazır değilse birkaç saniye bekle
        waiting = done
        if !started { startSDK() } else { load() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
            if let w = self?.waiting { self?.waiting = nil; w("noad") }
        }
    }

    private func present(done: @escaping (String) -> Void) {
        guard let ad else { done("noad"); return }
        earned = false
        current = done
        ad.present(from: Self.topVC()) { [weak self] in self?.earned = true }
    }

    /// Avrupa'daki oyuncular onay tercihlerini ayarlardan değiştirebilsin
    func showPrivacyOptions() {
        ConsentForm.presentPrivacyOptionsForm(from: Self.topVC()) { _ in }
    }

    // MARK: FullScreenContentDelegate
    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) { finish(earned ? "ok" : "skip") }
    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        NSLog("[KibarHirsiz] reklam gösterilemedi: %@", error.localizedDescription)
        finish("noad")
    }
    private func finish(_ result: String) {
        let c = current; current = nil; ad = nil
        c?(result)
        load() // bir sonrakini hazırla
    }

    static func topVC() -> UIViewController? {
        let root = UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first?.rootViewController
        var top = root
        while let p = top?.presentedViewController { top = p }
        return top
    }
}
