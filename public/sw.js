/* REMNANT — Service Worker
   Handles background push notifications */

const ADMIN_URL = '/admin.html';

self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'REMNANT', body: event.data.text() }; }

  const title = data.title || 'REMNANT — Новая запись';
  const options = {
    body: data.body || 'Поступила новая заявка',
    icon: '/favicon-192.png',
    badge: '/favicon-96.png',
    tag: `booking-${data.id || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: ADMIN_URL, date: data.date },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || ADMIN_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If admin tab already open — focus it
      for (const client of clientList) {
        if (client.url.includes('admin.html')) {
          return client.focus().then(c => c.postMessage({ type: 'notification_click', date: event.notification.data?.date }));
        }
      }
      // Otherwise open new tab
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
