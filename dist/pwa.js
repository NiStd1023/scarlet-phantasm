'use strict';

// Browsers which support an install prompt expose it after their own checks.
let installPrompt = null;
const installButton = document.getElementById('install');
const offlineStatus = document.getElementById('offlineStatus');

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
});

installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = null;
  installButton.hidden = true;
  try {
    await prompt.prompt();
  } catch (error) {
    console.warn('Unable to show the installation prompt.', error);
  }
});

if ('serviceWorker' in navigator) {
  offlineStatus.hidden = false;
  offlineStatus.textContent = '離線資源準備中…';
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .then(registration => {
      const installing = registration.installing;
      if (installing) installing.addEventListener('statechange', () => {
        if (installing.state === 'redundant' && !navigator.serviceWorker.controller) {
          offlineStatus.textContent = '離線資源下載失敗，請重新整理再試';
        }
      });
      return navigator.serviceWorker.ready;
    })
    .then(() => { offlineStatus.textContent = '✦ 離線資源已備妥'; })
    .catch(error => {
      offlineStatus.textContent = '離線模式暫時無法使用';
      console.warn('Offline support is unavailable.', error);
    });
}
