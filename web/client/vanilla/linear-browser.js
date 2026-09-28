// Reads the player's assigned Linear issues straight from their browser with their
// own personal API key. The key goes only to api.linear.app, never to Sidequest's
// server; only the resulting issue list is saved.
const STORE_KEY = 'sidequest.linearKey';

function stores() {
  const out = [];
  try { out.push(sessionStorage); } catch {}
  try { out.push(localStorage); } catch {}
  return out;
}

export function savedLinearKey() {
  for (const s of stores()) { try { const v = s.getItem(STORE_KEY); if (v) return v; } catch {} }
  return '';
}

export function rememberedOnDevice() {
  try { return !!localStorage.getItem(STORE_KEY); } catch { return false; }
}

export function saveLinearKey(key, remember) {
  forgetLinearKey();
  try { (remember ? localStorage : sessionStorage).setItem(STORE_KEY, key); } catch {}
}

export function forgetLinearKey() {
  for (const s of stores()) { try { s.removeItem(STORE_KEY); } catch {} }
}

const QUERY = `query Assigned($after: String) { viewer { assignedIssues(first: 100, after: $after, filter: {state: {type: {nin: ["completed", "canceled"]}}}) { nodes { id identifier title description priority sortOrder url state { name type } } pageInfo { hasNextPage endCursor } } } }`;

async function linearQuery(key, variables) {
  let r;
  try {
    r = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: key },
      body: JSON.stringify({ query: QUERY, variables }),
      signal: AbortSignal.timeout(20000),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  } catch {
    throw Error('Couldn’t reach Linear. Check your connection and try again.');
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403 || data.errors?.[0]?.extensions?.code === 'AUTHENTICATION_ERROR') {
    const e = Error('Linear didn’t accept that key. Create a new personal API key and try again.');
    e.auth = true;
    throw e;
  }
  if (!r.ok || data.errors) throw Error(data.errors?.[0]?.message || `Linear returned ${r.status}.`);
  return data.data;
}

export async function fetchAssignedIssues(key) {
  const all = [];
  let after = null;
  do {
    const data = await linearQuery(key, { after });
    const conn = data.viewer.assignedIssues;
    all.push(...conn.nodes);
    after = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
    if (all.length > 2000) throw Error('Too many assigned issues to import in one sync.');
  } while (after);
  return all.map((i) => ({
    id: i.id, identifier: i.identifier, title: i.title, description: i.description || '',
    priority: i.priority, sortOrder: i.sortOrder, url: i.url, status: i.state?.name || '', statusType: i.state?.type || '',
  }));
}
