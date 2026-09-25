# Sidequest

A local-first, pixel-art productivity RPG for macOS. Turn a task into a short encounter, focus on the real work, and come back for a small victory. Rest is part of the game.

## Open the app

Open `dist/Sidequest.app` in Finder. The native build bundles your installed Node.js runtime and its license notices; recipients do not need Node.js. The native shell uses AppKit and WKWebView, not Electron. No npm dependencies or package installations are required.

To rebuild after editing:

```sh
npm run build:mac
```

For browser development:

```sh
npm start
# http://127.0.0.1:47831
```

The desktop app can attach to an already-running browser development server. Start the browser server first if you want both views. A single-writer lock prevents competing servers from overwriting your game. When attached to a development server, quitting the app leaves that server running; stop it in the terminal when finished.

## Reload and reconnect

Use the **↻ Reload app** button in the header or setup footer. In the desktop app, **Sidequest → Reload Sidequest** (⌘R) reconnects to the running local server or starts it again if necessary, without closing the window.

Onboarding drafts (name, appearance, story, world, model selection, and current step) survive reloads in window-scoped session storage. Server tokens and Linear keys are not included. The native reload bridge also carries the draft across a changed local server port. Closing the setup dialog normally discards its draft; saving commits it to the shared game.

Expired sessions refresh automatically. Only requests explicitly rejected for an expired session are retried; ambiguous network failures never replay a task completion. A new server build shows a **Reload app** notice. An offline server shows **Reconnect** instead of instructions to quit. Optional local-model tokens remain session-only. Linear connections are restored from macOS Keychain.

The `.app` includes a complete macOS icon set and explicitly sets its Dock icon, with a matching browser favicon. The icon is generated locally by `native/build-icon.sh` from code-drawn pixel art.

An already-running older native executable needs one relaunch to pick up new native menu/bridge code. Once this version is running, frontend reloads and local-server reconnects use the controls above.

## Your adventurer and first-run setup

First run opens a three-step onboarding flow: **Your adventurer → Your story → Connections**. Choose a name, one of ten pixel hairstyles, and hair, shirt, pants, and skin colors with a live preview. Add an optional backstory and customize the world prompt. Both are included in generated encounters; offline stories echo your name and the start of your backstory.

Existing saves retain quests, XP, inventory, and preferences, and are offered onboarding once. Reopen **World** to edit everything later. Cloaks and crowns layer over your base appearance.

## The loop

1. Add a personal quest, or rename/archive the three clearly labeled example quests.
2. Choose its priority, focus duration, and whether it is a daily rival. Save a useful first step as battle intel.
3. Start a battle. The timer measures your focus; finishing is your decision, not an automatic timer event.
4. Complete the real task, then click **Quest complete**. Earn randomized XP and gold; occasionally discover equipment or tea. Equip items from Gear to change your avatar.
5. Unlock Scout’s Sight at level 2. It reveals your saved intel, or a practical small-step suggestion.
6. Retreat, pause, or reroll your story freely. A restoration tea restores energy and pauses the timer for a suggested five-minute break; you choose when to resume.

Daily rivals return on the next local calendar day with their identity, encounter count, and victories intact. Work hours and weekends determine when the adventurer rests. Off-hours pause an active battle, and a new day restores energy. There are no lost streaks, missed-day penalties, or escalating backlogs of recurring tasks.

## A growing adventure

The chronicle stays visible above the encounter and records travel, approaches, choices, focus interludes, victories, and chapter endings. Local narration uses your backstory, world, recent events, relationships, mission, and upcoming work. It runs in the background; built-in text remains playable if the model is unavailable. Generated prose cannot award items or change progress.

The atlas starts with three destinations. A new place appears on each day you return; completed chapters reveal more. Eight biomes have distinct pixel scenery and twelve foe types. Travel between encounters, then fight, outsmart, or try friendship. Familiar rivals retain their identity, can become friends and allies, and allies can appear beside you. Combat loops include attacks and counterattacks while you focus; they do not drain health on a timer. Pause and reduced-motion settings stop the combat motion.

Missions take six to eight completed tasks. Each has a mid-chapter choice, a twist, and a conclusion followed by three paths: rescue, mystery, expedition. The local model writes concise new titles and hooks using your work and history. Built-in paths are immediately available while it writes.

Eleven pieces of collectible equipment are available. Uncommon rolls begin at 8 lifetime victories (8% chance), rare at 25 (3%), epic at 60 (1%). Each eligible tier rolls independently, highest first, with at most one drop. A find starts a 5/8/15-victory cooldown for the respective tier; 30 eligible misses guarantee the lowest available tier. Existing items are preserved, and duplicate equipment never drops. Tea can occasionally drop or be bought for 30 gold.

## Your squad and treehouse

Support is available immediately through a traveling guide: **Sit with me**, **Help me refocus**, and optional focus check-ins every 10–60 minutes. Your personal energy check-in is separate from hero energy and resets each new day. It never changes rewards. Check-ins stay inside the open, visible app, pause during breaks and rest, and can be snoozed or turned off. Refocus offers one next step using the equipped pet’s personality and support style, task, and intel; local-model failures keep the built-in suggestion.

The first completed chapter brings your first pet. Choose fox, cat, bird, or frog; customize name, coat, accent, personality, and warm / quiet / playful / direct support. Further pets have a 20% chapter chance after at least two chapters since the last arrival, with a guaranteed arrival after five. Every third chapter brings another adventurer. Friends and allies you meet also appear at home. Nothing needs feeding or upkeep.

The active adventurer and equipped pet receive full completion XP. Idle pets, other adventurers, and friends receive 20%, rounded down (minimum one). Switch mission partners between encounters. Adventurers keep separate names, appearance, backstory, XP, and equipped gear; edit the current leader through World. Gold, inventory, tasks, and campaign progress are shared. Pets learn sitting at level 1, a spin at 2, a leap at 4, and stars at 7. Tricks are cosmetic and do not earn XP.

Every completed chapter creates one unique collectible in the loot pool, with a chapter story, name, rarity, and wearable color. It still needs to drop under the ordinary rarity gates. Every chapter also places a keepsake in the treehouse. The squad portrait keeps the active adventurer and pet large against open space. **Visit home** opens a separate pixel-art treehouse interior with forest windows, timber walls, a living trunk, and plank floors. Its furnishing menu lets you buy and place items, select one of three color styles, or put owned items in storage and restore them for free. Existing purchases stay owned. Gold buys seven permanent visible upgrades (40–500 gold): a reading nook, lanterns, garden, companion corner, library, observatory, and keepsake gallery.

## Linear

Click **Connect Linear** and supply a personal API key from Linear Settings → Security & access. Read-only access is sufficient. The key is saved in macOS Keychain after a successful connection and restored after quitting or reloading. Disconnect removes it. Each save directory has its own credential; no key is written to the game save or onboarding draft. If Keychain access fails, the connection stays session-only and the settings show a warning. Developers can alternatively provide `LINEAR_API_KEY` in the server environment.

Manual sync imports all assigned, open issues with pagination. Quests sort by priority, then Linear `sortOrder` within each priority. A local priority override survives later syncs. Imported issues are deduplicated by issue ID.

**This is an import-only integration.** Local completion does not close a Linear issue. Issues that disappear from the remote open-assigned list are not automatically removed locally; complete or archive them. No credentials were provided during development, so live account sync has not been verified.

API reference: [Linear GraphQL](https://linear.app/developers/graphql) and [filtering](https://linear.app/developers/filtering).

## Optional local stories

Open **World → Connections**. Sidequest detects local servers and lists their models:

- **Ollama:** default port 11434, native model list and generation.
- **LM Studio:** default port 1234, native model list (chat models only), with a compatibility fallback for older versions; chat-completions generation.
- **Other local server:** default port 8080, OpenAI-compatible model list and chat completions.

Detection reports ready, no models, authentication required, or offline, and recognizes LM Studio / Ollama app bundles in the usual macOS Applications folders. It preselects a detected provider and available model when no prior selection exists. It does not launch apps or scan the network. A different local port and optional session-only API token can be entered in the advanced section.

Use **Preview my story** to verify the selected model using the latest unsaved name, backstory, and world in onboarding, then enable model stories and save. The preview does not save settings or change the game. Editing its inputs invalidates the preview, and late responses from older drafts are discarded. Real encounters include the adventurer’s name, backstory, world, and current task details. Generation happens in the background with a 45-second timeout and offline fallback. Controls remain usable.

The same tab includes an LM Studio setup guide: download the app, select and load a small chat/instruct model that fits the Mac, start the Developer server, and return to detect/test it. Downloads and installation are handled by the user in LM Studio. No model is downloaded by Sidequest.

Use local models to keep inference on this Mac. Ollama / LM Studio can themselves provide remote models; Sidequest does not control their inference configuration. Known Ollama cloud models are labeled in the chooser.

Official references: [LM Studio getting started](https://lmstudio.ai/docs/app/basics), [local server](https://lmstudio.ai/docs/developer/core/server), [model listing](https://lmstudio.ai/docs/developer/rest/list), [chat completions](https://lmstudio.ai/docs/developer/openai-compat/chat-completions), and [Ollama generate](https://docs.ollama.com/api/generate).

Offline stories use short templates. The world prompt shapes model narration; map travel chooses from eight code-drawn biomes. It does not generate new artwork.

## Multiple windows

The Codex browser preview and desktop app normally attach to **one local server and one save**. They are two views of the same game, not independent profiles. The server lock prevents simultaneous writers to the save file. The desktop app discovers the existing server before launching its own.

Each open settings dialog has its own unsaved draft. Settings saves include the profile revision they were opened from. If another window saves first, the stale save is rejected; the dialog keeps its draft and offers **Load latest saved settings**. This avoids silent last-save-wins overwrites. Outside dialogs, windows pick up shared state changes every five seconds. For a truly separate test game, start a server with a distinct `SIDEQUEST_DATA_DIR`.

## Saves and privacy

Game state is saved atomically to:

```text
~/Library/Application Support/Sidequest/save.json
```

Back up that file with the app closed. `SIDEQUEST_DATA_DIR` can select a separate directory for testing. Saves include imported task titles and descriptions, so treat them as work data. Files use owner-only permissions. The server binds only to loopback, checks the host header, and requires a per-process token for API mutations. The desktop wrapper allows navigation only to its own local server.

No telemetry, hosted database, or account signup. Outbound integrations include user-triggered Linear sync and direct Google sign-in/calendar sync when connected. Provider detection and optional story requests go only to configured loopback ports.

## Validation

```sh
npm test
```

Tests cover reward idempotency, recurring tasks, rest boundaries, focus pause accounting, equipment ownership, spell unlocks, priority overrides, input validation, HTTP mutation tokens, and save persistence across process restarts. The browser loop was also checked manually with a separate save.

## Prototype limits

- Apple Silicon / macOS 14+ build, ad-hoc signed and not notarized. Bundled Node.js makes the packaged app self-contained; Intel Macs are not supported.
- Eleven starter equipment pieces, chapter-created collectibles, a tea stall, and seven treehouse upgrades. Combat animation illustrates focus; encounters resolve when the real task is completed. Spirit is currently a progression counter.
- One XP-unlocked spell and two always-available actions. No skill tree or shop yet.
- Daily recurrence only; no weekly/custom schedules or recurring-task deletion UI.
- Eight biome scenes are code-drawn pixel art with reduced-motion support. No external asset downloads.
- Linear sync needs your own API key. Provider protocol handling is covered with mock tests; use Test storyteller to verify a real local model.

A useful next iteration is to tune the feel with a week of real tasks before adding more systems: reward timing, richer spells, a tiny menu-bar companion, and a proper portable release.

### Character depth and the illustrated atlas
Optional campfire questions appear after the first quest and then three wins after an answer or snooze. Explore the 24 character themes anytime under Squad; skip questions, edit answers, or clear a memory to forget it. Each adventurer keeps a separate notebook. Questions revisit themes in later chapters. Narration rotates relevant details, cools down repeated motifs, and uses structured adventure events instead of treating previous generated prose as character facts. Explicit avatar constraints and output checks reject invented hero anatomy and repeated prose, retaining the built-in story when needed. Existing journal entries remain unchanged.

The parchment atlas has stable curved SVG trails, biome landmarks, current-location markers, and shadowed silhouettes for undiscovered slots. New regions receive their own charts as exploration expands.

Ask your equipped pet from Your Squad for a portrait-and-speech-bubble conversation. Reply choices request support without closing the conversation; local-model responses update in place. Pet greetings follow the chosen support style. Motion respects reduced-motion preferences, and the traveling guide remains available before the first pet unlock.

### Share the Mac beta
Run `bash native/package-mac.sh` to build `dist/Sidequest-Apple-Silicon.dmg` and its SHA-256 checksum. The disk image includes the app, an Applications shortcut, and a Start Here HTML guide. Apple Silicon / macOS 14+ only. The existing standalone Node runtime and its license notices are bundled; recipients need no developer tools. Personal saves and credentials are not packaged. The launcher uses only the bundled runtime and clears Node injection environment options.

This build is ad-hoc signed, not Developer ID signed or notarized. Recipients may need macOS’s one-time Privacy & Security → Open Anyway flow. Public frictionless distribution still requires Apple Developer ID signing and notarization. Never instruct recipients to disable Gatekeeper. The guide and onboarding recommend Qwen3 4B Instruct 2507 in LM Studio, with local server setup and built-in stories available before model installation.

### Calendar agenda
Agenda → Connect Google Calendar connects directly using Google OAuth and the Calendar API, without Mac Calendar. The first-time setup guide walks through enabling Calendar API, configuring Google Auth Platform, adding test users, creating a Desktop app OAuth client, and importing its JSON. Sign-in uses the system browser, an expiring state and PKCE, and a loopback callback. Client configuration and refresh tokens are stored in macOS Keychain; Google tokens never enter the game save or frontend. Only calendar-list and event read scopes are requested. Disconnect forgets the local tokens (the Google account permissions page can also revoke the grant). External apps in Testing may have seven-day refresh tokens; distribution requires the relevant Google publishing/verification setup. No live Google sign-in has been verified yet.

The separate **Use Mac calendars instead** option reads selected macOS Calendar sources through EventKit: Google, iCloud, Exchange, CalDAV, and subscribed calendars already configured in Mac Calendar. Add accounts in Calendar → Add Account, then open Sidequest → Agenda → Use Mac calendars instead. macOS 14 requires its “full access” permission to read events; Sidequest implements no calendar writes. This Mac Calendar route does not need OAuth client configuration.

The agenda covers today through the next 13 days, with recurring instances, time zones, and calendar subscriptions resolved by EventKit. It refreshes every 15 minutes while the desktop web view is visible (deferred during dialogs) and supports manual refresh. Cancelled and personally declined events are excluded. Only selected calendar names/account labels and event titles, times, and locations are saved locally. Notes, attachments, and attendee lists are not imported. Today’s timed events automatically become quests by default. Agenda has a toggle to disable this; all-day events stay manual. Each day brings that day’s cached meetings into the quest list, and recurring occurrences are separate quests. Imported quest titles can enter the configured local storyteller’s context. Importing grants no rewards; completing a quest grants normal rewards. Disconnect clears the cached schedule, keeping existing quests. Calendar access can be revoked in macOS Privacy & Security.

Browser previews can use direct Google sync through the local backend and view cached events. Mac Calendar permission and retrieval require the desktop app. Calendar selection uses a revision guard to reject stale syncs from another window. Syncs replace snapshots without granting rewards, and each occurrence can create at most one quest. Native code and the packaged binary compile successfully; automated tests and browser checks use fictional events, not a live authorized calendar account.
