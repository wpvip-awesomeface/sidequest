// Recreates the Mac app's index.html body, then boots the original game UI.
import css from './style.js';

// Browser-window layout. The Mac app lived in a fixed-size window; on the web the
// shell fills the viewport and pixel art keeps the aspect ratio it was drawn at.
const webLayout = `
.shell{max-width:none;width:100%}
canvas{max-width:100%}
.scene{width:100%;height:auto;aspect-ratio:480/194;max-height:min(62vh,640px);object-fit:cover;object-position:50% 60%}
#home-scene{width:100%;height:auto;aspect-ratio:640/400}
.creator-preview canvas{height:auto;aspect-ratio:200/180}
.hair-choice canvas{height:auto;aspect-ratio:1}
@media(min-width:1800px){.layout{grid-template-columns:minmax(700px,1fr) 360px;gap:28px}}
@media(min-width:2400px){.layout{grid-template-columns:minmax(900px,1fr) 400px}}
@media(max-width:800px){.scene{max-height:none}}
@media(max-width:540px){.scene-bottom .tag{display:none}.scene-label{top:10px;left:10px;padding:6px 8px}}
`;

// Browser-only head tags the platform's metadata doesn't cover. Link unfurlers read the
// server-rendered og/twitter tags from sf.jsonc; these are for tabs, home screens, and installs.
for (const [tag, attrs] of [
  ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/assets/favicon-32.png' }],
  ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/assets/favicon-16.png' }],
  ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/assets/apple-touch-icon.png' }],
  ['link', { rel: 'manifest', href: '/assets/site.webmanifest' }],
  ['meta', { name: 'theme-color', content: '#1b2621' }],
  ['meta', { name: 'color-scheme', content: 'dark' }],
  ['meta', { name: 'apple-mobile-web-app-title', content: 'Sidequest' }],
]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.head.appendChild(el);
}

if (!document.getElementById('sidequest-style')) {
  const style = document.createElement('style');
  style.id = 'sidequest-style';
  // The platform's Tailwind preflight sets `* { margin: 0 }`, which strips the
  // browser's `margin: auto` that centers modal dialogs. Put it back.
  style.textContent = css + '\ndialog:modal{position:fixed;inset:0;margin:auto;max-height:calc(100dvh - 32px);overflow:auto}\n.setup-dialog:modal{max-height:min(92vh,calc(100dvh - 32px));overflow:hidden}' + webLayout;
  document.head.appendChild(style);
}
if (!document.getElementById('app')) {
  document.body.insertAdjacentHTML('beforeend', '<div id="app"><p class="loading" id="campfire-start">Lighting the campfire…</p></div><div id="toast" role="status" aria-live="polite"></div><dialog id="modal"></dialog>');
}
