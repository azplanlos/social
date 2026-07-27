/* eslint-disable no-restricted-globals */

// Service Worker for Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) {
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: event.data.text() };
  }

  const title = data.title || 'Neuer Beitrag';
  const options = {
    body: data.body || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
  };

  // If image URL is provided, add it to notification
  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes('/secure') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/secure');
      }
    })
  );
});
