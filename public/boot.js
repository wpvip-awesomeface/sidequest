const app = document.getElementById('app');
function recover() {
 if (!document.getElementById('campfire-start')) return;
 app.innerHTML = '<p class="loading">The campfire needs a fresh spark.<br><button id="retry-boot">↻ Reload Sidequest</button></p>';
 document.getElementById('retry-boot').onclick = () => {
  if (window.webkit?.messageHandlers?.sidequestReload) window.webkit.messageHandlers.sidequestReload.postMessage({});
  else location.reload();
 };
}
const timeout = setTimeout(recover, 15000);
import('./app.js').catch(recover).finally(() => clearTimeout(timeout));
