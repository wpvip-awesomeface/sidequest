# Security and private data

Sidequest is a local prototype, not a hardened multi-user service. Keep its server bound to loopback; do not expose it through a public tunnel or reverse proxy.

Do not post API keys, OAuth client downloads, account tokens, real saves, or private task/calendar data in issues. Report a vulnerability privately to the repository owner before sharing exploit details publicly. Use GitHub private vulnerability reporting if enabled; otherwise arrange a private channel first.

The normal save directory is outside the repository, under `~/Library/Application Support/Sidequest/`. Saves contain imported work details. Linear and Google account credentials are kept in macOS Keychain. Optional model-server tokens are session-only. `.gitignore` excludes common local saves and credential files, but it is not a secret scanner.

No telemetry is collected. Connected Google/Linear APIs receive integration requests. Your configured model server receives story context, including relevant work titles and character details. A locally addressed provider may still use remote inference depending on its own configuration.

Distributed builds bundle Node.js and must keep its notices. The current app is ad-hoc signed and not notarized. See the Mac build guide for limitations.
