# Sidequest on the web

A multi-player web version of Sidequest, hosted on [Spacefast](https://spacefast.com) with the Zero runtime. Live at <https://sidequest.view.fast> (private to the team for now).

It reuses the Mac app's game engine and interface. Each signed-in player gets their own save.

## What's different from the Mac app

| | Mac app | Web |
| --- | --- | --- |
| Save | Local file | Per-player rows in the Space's database, keyed by the signed-in user |
| Sign-in | None | Spacefast visitor sign-in (WordPress.com / Gravatar) |
| Linear | Personal API key in Keychain | Personal API key used **from the player's browser only**; the server stores just the imported issue list |
| Storyteller | Local Ollama / LM Studio | The player's own Ollama, LM Studio, or OpenAI-compatible server, called from their browser, **or** 101 built-in adventures |
| Calendar | Google or Mac calendars | Not available yet |

## How it fits together

- `server/index.ts`: the Zero capsule. One `api` mutation mirrors the Mac app's `/api/*` routes.
- `server/game.ts`: save loading and writing (chunked across rows), the player-time-zone clock, story results, and Linear import validation.
- `shared/`: the Mac app's engine, ported to run in the Zero runner (no Node built-ins, no browser globals).
  - `adventures.js`: 101 hand-written chapters with mad-lib `vars`.
  - `madlib.js`: the shared "world bank" of villagers, villages, landmarks, critters, trinkets, snacks, weather, and times.
- `client/vanilla/`: the Mac app's UI. `bridge.js` routes its API calls to the capsule. `local-ai.js` and `linear-browser.js` talk to the player's own model and Linear from the browser.
- `pages/index.tsx`: the sign-in gate that boots the game.

### Security notes

- Every read and write is scoped to `ctx.auth.userId`; guests are refused.
- Model and Linear credentials never reach the server. The Linear key is kept for the tab unless the player chooses "Remember on this device" (browser storage for this site); disconnect and sign-out forget it.
- Imported Linear issues are treated as untrusted: the server caps the count, trims fields, and keeps only `https://linear.app/…/issue/…` links.

## Develop

```sh
npm test      # Node 23.6+ (runs the .ts tests directly)
sf dev        # local capsule at http://127.0.0.1:4173 (sign-in is not available locally)
sf publish    # deploy to the linked Space
```

Zero compiles only `client/`, `server/`, `shared/`, and `pages/`. Other folders (except `test/`) are published as static files, so keep source material out of them.

### Writing adventures

Edit `shared/adventures.js` directly. Each entry has `title`, `hook`, `open`, six `steps`, `twist`, `end`, and optional `vars`. Lines may use `{foe}`, `{place}`, any world-bank key, or the adventure's own `vars`. `test/adventures.test.ts` checks shapes, placeholders, and length limits at the longest values.

## Known limits

- Spacefast visitor connectors aren't available to Zero handlers yet, so Linear uses personal API keys. Linear OAuth (PKCE) is the planned upgrade.
- The hosted Spacefast AI service is listed as a future capability. The server path exists but the option is hidden until it ships.
- Link previews work on Slack and X; Facebook's crawler is refused by the host.
