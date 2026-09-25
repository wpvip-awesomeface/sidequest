# Building Sidequest for Mac

## Requirements

- Apple Silicon Mac (M1 or newer), macOS 14+.
- Xcode Command Line Tools: `xcode-select --install`.
- Native arm64 Node.js 22+, preferably Node 24, installed with its LICENSE file. An official Node distribution installed through nvm is supported. The build checks `process.execPath` and copies that runtime, so use a Node release you intend to distribute.
- Git to clone the source. No npm dependencies or lifecycle scripts are needed.

Check your tools:

```sh
node -p "process.version + ' ' + process.platform + ' ' + process.arch"
xcrun --find swiftc
```

Node must report `darwin arm64`. A terminal running under Rosetta may select an x64 Node installation; switch to native arm64 Node before building.

## Build and test

```sh
npm test
npm run build:mac
open dist/Sidequest.app
```

`native/build.sh` generates the icon, compiles the Swift app and Keychain helper, copies the JS frontend/backend, bundles Node and its license, and applies ad-hoc signatures. The app uses AppKit, WebKit, EventKit, and Security. All build outputs are under `dist/`, except regenerated icons in `assets/` and `public/favicon.png`.

The generated app is `dist/Sidequest.app`. No Windows, Linux desktop, Intel Mac, or universal binary build is provided.

## Package for a friend

```sh
npm run package:mac
shasum -a 256 -c dist/Sidequest-Apple-Silicon.dmg.sha256
```

The disk image contains Sidequest, an Applications shortcut, and a Start Here guide. Send the `.dmg` and checksum. The checksum file records a `dist/` path; check it from the repository root, or compare the hash directly if you moved the download.

Recipients drag the app into Applications. Built-in stories work immediately; LM Studio/Ollama and account integrations are optional. Node, developer tools, and your personal files are not required on their Mac.

## Signing and public distribution

Builds are currently **ad-hoc signed**, not Developer ID signed or notarized. This validates bundle integrity but does not establish an Apple-trusted publisher. macOS may require its explicit Privacy & Security → Open Anyway flow for a downloaded app. Do not disable Gatekeeper.

A frictionless public release needs an Apple Developer ID identity, appropriate hardened-runtime configuration, signing of the nested runtime/helper and outer app, Apple notarization, and ticket stapling. Those production steps are not automated by this repository. Do not describe the generated DMG as notarized.

## Updates and saves

Use the app’s reload button or ⌘R for frontend/server changes. After rebuilding native Swift code, quit and reopen the app once. Keychain may ask permission after the ad-hoc helper changes.

Real progress lives outside the app in `~/Library/Application Support/Sidequest/`. Moving or rebuilding the app does not reset it. Close the app before backing up `save.json`.

A development server and desktop window can share one save and backend. To use a separate test game:

```sh
SIDEQUEST_DATA_DIR="$PWD/.sidequest-dev" PORT=47832 npm start
```

Do not remove another running process’s save lock to force a second writer.

## Troubleshooting

- **Missing Swift tools:** install Xcode Command Line Tools and verify `xcrun --find swiftc`.
- **Node license missing:** use a Node distribution that includes its LICENSE file. The build refuses to package a runtime without redistribution notices.
- **Campfire loading screen:** use Reload/Reconnect. Quit and reopen if the native app was rebuilt.
- **Calendar permission:** the Mac-calendar route requires macOS Calendar access; direct Google uses browser OAuth instead.
- **No local model:** load a model and start the provider’s local server, then use World → Connections → Find local providers.
