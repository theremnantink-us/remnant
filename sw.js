/* REMNANT Service Worker — Web Push support */
const CACHE = 'remnant-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'REMNANT', body: event.data.text() }; }

  const title = data.title || 'REMNANT Tattoo Studio';
  const options = {
    body: data.body || 'Новое уведомление',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url || '/cabinet' },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/cabinet';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
