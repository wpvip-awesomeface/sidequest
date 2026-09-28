// @ts-ignore -- plain JS game engine shared with the Mac app
import { action, initialState, migrateState, publicState, quest, refreshDay } from "../shared/engine.js";
// @ts-ignore
import { assertProfileVersion, needsProfileVersion, onboardingPrompt } from "../shared/settings.js";
// @ts-ignore
import { applyPaths, cleanNarration, narrativePrompt, pathsPrompt } from "../shared/campaign.js";
// @ts-ignore
import { validateStory } from "../shared/lore.js";
// @ts-ignore
import { supportPrompt } from "../shared/squad.js";

const BUILD = "web-1";
// Saves are split across rows so no single column value grows unbounded.
const CHUNK = 12000;

type Ctx = any;
type State = any;

export function requireUser(ctx: Ctx): string {
  if (!ctx.auth.isAuthenticated || ctx.auth.isGuest) throw Error("Sign in to open your Sidequest save.");
  return ctx.auth.userId;
}

// The engine reads calendar fields (day, hour, weekday) through local getters and
// stores timestamps with getTime(). The runner's clock is UTC, so this Date keeps the
// real instant for timestamps and answers the calendar getters in the player's zone.
class PlayerClock extends Date {
  private local: Date;
  private offset: number;
  constructor(ms: number, offsetMinutes: number) {
    super(ms);
    this.offset = offsetMinutes;
    this.local = new Date(ms - offsetMinutes * 60000);
  }
  getFullYear() { return this.local.getUTCFullYear(); }
  getMonth() { return this.local.getUTCMonth(); }
  getDate() { return this.local.getUTCDate(); }
  getDay() { return this.local.getUTCDay(); }
  getHours() { return this.local.getUTCHours(); }
  getMinutes() { return this.local.getUTCMinutes(); }
  getTimezoneOffset() { return this.offset; }
}

function playerOffset(offsetMinutes: unknown): number {
  const offset = Number(offsetMinutes);
  return Number.isFinite(offset) && Math.abs(offset) <= 14 * 60 ? offset : 0;
}

export function playerNow(offsetMinutes: unknown): Date {
  return new PlayerClock(Date.now(), playerOffset(offsetMinutes));
}

// Web builds before v12 stored battle and support timestamps shifted by the player's
// UTC offset. Undo that once, assuming the player's zone hasn't changed since.
function repairShiftedClock(state: State, offsetMinutes: unknown) {
  if (state.webClock === 2) return;
  const fix = playerOffset(offsetMinutes) * 60000;
  if (fix) {
    const battle = state.battle;
    if (battle) for (const key of ["startedAt", "pausedAt", "breakUntil"]) if (typeof battle[key] === "number") battle[key] += fix;
    const support = state.squad?.support;
    if (support && typeof support.nextAt === "number") support.nextAt += fix;
  }
  state.webClock = 2;
}

async function loadSave(ctx: Ctx, ownerId: string): Promise<{ state: State; rows: any[] }> {
  const rows = await ctx.db.saves.withIndex("by_owner", (r: any) => r.eq("ownerId", ownerId)).collect();
  rows.sort((a: any, b: any) => Number(a.part) - Number(b.part));
  let state: State;
  if (rows.length) {
    try {
      state = JSON.parse(rows.map((r: any) => r.data).join(""));
    } catch {
      throw Error("Your save could not be read. Nothing was changed.");
    }
  } else {
    state = initialState();
    state.webClock = 2;
  }
  state = migrateState(state);
  return { state, rows };
}

async function writeSave(ctx: Ctx, ownerId: string, rows: any[], state: State) {
  state.revision = (state.revision || 0) + 1;
  const json = JSON.stringify(state);
  if (json.length > 1_500_000) throw Error("This save is too large to store. Try clearing completed quests.");
  const parts: string[] = [];
  for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
  for (let i = 0; i < parts.length; i++) {
    const existing = rows[i];
    if (existing) {
      if (existing.data !== parts[i] || existing.part !== String(i)) await ctx.db.saves.update(existing.id, { data: parts[i], part: String(i) });
    } else {
      await ctx.db.saves.insert({ ownerId, part: String(i), data: parts[i] });
    }
  }
  for (let i = parts.length; i < rows.length; i++) await ctx.db.saves.delete(rows[i].id);
}

// Stories come from one of three places: built-in text, the player's own model
// (written in their browser and posted back as story-result), or Spacefast AI.
const STALE_MS = 3 * 60 * 1000;
const storyMode = (state: State) =>
  !state.settings.useModel || !state.settings.model ? "builtin" : state.settings.provider === "spacefast" ? "spacefast" : "local";

function settleStories(state: State) {
  const mode = storyMode(state);
  // Beat timestamps are real epoch ms, so compare against the real clock, not the shifted player clock.
  const realNow = Date.now();
  const cutoff = realNow - STALE_MS;
  for (const beat of state.world?.beats || []) {
    if (beat.status !== "pending" && beat.status !== "writing") continue;
    // A browser can close mid-story; the built-in text takes over after a few minutes.
    if (mode === "builtin" || Number(beat.at || 0) < cutoff) beat.status = mode === "builtin" ? "ready" : "fallback";
  }
  const msg = state.squad?.support?.message;
  if (msg?.pending && !msg.at) msg.at = realNow;
  if (msg?.pending && (mode === "builtin" || Number(msg.at || 0) < cutoff)) msg.pending = false;
  const w = state.world;
  if (w?.pathsStatus === "pending") {
    w.pathsPendingAt ??= realNow;
    if (mode === "builtin" || w.pathsPendingAt < cutoff) w.pathsStatus = "built-in paths";
  }
  if (w && w.pathsStatus !== "pending") delete w.pathsPendingAt;
}

function acceptBeat(state: State, beatId: unknown, text: unknown, source: string) {
  const beat = (state.world?.beats || []).find((x: any) => x.id === beatId);
  if (!beat || (beat.status !== "pending" && beat.status !== "writing")) return false;
  try {
    if (typeof text !== "string" || !text.trim()) throw Error("empty");
    const clean = validateStory(state, beat, cleanNarration(text.slice(0, 2000)));
    beat.text = String(clean).split(/\s+/).slice(0, 65).join(" ");
    beat.source = source;
    beat.status = "ready";
    if (state.world.lastEvent === beat.id) state.story = beat.text;
  } catch {
    beat.status = "fallback";
  }
  return true;
}

function acceptPaths(state: State, chapter: unknown, text: unknown) {
  const w = state.world;
  if (!w || w.chapter !== chapter || w.pathsStatus !== "pending") return;
  if (typeof text !== "string" || !applyPaths(state, w.chapter, text.slice(0, 4000))) w.pathsStatus = "built-in paths";
}

function acceptSupport(state: State, id: unknown, text: unknown, source: string) {
  const msg = state.squad?.support?.message;
  if (!msg?.pending || msg.id !== id) return;
  if (typeof text === "string" && text.trim()) {
    msg.text = cleanNarration(text.slice(0, 1500));
    msg.source = source;
  }
  msg.pending = false;
}

// ---- Spacefast AI ------------------------------------------------------------
// ctx.ai is not documented yet. aiComplete() is the single place that knows its
// request and response shape, so it can be corrected without touching callers.
function aiText(result: any): string {
  if (typeof result === "string") return result;
  return String(result?.text ?? result?.content ?? result?.output ?? result?.choices?.[0]?.message?.content ?? result?.message?.content ?? "");
}

async function aiComplete(ctx: Ctx, context: { system: string; prompt: string }, options: { maxTokens?: number; json?: boolean } = {}) {
  if (!ctx.ai || typeof ctx.ai.complete !== "function") throw Error("Spacefast AI isn’t available for this space yet. Built-in stories will keep you company.");
  const result = await ctx.ai.complete({
    system: context.system,
    prompt: context.prompt,
    messages: [{ role: "system", content: context.system }, { role: "user", content: context.prompt }],
    maxTokens: options.maxTokens || 180,
    ...(options.json ? { responseFormat: "json" } : {}),
  });
  const text = aiText(result).replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!text) throw Error("Spacefast AI returned no story.");
  return text;
}

async function writeWithSpacefast(ctx: Ctx, state: State) {
  const pending = (state.world?.beats || []).filter((b: any) => b.status === "pending").slice(-3);
  for (const beat of pending) {
    let text: string | null = null;
    try { text = await aiComplete(ctx, narrativePrompt(state, beat)); } catch (e: any) { ctx.log.warn("spacefast ai story failed", { message: String(e?.message ?? e) }); }
    acceptBeat(state, beat.id, text, "Spacefast AI");
  }
  const w = state.world;
  if (w?.pathsStatus === "pending" && w.mission?.status === "complete") {
    let text: string | null = null;
    try { text = await aiComplete(ctx, pathsPrompt(state), { maxTokens: 420, json: true }); } catch {}
    acceptPaths(state, w.chapter, text);
  }
  const msg = state.squad?.support?.message;
  if (msg?.pending) {
    let text: string | null = null;
    try { text = await aiComplete(ctx, supportPrompt(state)); } catch {}
    acceptSupport(state, msg.id, text, "Spacefast AI");
  }
}

function view(state: State, now: Date, extra: Record<string, unknown> = {}) {
  return {
    ...publicState(state, now),
    serverBuild: BUILD,
    web: true,
    linearConnected: !!state.linearLinked,
    linearRemembered: !!state.linearLinked,
    linearStorageWarning: "",
    googleCalendar: { configured: false, connected: false, warning: "" },
    modelStatus: storyMode(state) === "builtin" ? "Built-in stories" : storyMode(state) === "spacefast" ? "Spacefast AI storyteller" : "Your own storyteller",
    ...extra,
  };
}

// ---- Linear, fetched in the player's browser with their own key ----------------
// The server only sees the issue list, so treat every field as untrusted input.
const MAX_ISSUES = 2000;
const LINEAR_URL = /^https:\/\/linear\.app\/[^/\s]+\/issue\/[^/\s]+(?:\/[^\s]*)?$/;

function normalizeIssue(raw: any) {
  const stateName = typeof raw.status === "string" ? raw.status : raw.state?.name ?? raw.statusName ?? "";
  const stateType = String(raw.state?.type ?? raw.statusType ?? "").toLowerCase();
  const priorityValue = typeof raw.priority === "object" ? raw.priority?.value : raw.priority;
  return {
    id: String(raw.id ?? "").slice(0, 100),
    identifier: String(raw.identifier ?? raw.key ?? "").slice(0, 40),
    title: String(raw.title ?? "").slice(0, 300),
    description: String(raw.description ?? "").slice(0, 4000),
    priority: [1, 2, 3, 4].includes(Number(priorityValue)) ? Number(priorityValue) : 4,
    sortOrder: Number(raw.sortOrder) || 0,
    url: LINEAR_URL.test(String(raw.url ?? "")) ? String(raw.url).slice(0, 500) : "",
    stateName: String(stateName).slice(0, 60),
    closed: ["completed", "canceled", "cancelled", "done"].includes(stateType) || /^(done|canceled|cancelled|completed|duplicate)$/i.test(String(stateName)),
  };
}

function applyIssues(state: State, issues: any[]) {
  let added = 0;
  for (const issue of issues) {
    const old = state.tasks.find((t: any) => t.linearId === issue.id);
    if (old) {
      old.title = issue.title;
      old.url = issue.url;
      old.identifier = issue.identifier;
      old.description = issue.description;
      old.sortOrder = issue.sortOrder;
      old.linearState = issue.stateName;
      if (!old.priorityOverride) old.priority = issue.priority;
    } else {
      state.tasks.push(quest(issue.title, {
        description: issue.description, priority: issue.priority, sortOrder: issue.sortOrder, source: "linear",
        linearId: issue.id, identifier: issue.identifier, url: issue.url, linearState: issue.stateName,
      }));
      added++;
    }
  }
  state.lastSync = Date.now();
  return { added, total: issues.length };
}

// ---- One entry point that mirrors the Mac app's /api routes ----------------

export async function handle(ctx: Ctx, path: string, body: any, offset: unknown) {
  const ownerId = requireUser(ctx);
  const now = playerNow(offset);
  const { state, rows } = await loadSave(ctx, ownerId);
  repairShiftedClock(state, offset);
  refreshDay(state, now);
  settleStories(state);
  const b = body && typeof body === "object" ? body : {};

  switch (path) {
    case "state":
      break;
    case "story":
      if (storyMode(state) === "spacefast") await writeWithSpacefast(ctx, state);
      break;
    case "story-result":
      if (b.profileRevision === (state.profileRevision || 0)) acceptBeat(state, b.beatId, b.text, "your model");
      break;
    case "paths-result":
      if (b.profileRevision === (state.profileRevision || 0)) acceptPaths(state, b.chapter, b.text);
      break;
    case "support-result":
      if (b.profileRevision === (state.profileRevision || 0)) acceptSupport(state, b.id, b.text, "your model");
      break;
    case "action": {
      assertProfileVersion(state, b);
      const draft = JSON.parse(JSON.stringify(state));
      action(draft, b, now);
      if (needsProfileVersion(b)) draft.profileRevision = (state.profileRevision || 0) + 1;
      settleStories(draft);
      await writeSave(ctx, ownerId, rows, draft);
      return view(draft, now);
    }
    case "linear": {
      if (!b.disconnect) throw Error("Reload Sidequest to use the new Linear connection.");
      state.linearLinked = false;
      await writeSave(ctx, ownerId, rows, state);
      return view(state, now);
    }
    case "linear-import": {
      if (!Array.isArray(b.issues) || b.issues.length > MAX_ISSUES) throw Error("That Linear import was too large. Try again with fewer assigned issues.");
      const issues = b.issues.filter((i: unknown) => i && typeof i === "object").map(normalizeIssue).filter((i: any) => i.id && i.title && !i.closed);
      const syncResult = applyIssues(state, issues);
      state.linearLinked = true;
      await writeSave(ctx, ownerId, rows, state);
      return view(state, now, { syncResult });
    }
    case "model-test": {
      // Local-model previews run in the browser; only Spacefast AI previews reach here.
      const draft = b.draft && typeof b.draft === "object" ? b.draft : {};
      return { text: (await aiComplete(ctx, onboardingPrompt(state, draft))).slice(0, 700) };
    }
    case "google":
      throw Error("Calendar quests are available in the Mac app only for now.");
    default:
      throw Error("Not found.");
  }
  // Day rollovers and story settling can change the save, so persist them.
  if (!rows.length || JSON.stringify(state) !== rows.map((r: any) => r.data).join("")) {
    await writeSave(ctx, ownerId, rows, state);
  }
  return view(state, now);
}

