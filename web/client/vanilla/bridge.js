// Routes the game's original /api/* calls to the capsule's `api` mutation.
// The Zero page attaches the mutation once the player is signed in.
// Model discovery and previews for the player's own server stay in the browser.
import { discoverAll, generateLocal } from './local-ai.js';
import { tend } from './storyteller.js';
import { onboardingPrompt } from '../../shared/settings.js';

let call;
let markReady;
const ready = new Promise((resolve) => { markReady = resolve; });

export function attachBridge(fn) {
  call = fn;
  markReady();
}

function reply(status, value) {
  return { ok: status < 400, status, json: async () => value };
}

const offset = () => new Date().getTimezoneOffset();
let lastView = null;

async function server(path, body) {
  const value = await call(path, body, offset());
  if (value && value.world) {
    lastView = value;
    tend(value, (p, b) => server(p, b));
  }
  return value;
}

async function local(path, body) {
  if (path === 'providers') return discoverAll(body || {});
  if (path === 'models') return discoverAll({});
  if (path === 'model-test') {
    const settings = { ...(lastView?.settings || {}), ...(body?.settings || {}) };
    if (settings.provider === 'spacefast') return null;
    const draft = body?.draft || {};
    return { text: await generateLocal(settings, onboardingPrompt(lastView || {}, draft)) };
  }
  return null;
}

export async function bridgeFetch(url, options = {}) {
  await ready;
  const path = String(url).replace(/^\/api\//, '');
  let body = null;
  try { body = options.body ? JSON.parse(options.body) : null; } catch { return reply(400, { error: 'Bad request.' }); }
  try {
    const handled = await local(path, body);
    if (handled) return reply(200, { token: 'web', ...handled });
    const value = await server(path, body);
    return reply(200, { token: 'web', ...value });
  } catch (error) {
    return reply(400, { error: String(error?.message || 'Something went wrong.').replace(/^Error:\s*/, '') });
  }
}
