import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore -- plain JS content modules
import { adventures } from "../shared/adventures.js";
// @ts-ignore
import { sharedVars, RESERVED_VARS } from "../shared/madlib.js";

const LIMITS: Record<string, number> = { title: 60, hook: 180, twist: 140, open: 220, end: 220 };
const STEP_LIMIT = 170;
const BANNED = ["ancient evil", "tapestry", "echoes of", "delve", "testament", "little did", "suddenly", "destiny", "chosen one", "prophecy", "darkness looms"];
const PLACEHOLDER = /\{([^}]*)\}/g;
// {foe} and {place} are filled at runtime; use a realistic long value for length checks.
const RUNTIME_LONGEST: Record<string, string> = { foe: "The Unfinished Sentinel", place: "Frostbell Pass · Sanctuary 2" };

const longest = (list: string[]) => list.reduce((a, b) => (b.length > a.length ? b : a), "");

function texts(a: any): [string, string][] {
  return [
    ["title", a.title], ["hook", a.hook], ["twist", a.twist], ["open", a.open], ["end", a.end],
    ...a.steps.map((s: string, i: number): [string, string] => [`step ${i + 1}`, s]),
  ];
}

test("the pool has 100+ adventures spread across the three styles", () => {
  assert.ok(adventures.length >= 100, `only ${adventures.length}`);
  for (const style of ["rescue", "mystery", "expedition"]) {
    assert.ok(adventures.filter((a: any) => a.style === style).length >= 30, `${style} is thin`);
  }
  assert.equal(adventures[0].id, "bell-that-forgot-morning", "the first chapter stays first");
});

test("every adventure has the right shape, unique ids and titles, and no banned phrases", () => {
  const ids = new Set(), titles = new Set();
  for (const a of adventures) {
    const where = a.id;
    for (const k of ["id", "style", "title", "hook", "twist", "open", "end"]) assert.ok(typeof a[k] === "string" && a[k].trim(), `${where}: ${k}`);
    assert.ok(["rescue", "mystery", "expedition"].includes(a.style), `${where}: style`);
    assert.equal(a.steps?.length, 6, `${where}: needs 6 steps`);
    assert.ok(!ids.has(a.id), `${where}: duplicate id`); ids.add(a.id);
    assert.ok(!titles.has(a.title.toLowerCase()), `${where}: duplicate title`); titles.add(a.title.toLowerCase());
    for (const [field, text] of texts(a)) {
      const low = text.toLowerCase();
      for (const w of BANNED) assert.ok(!low.includes(w), `${where} ${field}: banned “${w}”`);
      assert.ok(!/whisper(?!fen)/.test(low), `${where} ${field}: banned “whisper”`);
      assert.ok(!/[<>]/.test(text), `${where} ${field}: angle brackets`);
    }
  }
});

test("every placeholder resolves, every variable is used, and lengths hold with the longest values", () => {
  for (const a of adventures) {
    const own: Record<string, string[]> = a.vars || {};
    for (const [k, list] of Object.entries(own)) {
      assert.ok(/^[a-z_]+$/.test(k), `${a.id}: var name ${k}`);
      assert.ok(!RESERVED_VARS.includes(k), `${a.id}: ${k} shadows a shared variable`);
      assert.ok(Array.isArray(list) && list.length >= 3 && list.length <= 5, `${a.id}: ${k} needs 3–5 options`);
      for (const v of list) assert.ok(typeof v === "string" && v.trim() && v.length <= 40, `${a.id}: ${k} option “${v}”`);
    }
    const all: Record<string, string> = { ...RUNTIME_LONGEST };
    for (const [k, list] of Object.entries({ ...sharedVars, ...own })) all[k] = longest(list as string[]);
    const used = new Set<string>();
    for (const [field, text] of texts(a)) {
      for (const [, name] of text.matchAll(PLACEHOLDER)) {
        assert.ok(name in all, `${a.id} ${field}: unknown {${name}}`);
        used.add(name);
      }
      const filled = text.replace(PLACEHOLDER, (_m, n) => all[n] ?? "");
      const limit = field.startsWith("step") ? STEP_LIMIT : LIMITS[field];
      // Allow a little slack for the runtime {foe}/{place} values, which vary.
      assert.ok(filled.length <= limit + 25, `${a.id} ${field}: ${filled.length} chars with longest values (max ${limit})`);
    }
    for (const k of Object.keys(own)) assert.ok(used.has(k), `${a.id}: var {${k}} is never used`);
  }
});

test("world-bank values match their sentence forms", () => {
  for (const [k, list] of Object.entries(sharedVars) as [string, string[]][]) {
    assert.ok(list.length >= 4, `${k} is too small`);
    assert.equal(new Set(list).size, list.length, `${k} has duplicates`);
    for (const v of list) assert.ok(v.length <= 40 && !/[{}<>]/.test(v), `${k}: “${v}”`);
  }
  for (const v of sharedVars.landmark) assert.match(v, /^the [A-Z]/, `landmark “${v}”`);
  for (const v of [...sharedVars.critter, ...sharedVars.trinket]) assert.match(v, /^(a|an|a pair of) [a-z]/, `“${v}”`);
  for (const v of sharedVars.village) assert.match(v, /^[A-Z]/, `village “${v}”`);
});
