import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../server/game.ts";

// Minimal in-memory stand-in for the Zero db API the handlers use.
function memoryDb() {
  const rows: any[] = [];
  let seq = 0;
  return {
    rows,
    saves: {
      withIndex(_name: string, range: (r: any) => any) {
        let field = "", value: any;
        range({ eq(f: string, v: any) { field = f; value = v; return this; } });
        return { collect: async () => rows.filter((r) => r[field] === value).map((r) => ({ ...r })) };
      },
      insert: async (v: any) => { const row = { id: String(++seq), ...v }; rows.push(row); return row; },
      update: async (id: string, patch: any) => { const row = rows.find((r) => r.id === id); Object.assign(row, patch); return row; },
      delete: async (id: string) => { const i = rows.findIndex((r) => r.id === id); rows.splice(i, 1); return true; },
    },
  };
}

function ctxFor(db: any, userId: string) {
  return {
    db,
    auth: { userId, isAuthenticated: true, isGuest: false, displayName: userId },
    log: { info() {}, warn() {}, error() {} },
  };
}

test("guests cannot open a save", async () => {
  const db = memoryDb();
  const guest = { ...ctxFor(db, "guest-1"), auth: { userId: "guest-1", isAuthenticated: false, isGuest: true, displayName: "Guest" } };
  await assert.rejects(handle(guest, "state", null, 0), /Sign in/);
  assert.equal(db.rows.length, 0);
});

test("first load creates a starter save", async () => {
  const db = memoryDb();
  const view: any = await handle(ctxFor(db, "alice"), "state", null, 0);
  assert.ok(view.tasks.length >= 1);
  assert.equal(view.web, true);
  assert.ok(db.rows.length >= 1);
  assert.ok(db.rows.every((r) => r.ownerId === "alice"));
});

test("players only see their own quests", async () => {
  const db = memoryDb();
  const alice = ctxFor(db, "alice");
  const bob = ctxFor(db, "bob");
  const first: any = await handle(alice, "state", null, 0);
  await handle(alice, "action", { type: "add", title: "Alice secret quest", expectedProfileRevision: first.profileRevision }, 0);
  const bobView: any = await handle(bob, "state", null, 0);
  assert.ok(!bobView.tasks.some((t: any) => t.title === "Alice secret quest"));
  const aliceView: any = await handle(alice, "state", null, 0);
  assert.ok(aliceView.tasks.some((t: any) => t.title === "Alice secret quest"), "action should persist for alice");
});

test("large saves round-trip across chunks", async () => {
  const db = memoryDb();
  const alice = ctxFor(db, "alice");
  const first: any = await handle(alice, "state", null, 0);
  for (let i = 0; i < 60; i++) {
    await handle(alice, "action", { type: "add", title: `Quest ${i} ` + "x".repeat(150), description: "d".repeat(400), expectedProfileRevision: first.profileRevision }, 0);
  }
  assert.ok(db.rows.filter((r) => r.ownerId === "alice").length > 1, "expected multiple chunks");
  const view: any = await handle(alice, "state", null, 0);
  assert.ok(view.tasks.filter((t: any) => t.title.startsWith("Quest ")).length >= 60);
});

const issue = (over: Record<string, unknown> = {}) => ({
  id: "i1", identifier: "SQ-1", title: "Fix the bridge", url: "https://linear.app/team/issue/SQ-1/fix-the-bridge",
  status: "In Progress", statusType: "started", priority: 2, ...over,
});

test("linear import adds assigned issues once and skips closed ones", async () => {
  const db = memoryDb();
  const alice = ctxFor(db, "alice");
  await handle(alice, "state", null, 0);
  const batch = [issue(), issue({ id: "i2", identifier: "SQ-2", title: "Old thing", statusType: "completed", status: "Done" })];
  const v1: any = await handle(alice, "linear-import", { issues: batch }, 0);
  assert.deepEqual(v1.syncResult, { added: 1, total: 1 });
  assert.equal(v1.linearConnected, true);
  const v2: any = await handle(alice, "linear-import", { issues: [issue({ title: "Fix the bridge (renamed)" })] }, 0);
  assert.deepEqual(v2.syncResult, { added: 0, total: 1 });
  const quests = v2.tasks.filter((t: any) => t.linearId === "i1");
  assert.equal(quests.length, 1);
  assert.equal(quests[0].title, "Fix the bridge (renamed)");
  assert.equal(quests[0].source, "linear");
});

test("linear import treats browser data as untrusted", async () => {
  const db = memoryDb();
  const alice = ctxFor(db, "alice");
  const v: any = await handle(alice, "linear-import", { issues: [issue({ url: "javascript:alert(1)", priority: 99, title: "x".repeat(900) })] }, 0);
  const q = v.tasks.find((t: any) => t.linearId === "i1");
  assert.equal(q.url, "");
  assert.equal(q.priority, 4);
  assert.ok(q.title.length <= 300);
  await assert.rejects(handle(alice, "linear-import", { issues: new Array(2001).fill(issue()) }, 0), /too large/);
  await assert.rejects(handle(alice, "linear-import", { issues: "nope" }, 0), /too large/);
});

test("linear imports stay in the importing player's save", async () => {
  const db = memoryDb();
  await handle(ctxFor(db, "alice"), "linear-import", { issues: [issue()] }, 0);
  const bob: any = await handle(ctxFor(db, "bob"), "state", null, 0);
  assert.ok(!bob.tasks.some((t: any) => t.linearId === "i1"));
  assert.equal(bob.linearConnected, false);
});

test("linear disconnect clears the linked flag", async () => {
  const db = memoryDb();
  const alice = ctxFor(db, "alice");
  await handle(alice, "linear-import", { issues: [issue()] }, 0);
  const v: any = await handle(alice, "linear", { disconnect: true }, 0);
  assert.equal(v.linearConnected, false);
});

async function withPendingBeat(settings: Record<string, unknown>, ai?: any) {
  const db = memoryDb();
  const ctx: any = ctxFor(db, "alice");
  if (ai) ctx.ai = ai;
  const first: any = await handle(ctx, "state", null, 0);
  await handle(ctx, "action", { type: "settings", settings: { ...first.settings, ...settings }, expectedProfileRevision: first.profileRevision }, 0);
  const view: any = await handle(ctx, "action", { type: "select", id: first.tasks[0].id }, 0);
  return { ctx, db, view };
}

test("player URLs are validated and saved", async () => {
  const { view } = await withPendingBeat({ useModel: true, provider: "lmstudio", providerUrl: "http://localhost:1234/", model: "qwen" });
  assert.equal(view.settings.providerUrl, "http://localhost:1234");
  assert.equal(view.settings.providerPort, 1234);
  const db = memoryDb();
  const ctx = ctxFor(db, "bob");
  const first: any = await handle(ctx, "state", null, 0);
  await assert.rejects(handle(ctx, "action", { type: "settings", settings: { ...first.settings, providerUrl: "javascript:alert(1)" }, expectedProfileRevision: first.profileRevision }, 0), /http/);
});

test("stories from the player's own model are validated before saving", async () => {
  const { ctx, view } = await withPendingBeat({ useModel: true, provider: "ollama", model: "qwen3:4b" });
  const pending = view.world.beats.filter((b: any) => b.status === "pending");
  assert.ok(pending.length >= 1, "selecting a quest should queue a story beat");
  const empty: any = await handle(ctx, "story-result", { beatId: pending[0].id, text: "", profileRevision: view.profileRevision }, 0);
  assert.equal(empty.world.beats.find((b: any) => b.id === pending[0].id).status, "fallback");
  const stale: any = await handle(ctx, "story-result", { beatId: pending[0].id, text: "Too late.", profileRevision: view.profileRevision }, 0);
  assert.equal(stale.world.beats.find((b: any) => b.id === pending[0].id).status, "fallback", "settled beats are not rewritten");
});

test("Spacefast AI writes pending beats on the server", async () => {
  let calls = 0;
  const ai = { complete: async () => { calls++; return { text: "Mira steps into the reeds, lantern low, and the frogs go quiet as if listening. The path ahead glows faintly." }; } };
  const { ctx, view } = await withPendingBeat({ useModel: true, provider: "spacefast", model: "spacefast-default" }, ai);
  assert.equal(view.settings.provider, "spacefast");
  assert.equal(view.modelStatus, "Spacefast AI storyteller");
  assert.ok(view.world.beats.some((b: any) => b.status === "pending"));
  const after: any = await handle(ctx, "story", null, 0);
  assert.ok(calls >= 1);
  assert.ok(after.world.beats.some((b: any) => b.source === "Spacefast AI" || b.status === "fallback"));
  assert.ok(!after.world.beats.some((b: any) => b.status === "pending"));
});

test("Spacefast AI preview explains when the service is missing", async () => {
  const db = memoryDb();
  await assert.rejects(handle(ctxFor(db, "alice"), "model-test", { draft: { name: "Mira" } }, 0), /Spacefast AI isn’t available/);
});

test("built-in mode settles every pending beat", async () => {
  const { view } = await withPendingBeat({ useModel: false });
  assert.ok(view.world.beats.length >= 1);
  assert.ok(!view.world.beats.some((b: any) => b.status === "pending"));
});

test("a valid story from the player's model replaces the built-in text", async () => {
  const { ctx, view } = await withPendingBeat({ useModel: true, provider: "lmstudio", model: "qwen" });
  const beat = view.world.beats.find((b: any) => b.status === "pending");
  const text = `${view.name} tightens a boot strap at the trailhead, grinning at the quiet morning. One small step, and the first lantern of the day flickers on.`;
  const after: any = await handle(ctx, "story-result", { beatId: beat.id, text, profileRevision: view.profileRevision }, 0);
  const saved = after.world.beats.find((b: any) => b.id === beat.id);
  assert.equal(saved.status, "ready");
  assert.equal(saved.source, "your model");
  assert.equal(saved.text.split(/\s+/)[0], view.name);
});

test("stale browser stories fall back to built-in text", async () => {
  const { ctx, db, view } = await withPendingBeat({ useModel: true, provider: "ollama", model: "qwen3:4b" });
  const rows = db.rows.filter((r: any) => r.ownerId === "alice").sort((a: any, b: any) => a.part - b.part);
  const state = JSON.parse(rows.map((r: any) => r.data).join(""));
  for (const b of state.world.beats) if (b.status === "pending") b.at = Date.now() - 10 * 60 * 1000;
  const json = JSON.stringify(state);
  rows.forEach((r: any, i: number) => { r.data = json.slice(i * 12000, (i + 1) * 12000); });
  const after: any = await handle(ctx, "state", null, 0);
  assert.ok(view.world.beats.some((b: any) => b.status === "pending"));
  assert.ok(!after.world.beats.some((b: any) => b.status === "pending"));
});

test("battle timers start at the real current time whatever the player's time zone", async () => {
  for (const offset of [240, -330, 0]) {
    const db = memoryDb();
    const ctx = ctxFor(db, "alice");
    const first: any = await handle(ctx, "state", null, offset);
    const id = first.tasks[0].id;
    await handle(ctx, "action", { type: "override" }, offset);
    await handle(ctx, "action", { type: "select", id }, offset);
    const before = Date.now();
    const v: any = await handle(ctx, "action", { type: "start", id, approach: "focus" }, offset);
    assert.ok(v.battle, "battle should start");
    assert.ok(Math.abs(v.battle.startedAt - before) < 5000, `offset ${offset}: startedAt should be now, got ${(before - v.battle.startedAt) / 60000} min ago`);
  }
});

test("the day key follows the player's clock", async () => {
  const { playerNow } = await import("../server/game.ts");
  const now = new Date();
  const east = playerNow(-14 * 60), west = playerNow(12 * 60);
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  assert.notEqual(key(east), key(west), "UTC+14 and UTC-12 are always on different dates");
  assert.ok(Math.abs(east.getTime() - now.getTime()) < 5000);
});

test("saves from the shifted clock are repaired once", async () => {
  const db = memoryDb();
  const ctx = ctxFor(db, "alice");
  const first: any = await handle(ctx, "state", null, 240);
  const id = first.tasks[0].id;
  await handle(ctx, "action", { type: "override" }, 240);
  await handle(ctx, "action", { type: "select", id }, 240);
  await handle(ctx, "action", { type: "start", id, approach: "focus" }, 240);
  // Simulate an old save: timestamp 4 hours early, no clock flag.
  const rows = db.rows.filter((r: any) => r.ownerId === "alice").sort((a: any, b: any) => a.part - b.part);
  const state = JSON.parse(rows.map((r: any) => r.data).join(""));
  const real = state.battle.startedAt;
  state.battle.startedAt = real - 240 * 60000;
  delete state.webClock;
  const json = JSON.stringify(state);
  rows.forEach((r: any, i: number) => { r.data = json.slice(i * 12000, (i + 1) * 12000); });
  const fixed: any = await handle(ctx, "state", null, 240);
  assert.equal(fixed.battle.startedAt, real);
  const again: any = await handle(ctx, "state", null, 240);
  assert.equal(again.battle.startedAt, real, "repair runs only once");
});

async function playWins(ctx: any, wins: number, offset = 0) {
  let v: any = await handle(ctx, "state", null, offset);
  await handle(ctx, "action", { type: "override" }, offset);
  const stories: string[] = [];
  for (let i = 0; i < wins; i++) {
    v = await handle(ctx, "state", null, offset);
    if (v.world.mission.status === "complete") {
      v = await handle(ctx, "action", { type: "path", id: v.world.paths[i % 3].id }, offset);
    }
    let open = v.tasks.filter((t: any) => t.status === "open");
    if (!open.length) v = await handle(ctx, "action", { type: "add", title: `Chore ${i}` }, offset);
    open = v.tasks.filter((t: any) => t.status === "open");
    const id = open[0].id;
    await handle(ctx, "action", { type: "select", id }, offset);
    await handle(ctx, "action", { type: "start", id, approach: "focus" }, offset);
    v = await handle(ctx, "action", { type: "complete", id }, offset);
    stories.push(v.story);
  }
  return { v, stories };
}

test("built-in chapters tell a different story line on every win", async () => {
  const db = memoryDb();
  const { v, stories } = await playWins(ctxFor(db, "alice"), 6);
  assert.equal(v.world.chapter, 1);
  assert.equal(v.world.mission.status, "complete");
  assert.equal(new Set(stories).size, stories.length, "no two wins print the same story");
  assert.match(stories[0], /bell clapper/);
  assert.match(stories.at(-1)!, /Morning returns to [A-Z]/);
  assert.ok(!stories.some((t) => /[{}]/.test(t)), "placeholders are filled");
  assert.deepEqual(v.world.playedAdventures, ["bell-that-forgot-morning"]);
});

test("new chapters come from the pool, one per style, never the one just played", async () => {
  const { adventures } = await import("../shared/adventures.js");
  const db = memoryDb();
  const { v } = await playWins(ctxFor(db, "alice"), 6);
  assert.equal(v.world.paths.length, 3);
  assert.deepEqual(v.world.paths.map((p: any) => p.style), ["rescue", "mystery", "expedition"]);
  for (const p of v.world.paths) {
    assert.notEqual(p.adventureId, "bell-that-forgot-morning");
    if (adventures.some((a: any) => a.style === p.style && a.id !== "bell-that-forgot-morning")) {
      assert.ok(adventures.some((a: any) => a.id === p.adventureId), `${p.style} path should come from the pool`);
    }
  }
});

test("existing saves pick up their adventure by title", async () => {
  const eng: any = await import("../shared/engine.js");
  const s = eng.migrateState(eng.initialState());
  delete s.world.mission.adventureId;
  delete s.world.playedAdventures;
  const again = eng.migrateState(s);
  assert.equal(again.world.mission.adventureId, "bell-that-forgot-morning");
  assert.deepEqual(again.world.playedAdventures, []);
});

test("a long built-in game never repeats an adventure until its style runs out", async () => {
  const { adventures } = await import("../shared/adventures.js");
  const db = memoryDb();
  const ctx = ctxFor(db, "alice");
  await handle(ctx, "state", null, 0);
  await handle(ctx, "action", { type: "override" }, 0);
  const seen: string[] = [];
  for (let chapter = 0; chapter < 30; chapter++) {
    let v: any = await handle(ctx, "state", null, 0);
    seen.push(v.world.mission.adventureId);
    while (v.world.mission.status !== "complete") {
      let open = v.tasks.filter((t: any) => t.status === "open");
      if (!open.length) { await handle(ctx, "action", { type: "add", title: "Chore" }, 0); v = await handle(ctx, "state", null, 0); open = v.tasks.filter((t: any) => t.status === "open"); }
      const id = open[0].id;
      await handle(ctx, "action", { type: "select", id }, 0);
      await handle(ctx, "action", { type: "start", id, approach: "focus" }, 0);
      v = await handle(ctx, "action", { type: "complete", id }, 0);
      assert.ok(!/[{}]/.test(v.story));
    }
    await handle(ctx, "action", { type: "path", id: v.world.paths[chapter % 3].id }, 0);
  }
  assert.ok(seen.every(Boolean), "every chapter came from the pool");
  assert.equal(new Set(seen).size, seen.length, "no repeats across 30 chapters");
  assert.ok(adventures.length >= 100);
});
