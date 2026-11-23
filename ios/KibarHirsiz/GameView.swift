import SwiftUI
import WebKit
import UserNotifications
import GameKit
import StoreKit

/// Oyunu uygulamanın içindeki "Web" klasöründen, internet gerekmeden açar.
struct GameView: UIViewRepresentable {
    @Binding var loaded: Bool

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.websiteDataStore = .default() // kayıtlar (localStorage) kalıcı olsun
        config.mediaTypesRequiringUserActionForPlayback = [] // ilk dokunuştan sonra sesler gecikmesiz çalsın

        // Oyundaki JavaScript hatalarını Xcode konsoluna yaz.
        config.userContentController.add(context.coordinator, name: "log")
        config.userContentController.add(context.coordinator, name: "ready")
        config.userContentController.add(context.coordinator, name: "notify")
        config.userContentController.add(context.coordinator, name: "haptic")
        config.userContentController.add(context.coordinator, name: "gc")
        config.userContentController.add(context.coordinator, name: "ads")
        config.userContentController.add(context.coordinator, name: "review")
        config.userContentController.add(context.coordinator, name: "cloud")
        config.userContentController.addUserScript(WKUserScript(source: """
            window.addEventListener('error', e => webkit.messageHandlers.log.postMessage('JS hata: ' + e.message + ' @ ' + e.filename + ':' + e.lineno));
            window.addEventListener('unhandledrejection', e => webkit.messageHandlers.log.postMessage('JS hata: ' + e.reason));
            """, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        context.coordinator.web = web
        web.navigationDelegate = context.coordinator
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        let bg = UIColor(named: "LaunchBg") ?? .black
        web.isOpaque = false
        web.backgroundColor = bg
        web.scrollView.backgroundColor = bg
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.scrollView.isScrollEnabled = false // sayfanın kendisi kaymasın; listeler yine kayar
        web.allowsLinkPreview = false

        web.load(URLRequest(url: URL(string: "\(BundleSchemeHandler.scheme)://app/index.html")!))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(loaded: $loaded) }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let loaded: Binding<Bool>
        weak var web: WKWebView?
        init(loaded: Binding<Bool>) { self.loaded = loaded }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.name {
            case "ready": loaded.wrappedValue = true; return // açılış ekranı çizildi
            case "haptic": Haptics.play(message.body as? String ?? "light"); return
            case "ads":
                guard let m = message.body as? [String: Any] else { return }
                let js: (String) -> Void = { [weak self] code in self?.web?.evaluateJavaScript(code) }
                switch m["op"] as? String {
                case "init":
                    AdsManager.shared.prepare { needsPrivacy in js("window.Ads && Ads._privacy(\(needsPrivacy))") }
                case "privacy":
                    AdsManager.shared.showPrivacyOptions()
                default:
                    let id = m["id"] as? Int ?? 0
                    AdsManager.shared.show { result in js("window.Ads && Ads._done(\(id), '\(result)')") }
                }
                return
            case "review":
                // Apple'ın puan penceresi (Apple yılda en çok 3 kez gösterir, ne zaman göstereceğine kendisi karar verir)
                if let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene })
                    .first(where: { $0.activationState == .foregroundActive }) {
                    AppStore.requestReview(in: scene)
                }
                return
            case "cloud":
                guard let m = message.body as? [String: Any] else { return }
                switch m["op"] as? String {
                case "save":
                    if let data = m["data"] as? String { CloudSave.shared.save(data) }
                case "get":
                    CloudSave.shared.start { [weak self] raw in self?.sendCloud(raw) }
                default: break
                }
                return
            case "gc":
                if let m = message.body as? [String: Any] {
                    GameCenter.shared.handle(m) { [weak self] ok, alias in
                        let name = alias.replacingOccurrences(of: "'", with: "\\'")
                        self?.web?.evaluateJavaScript("window.GC && GC._status(\(ok), '\(name)')")
                    }
                }
                return
            case "notify":
                if let m = message.body as? [String: Any] {
                    Notifier.shared.handle(m) { [weak self] status in
                        self?.web?.evaluateJavaScript("window.Notify && Notify._status('\(status)')")
                    }
                }
                return
            default: break
            }
            NSLog("[KibarHirsiz] %@", String(describing: message.body))
        }
        /// iCloud'daki kaydı oyuna güvenli biçimde (JSON metni olarak) iletir.
        func sendCloud(_ raw: String?) {
            var arg = "null"
            if let raw, let d = try? JSONSerialization.data(withJSONObject: [raw]), let s = String(data: d, encoding: .utf8) {
                arg = s + "[0]"
            }
            web?.evaluateJavaScript("window.Cloud && Cloud._got(\(arg))")
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            NSLog("[KibarHirsiz] sayfa yüklendi: %@", webView.url?.absoluteString ?? "-")
            // Sayfa çizim sinyali gelmezse amblemi yine de birkaç saniye sonra kaldır.
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [loaded] in loaded.wrappedValue = true }
            #if DEBUG
            let probe = "JSON.stringify({w: innerWidth, h: innerHeight, g: document.querySelector('.game')?.getBoundingClientRect(), cls: document.querySelector('.game')?.className, ui: document.getElementById('ui')?.children.length, game: typeof window.Game, seen: window.Game && Game.s.seen, robs: window.Game && Game.s.stats.robs, modal: !!document.querySelector('.modal')})"
            webView.evaluateJavaScript(probe) { r, e in NSLog("[KibarHirsiz] durum: %@", String(describing: r ?? e)) }
            #endif
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            NSLog("[KibarHirsiz] sayfa açılamadı: %@", error.localizedDescription)
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            NSLog("[KibarHirsiz] sayfa hatası: %@", error.localizedDescription)
        }
    }
}

/// kibarhirsiz://app/... isteklerini uygulama paketindeki Web klasöründen yanıtlar.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "kibarhirsiz"
    private let root = Bundle.main.resourceURL!.appendingPathComponent("Web").standardizedFileURL

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL

        guard file.path.hasPrefix(root.path), let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let headers = [
            "Content-Type": Self.mime(file.pathExtension),
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ]
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        default: return "application/octet-stream"
        }
    }
}

/// Oyundaki olaylara göre telefonun titreşim motorunu çalıştırır.
enum Haptics {
    static func play(_ kind: String) {
        switch kind {
        case "selection": UISelectionFeedbackGenerator().selectionChanged()
        case "success": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "warning": UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case "error": UINotificationFeedbackGenerator().notificationOccurred(.error)
        case "medium": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "heavy": UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case "rigid": UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        case "soft": UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        default: UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}

/// Soygun bitince ya da soygunda bir olay çıkınca, oyuncu uygulamada değilse yerel bildirim gösterir.
/// İnternet ya da sunucu gerekmez; bildirim telefonda planlanır.
final class Notifier: NSObject, UNUserNotificationCenterDelegate {
    static let shared = Notifier()
    private let center = UNUserNotificationCenter.current()

    /// Uygulama açıldığında çağrılır: ön planda bildirim gösterme, eski bildirimleri temizle.
    func activate() {
        center.delegate = self
        NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.center.removeAllDeliveredNotifications()
        }
    }

    /// JS'ten gelen istek: {op: "set", id, at (ms), title, body} ya da {op: "clear", id} / {op: "status"}
    func handle(_ m: [String: Any], status: @escaping (String) -> Void) {
        let op = m["op"] as? String ?? ""
        let id = m["id"] as? String ?? "heist"
        if op == "clear" { center.removePendingNotificationRequests(withIdentifiers: [id]); return }
        if op == "status" {
            center.getNotificationSettings { s in DispatchQueue.main.async { status(Self.name(s.authorizationStatus)) } }
            return
        }
        guard op == "set", let at = m["at"] as? Double else { return }
        let title = m["title"] as? String ?? "", body = m["body"] as? String ?? ""
        // İzin ilk kez burada istenir (ilk soygun başlayınca); sonraki çağrılarda soru tekrar çıkmaz.
        center.requestAuthorization(options: [.alert, .sound]) { [weak self] granted, _ in
            guard let self else { return }
            DispatchQueue.main.async { status(granted ? "granted" : "denied") }
            guard granted else { return }
            let c = UNMutableNotificationContent()
            c.title = title; c.body = body; c.sound = .default
            let secs = max(1, at / 1000 - Date().timeIntervalSince1970)
            let req = UNNotificationRequest(identifier: id, content: c,
                                            trigger: UNTimeIntervalNotificationTrigger(timeInterval: secs, repeats: false))
            self.center.removePendingNotificationRequests(withIdentifiers: [id])
            self.center.add(req)
        }
    }

    private static func name(_ s: UNAuthorizationStatus) -> String {
        switch s {
        case .authorized, .provisional, .ephemeral: return "granted"
        case .denied: return "denied"
        default: return "unknown"
        }
    }

    // Oyuncu zaten oyundaysa bildirim kutusu çıkmasın; oyun kendi sesini ve ekranını gösterir.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler done: @escaping (UNNotificationPresentationOptions) -> Void) {
        done([])
    }
}

/// iCloud yedeği: oyun kaydı iCloud anahtar-değer deposunda tutulur (oyuncunun kendi iCloud hesabı,
/// sunucu yok). Uygulama silinip yeniden kurulduğunda ya da yeni telefonda ilerleme geri gelir.
final class CloudSave {
    static let shared = CloudSave()
    private let store = NSUbiquitousKeyValueStore.default
    private let key = "kh_save_1920"
    private var onChange: ((String?) -> Void)?

    /// Açılışta bir kez: iCloud'dan son kaydı al ve başka cihazdan gelen değişiklikleri dinle.
    func start(_ send: @escaping (String?) -> Void) {
        if onChange == nil {
            NotificationCenter.default.addObserver(forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
                                                   object: store, queue: .main) { [weak self] _ in
                guard let self else { return }
                self.onChange?(self.store.string(forKey: self.key))
            }
        }
        onChange = send
        store.synchronize()
        send(store.string(forKey: key))
    }

    func save(_ data: String) {
        guard data.utf8.count < 900_000 else { NSLog("[KibarHirsiz] kayıt iCloud için çok büyük"); return }
        store.set(data, forKey: key)
        store.set(Date().timeIntervalSince1970, forKey: key + "_t")
        store.synchronize()
    }
}

/// Game Center: giriş, başarımlar ve sıralamalar. Giriş yapılamazsa (ör. Game Center kapalı ya da
/// uygulama App Store Connect'te tanımlı değil) oyun sessizce Game Center'sız devam eder.
final class GameCenter {
    static let shared = GameCenter()
    private var started = false

    func handle(_ m: [String: Any], status: @escaping (Bool, String) -> Void) {
        switch m["op"] as? String ?? "" {
        case "auth": authenticate(status)
        case "ach":
            guard GKLocalPlayer.local.isAuthenticated, let id = m["id"] as? String else { return }
            let a = GKAchievement(identifier: id)
            a.percentComplete = 100
            a.showsCompletionBanner = false // oyun kendi bildirimini gösteriyor
            GKAchievement.report([a]) { e in if let e { NSLog("[KibarHirsiz] başarım gönderilemedi %@: %@", id, e.localizedDescription) } }
        case "score":
            guard GKLocalPlayer.local.isAuthenticated, let id = m["id"] as? String, let v = m["value"] as? Int else { return }
            GKLeaderboard.submitScore(v, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { e in
                if let e { NSLog("[KibarHirsiz] skor gönderilemedi %@: %@", id, e.localizedDescription) }
            }
        case "show":
            guard GKLocalPlayer.local.isAuthenticated else { return }
            GKAccessPoint.shared.trigger(state: .achievements) {}
        default: break
        }
    }

    private func authenticate(_ status: @escaping (Bool, String) -> Void) {
        if started { status(GKLocalPlayer.local.isAuthenticated, GKLocalPlayer.local.alias); return }
        started = true
        GKLocalPlayer.local.authenticateHandler = { vc, error in
            if let vc {
                // Game Center giriş ekranını göster
                let root = UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first?.rootViewController
                var top = root
                while let p = top?.presentedViewController { top = p }
                top?.present(vc, animated: true)
                return
            }
            if let error { NSLog("[KibarHirsiz] Game Center: %@", error.localizedDescription) }
            let me = GKLocalPlayer.local
            DispatchQueue.main.async { status(me.isAuthenticated, me.isAuthenticated ? me.alias : "") }
        }
    }
}
