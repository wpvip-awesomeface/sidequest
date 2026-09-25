# Contributing

Start with the README and use a separate development save. Keep changes small and include reproduction steps, the intended behavior, and relevant validation in a pull request.

```sh
npm test
SIDEQUEST_DATA_DIR="$PWD/.sidequest-dev" PORT=47832 npm start
```

There are no npm dependencies. Keep `package-lock.json` in source control. If dependencies become necessary, use ordinary npm/pnpm commands and honor any supply-chain controls on your machine; never bypass them.

## Architecture

- `server.mjs`: loopback HTTP server, single-writer save lock, request authentication, integrations, story queue.
- `engine.mjs`: game state, actions, rewards, migrations, and day changes.
- `campaign.mjs`, `lore.mjs`, `squad.mjs`: chapters, character depth, party and support systems.
- `calendar.mjs`, `google-calendar.mjs`: calendar projection, automatic quests, direct Google OAuth/API.
- `credentials.mjs`: Keychain-helper transport and non-secret connection markers.
- `public/`: dependency-free browser UI, canvas pixel art, maps, and settings.
- `native/`: Swift macOS shell, EventKit bridge, Keychain helper, icon/build/package scripts.
- `test/`: Node test-runner coverage using isolated saves and mocked integrations.

Run `npm test` for logic/integration changes. For UI changes, verify the affected flow in a browser using a disposable save. For native changes, build on Apple Silicon and verify the relevant desktop behavior. Do not substitute mock tests for a claim of live provider/account compatibility.

Do not commit personal saves, OAuth downloads, API tokens, real task exports, screenshots containing private work, or built app/DMG files. Keep runtime credentials in Keychain and API responses free of tokens. Preserve the lockfile, single-writer guard, loopback binding, and mutation authentication.

Contributions are provided under the project’s [MIT License](LICENSE).
