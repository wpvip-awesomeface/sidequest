import Cocoa
import WebKit
import UniformTypeIdentifiers

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    let calendarBridge = CalendarBridge()
    var window: NSWindow!
    var webView: WKWebView!
    var process: Process?
    var serverPort: Int?
    var pendingOutput = ""
    var didLoad = false
    var connecting = false
    var pendingDraft: String?
    var restarting = false
    var restartAfterExit = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let appItem = NSMenuItem()
        menu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Sidequest", action: #selector(showAbout), keyEquivalent: "")
        appMenu.addItem(withTitle: "Reload Sidequest", action: #selector(reloadApp), keyEquivalent: "r")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Quit Sidequest", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        let editItem = NSMenuItem(title: "Edit", action: nil, keyEquivalent: "")
        let edit = NSMenu(title: "Edit")
        for (title, selector, key) in [("Undo", "undo:", "z"), ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] {
            edit.addItem(withTitle: title, action: Selector(selector), keyEquivalent: key)
        }
        editItem.submenu = edit
        menu.addItem(editItem)
        NSApp.mainMenu = menu
        if let path = Bundle.main.path(forResource: "Sidequest", ofType: "icns") { NSApp.applicationIconImage = NSImage(contentsOfFile: path) }
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1210, height: 920), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Sidequest"
        window.minSize = NSSize(width: 720, height: 620)
        window.backgroundColor = NSColor(calibratedRed: 0.075, green: 0.106, blue: 0.102, alpha: 1)
        window.appearance = NSAppearance(named: .darkAqua)
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "sidequestReload")
        calendarBridge.allowedPort = { [weak self] in self?.serverPort }
        config.userContentController.addScriptMessageHandler(calendarBridge, contentWorld: .page, name: "sidequestCalendar")
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.setValue(false, forKey: "drawsBackground")
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        connectOrLaunch()
    }

    @objc func reloadApp() {
        guard !restarting else { return }
        restarting = true
        webView.evaluateJavaScript("window.sidequestPrepareReload ? window.sidequestPrepareReload() : null") { [weak self] value, _ in
            guard let self = self else { return }
            if let draft = value as? String { self.pendingDraft = draft }
            if let task = self.process, task.isRunning {
                self.restartAfterExit = true
                task.terminate()
            } else { self.connectOrLaunch() }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "sidequestReload", message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.host == "127.0.0.1",
              message.frameInfo.request.url?.port == serverPort else { return }
        reloadApp()
    }

    func loadServer(_ port: Int) {
        connecting = false
        serverPort = port
        didLoad = true
        if let draft = pendingDraft,
           let data = try? JSONSerialization.data(withJSONObject: [draft]),
           let literal = String(data: data, encoding: .utf8) {
            let source = "try { sessionStorage.setItem('sidequest.setupDraft.v1', (\(literal))[0]); } catch (_) {}"
            webView.configuration.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        webView.load(URLRequest(url: URL(string: "http://127.0.0.1:\(port)")!, cachePolicy: .reloadIgnoringLocalCacheData))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        restarting = false
        if webView.url?.host == "127.0.0.1" {
            pendingDraft = nil
            webView.configuration.userContentController.removeAllUserScripts()
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        fail("The local campfire is temporarily out. Reconnect here to pick up where you left off.")
    }

    func connectOrLaunch() {
        guard !connecting else { restarting = false; return }
        connecting = true
        let directory = ProcessInfo.processInfo.environment["SIDEQUEST_DATA_DIR"] ?? NSHomeDirectory() + "/Library/Application Support/Sidequest"
        guard let data = FileManager.default.contents(atPath: directory + "/server.json"),
              let info = try? JSONSerialization.jsonObject(with: data) as? [String: Int],
              let port = info["port"], let pid = info["pid"],
              let url = URL(string: "http://127.0.0.1:\(port)/api/health") else { launchServer(); return }
        var request = URLRequest(url: url)
        request.timeoutInterval = 2
        URLSession.shared.dataTask(with: request) { [weak self] data, _, _ in
            var valid = false
            if let data = data, let response = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                valid = response["app"] as? String == "sidequest" && response["pid"] as? Int == pid
            }
            let ready = valid
            DispatchQueue.main.async {
                guard let self = self else { return }
                if ready {
                    self.loadServer(port)
                } else { self.launchServer() }
            }
        }.resume()
    }

    func launchServer() {
        pendingOutput = ""
        didLoad = false
        guard let resources = Bundle.main.resourcePath else { return }
        let node = resources + "/runtime/node"
        guard FileManager.default.isExecutableFile(atPath: node) else {
            fail("Sidequest’s bundled runtime is missing. Please download a fresh copy of Sidequest.")
            return
        }
        let task = Process()
        task.executableURL = URL(fileURLWithPath: node)
        task.arguments = [resources + "/app/server.mjs"]
        var env = ProcessInfo.processInfo.environment
        env["PORT"] = "0"
        env.removeValue(forKey: "NODE_OPTIONS")
        env.removeValue(forKey: "NODE_PATH")
        task.environment = env
        let pipe = Pipe()
        task.standardOutput = pipe
        let errors = Pipe()
        task.standardError = errors
        errors.fileHandleForReading.readabilityHandler = { handle in _ = handle.availableData }
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let output = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.pendingOutput += output
                if self.pendingOutput.hasSuffix("\n"), !self.didLoad, let range = self.pendingOutput.range(of: "http://127.0.0.1:"), let line = self.pendingOutput[range.lowerBound...].split(separator: "\n").first, let url = URL(string: String(line)), let port = url.port {
                    self.loadServer(port)
                }
            }
        }
        task.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async {
                guard let self = self, NSApp.isRunning, self.process === task else { return }
                self.process = nil
                self.connecting = false
                if self.restartAfterExit {
                    self.restartAfterExit = false
                    self.connectOrLaunch()
                } else { self.fail("The local server stopped. Reconnect to continue your adventure.") }
            }
        }
        process = task
        do {
            try task.run()
            DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self, weak task] in
                guard let self = self, let task = task, self.process === task, !self.didLoad else { return }
                task.terminate()
                self.fail("Starting took too long. Reconnect to try again.")
            }
        } catch { fail("Could not start Sidequest: \(error.localizedDescription)") }
    }
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        guard frame.isMainFrame, frame.securityOrigin.protocol == "http", frame.securityOrigin.host == "127.0.0.1", frame.securityOrigin.port == serverPort else { completionHandler(nil); return }
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.json]
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.beginSheetModal(for: window) { result in completionHandler(result == .OK ? panel.urls : nil) }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "sidequest" && url.host == "reload" { decisionHandler(.cancel); reloadApp(); return }
        if url.host == "127.0.0.1" && url.port == serverPort { decisionHandler(.allow) }
        else {
            if navigationAction.navigationType == .linkActivated && url.scheme == "https" && ["lmstudio.ai", "ollama.com", "linear.app", "accounts.google.com", "console.cloud.google.com", "developers.google.com"].contains(url.host ?? "") {
                if url.host == "linear.app", let browser = NSWorkspace.shared.urlForApplication(toOpen: URL(string: "https://example.com")!) {
                    // Open the web issue in the user's browser, even if Linear's desktop app is installed.
                    NSWorkspace.shared.open([url], withApplicationAt: browser, configuration: NSWorkspace.OpenConfiguration())
                } else { NSWorkspace.shared.open(url) }
            }
            decisionHandler(.cancel)
        }
    }
    func fail(_ message: String) {
        connecting = false
        restarting = false
        let text = message.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
        webView.loadHTMLString("""
        <html><body style="background:#131b1a;color:#eee7cc;font:16px -apple-system;padding:60px;line-height:1.8">
        <h2>The campfire needs a moment.</h2><p>\(text)</p>
        <a style="color:#bcce8c" href="sidequest://reload">↻ Reconnect Sidequest</a>
        <p style="color:#a0aca0;font-size:12px">Your last save is safe. You can also press ⌘R.</p>
        </body></html>
        """, baseURL: nil)
    }
    @objc func showAbout() {
        let alert = NSAlert()
        alert.messageText = "Sidequest"
        alert.informativeText = "Small steps. Great adventures.\nVersion 0.1 — local prototype\n\nYour game is saved in ~/Library/Application Support/Sidequest/save.json"
        alert.runModal()
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { process?.terminationHandler = nil; process?.terminate() }
}
@main
struct SidequestMain {
    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.regular)
        let delegate = AppDelegate()
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
