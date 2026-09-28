// Talks to the player's own model server straight from their browser, the way the
// Mac app did from its local server. Nothing here passes through Spacefast.
import { providerCatalog, providerConfig } from '../../shared/providers.js';

// Tokens live in memory for this tab only, never in the save.
const tokens = new Map();
export const tokenFor = (url) => tokens.get(url) || '';
export function setToken(url, key) { if (key) tokens.set(url, String(key).trim()); else tokens.delete(url); }

function friendly(error, url) {
  if (error?.status === 401 || error?.status === 403) return 'This server requires an API token.';
  if (error?.name === 'TimeoutError') return 'The server took too long to answer.';
  if (error instanceof TypeError) return `Your browser couldn’t reach ${url}. Check that the server is running and allows requests from this site (see “Connect your own model” below).`;
  return error?.message || 'Something went wrong.';
}

async function getJSON(url, key) {
  const r = await fetch(url, { headers: key ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(4000), redirect: 'error', credentials: 'omit' });
  if (!r.ok) { const e = Error(`Server returned ${r.status}.`); e.status = r.status; throw e; }
  return r.json();
}

function compatibleModels(data) {
  if (!Array.isArray(data.data)) throw Error('Not a compatible model list.');
  return data.data.filter((m) => !/(embedding|embed-|rerank)/i.test(m.id)).map((m) => ({ id: m.id, name: m.id }));
}

export async function discoverProvider(id, port, url) {
  const p = providerConfig(id, port, url);
  if (p.hosted) return { ...p, status: 'ready', models: [{ id: 'spacefast-default', name: 'Spacefast default model' }] };
  const key = tokenFor(p.url);
  try {
    let models;
    if (id === 'ollama') {
      const data = await getJSON(p.url + '/api/tags', key);
      if (!Array.isArray(data.models)) throw Error('Not an Ollama model list.');
      models = data.models.map((m) => ({ id: m.name, name: m.name, remote: !!m.remote_host || !!m.remote_model || m.name.endsWith(':cloud') }));
    } else if (id === 'lmstudio') {
      try {
        const data = await getJSON(p.url + '/api/v1/models', key);
        if (!Array.isArray(data.models)) throw Error('Unrecognized model list.');
        models = data.models.filter((m) => m.type === 'llm').map((m) => ({ id: m.loaded_instances?.[0]?.id || m.key, name: m.display_name || m.key, loaded: !!m.loaded_instances?.length }));
      } catch (e) {
        if (e.status === 401 || e.status === 403) throw e;
        models = compatibleModels(await getJSON(p.url + '/v1/models', key));
      }
    } else {
      models = compatibleModels(await getJSON(p.url + '/v1/models', key));
    }
    return { ...p, status: models.length ? 'ready' : 'empty', models };
  } catch (e) {
    return { ...p, status: e.status === 401 || e.status === 403 ? 'auth' : 'offline', models: [], message: friendly(e, p.url) };
  }
}

// body mirrors the Mac app's /api/providers request: {ports, urls, provider, key}.
export async function discoverAll(body = {}) {
  const ports = body.ports || {};
  const urls = body.urls || {};
  if (body.provider && body.key !== undefined) {
    const p = providerConfig(body.provider, ports[body.provider], urls[body.provider]);
    if (!p.hosted) setToken(p.url, body.key);
  }
  const providers = await Promise.all(providerCatalog.filter((p) => !p.hosted).map((p) => discoverProvider(p.id, ports[p.id], urls[p.id])));
  return { providers: providers.map((p) => ({ ...p, installed: false })) };
}

export async function generateLocal(settings, context, options = {}) {
  const p = providerConfig(settings.provider || 'ollama', settings.providerPort, settings.providerUrl);
  if (p.hosted) throw Error('Spacefast AI runs on the server.');
  if (!settings.model) throw Error('Choose a model first.');
  const key = tokenFor(p.url);
  const ollama = p.id === 'ollama';
  const payload = ollama
    ? { model: settings.model, stream: false, think: false, system: context.system, prompt: context.prompt, options: { num_predict: options.maxTokens || 180, temperature: 0.85 }, keep_alive: '5m' }
    : { model: settings.model, stream: false, messages: [{ role: 'system', content: context.system }, { role: 'user', content: context.prompt }], max_tokens: options.maxTokens || 180, temperature: 0.85 };
  if (options.json) { if (ollama) payload.format = 'json'; else payload.response_format = { type: 'json_object' }; }
  let r;
  try {
    r = await fetch(p.url + (ollama ? '/api/generate' : '/v1/chat/completions'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify(payload), signal: AbortSignal.timeout(60000), redirect: 'error', credentials: 'omit' });
  } catch (e) {
    throw Error(friendly(e, p.url));
  }
  if (!r.ok) throw Error(`Could not generate a story (${r.status}). Check that the selected model is loaded and the server token is correct.`);
  const data = await r.json();
  const text = ollama ? data.response : data.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw Error('The model returned no story. Try a chat/instruct model.');
  const clean = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim().slice(0, options.maxChars || 700);
  if (!clean) throw Error('The model returned only reasoning. Try a chat model with reasoning disabled.');
  return clean;
}
