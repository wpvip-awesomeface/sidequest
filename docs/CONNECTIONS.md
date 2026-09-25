# Optional connections

Sidequest works offline with built-in stories. Each integration can be set up later.

## Local storyteller

Install Ollama or LM Studio from its official site. Download and load a small chat/instruct model that fits your Mac. For LM Studio, start the Developer local server, normally port 1234. Ollama normally listens on 11434.

In World → Connections, choose Find local providers, select a provider/model, and Preview my story. Enable model stories and save. Keep the provider running. Other OpenAI-compatible loopback servers are supported under advanced settings. Model-provider tokens are currently session-only.

No models are bundled or automatically downloaded. Check your provider configuration if you need strictly local inference; a local server can itself offer remote models.

## Linear

Create a personal API key with read access in Linear’s settings. In World → Connections, connect and import your assigned open issues. Keys are saved in macOS Keychain after successful connection. Disconnect removes the saved key.

Sync is manual. Quest completion does not update Linear. Use an issue’s link to change its status or leave comments in Linear.

## Direct Google Calendar

Choose Agenda → Connect Google Calendar. This does not require Mac Calendar. For this prototype, you configure your own Google OAuth client once:

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable Google Calendar API in APIs & Services → Library.
3. Configure Google Auth Platform → Branding and Audience. For personal testing, choose External and add your Google account as a test user. Eligible Workspace-only apps can use Internal.
4. Under Data Access, add `https://www.googleapis.com/auth/calendar.calendarlist.readonly` and `https://www.googleapis.com/auth/calendar.events.readonly`.
5. Create a client with application type **Desktop app**, then download its JSON.
6. In Sidequest’s Google setup dialog, select that JSON and save the setup.
7. Choose Sign in with Google → Continue in Google. After consent, return to Sidequest → Choose my Google calendars.
8. Select calendars and import meetings.

Do not choose a Web application client or publish the downloaded credentials. Sidequest stores the client configuration and account tokens in Keychain, uses PKCE and an expiring OAuth state, and receives the callback on its loopback server.

External clients in Testing may need renewed consent after seven days. Wider distribution needs the relevant Google publishing/verification work; Workspace administrators can restrict access. This repository does not include a production OAuth registration. See [Google’s credential setup guide](https://developers.google.com/workspace/guides/create-credentials).

Disconnect forgets local Google account tokens. You can also revoke the grant from your Google account’s permissions page. No live Google account sign-in is run in automated tests.

## Mac calendars

Choose Agenda → Use Mac calendars instead. Add accounts in the Mac Calendar app first, then permit Sidequest to read and select calendars. Google, iCloud, Exchange, CalDAV, and subscribed sources supported by Mac Calendar can appear here. The OS calls the read permission “full access”; Sidequest does not implement calendar writes.

## Meeting quests

The agenda imports the next 14 days. Today’s timed events automatically become quests; all-day events remain manual. Turn automation off in Agenda if preferred. Recurring occurrences have distinct identities, and repeated syncs do not award XP or create duplicate quests for an occurrence.

The current UI selects one source route at a time: direct Google or Mac calendars. Switching routes preserves existing quests; the same event imported through both routes can have different identifiers.

Refresh runs every 15 minutes while the app is open and visible, deferred during dialogs. Refresh now is also available. Cancelled and declined events are excluded from new snapshots; existing quests are preserved. Notes and attendee lists are not saved. Imported quest titles can influence the configured storyteller. Completing a quest never changes the original calendar event.
