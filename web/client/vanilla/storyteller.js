// Writes pending story beats with the player's own model, in their browser, then
// hands the text to the server, which validates it exactly like the Mac app did.
import { narrativePrompt, pathsPrompt } from '../../shared/campaign.js';
import { supportPrompt } from '../../shared/squad.js';
import { generateLocal } from './local-ai.js';

const busy = new Set();
let running = false;

const usesLocalModel = (s) => s?.settings?.useModel && s.settings.model && s.settings.provider && s.settings.provider !== 'spacefast';
const usesSpacefast = (s) => s?.settings?.useModel && s.settings.provider === 'spacefast';

export function tend(view, call) {
  if (running || !view?.world) return;
  if (usesSpacefast(view)) {
    if (view.world.beats?.some((b) => b.status === 'pending')) {
      running = true;
      call('story', null).catch(() => {}).finally(() => { running = false; });
    }
    return;
  }
  if (!usesLocalModel(view)) return;
  running = true;
  work(view, call).catch(() => {}).finally(() => { running = false; });
}

async function work(view, call) {
  const settings = { ...view.settings };
  const profileRevision = view.profileRevision || 0;
  let latest = view;
  const pending = (latest.world.beats || []).filter((b) => b.status === 'pending' && !busy.has(b.id)).slice(-4).reverse();
  for (const beat of pending) {
    busy.add(beat.id);
    let text = null;
    try { text = await generateLocal(settings, narrativePrompt(latest, beat)); } catch { text = null; }
    try { latest = await call('story-result', { beatId: beat.id, text, profileRevision }); } finally { busy.delete(beat.id); }
    if (!latest?.world) return;
  }
  const w = latest.world;
  const conclusion = (w.beats || []).find((b) => b.kind === 'conclusion' && b.chapter === w.chapter);
  if (conclusion && w.pathsStatus === 'pending' && w.mission?.status === 'complete' && !busy.has('paths:' + w.chapter)) {
    busy.add('paths:' + w.chapter);
    let text = null;
    try { text = await generateLocal(settings, pathsPrompt(latest), { maxTokens: 420, maxChars: 2400, json: true }); } catch { text = null; }
    try { latest = await call('paths-result', { chapter: w.chapter, text, profileRevision }); } finally { busy.delete('paths:' + w.chapter); }
  }
  const msg = latest?.squad?.support?.message;
  if (msg?.pending && !busy.has('support:' + msg.id)) {
    busy.add('support:' + msg.id);
    let text = null;
    try { text = await generateLocal(settings, supportPrompt(latest)); } catch { text = null; }
    try { await call('support-result', { id: msg.id, text, profileRevision }); } finally { busy.delete('support:' + msg.id); }
  }
}
