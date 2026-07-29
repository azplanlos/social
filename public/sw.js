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
    data: {
      beitragId: data.beitragId || null,
    },
  };

  // If image URL is provided, add it to notification
  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var beitragId = event.notification.data && event.notification.data.beitragId;
  var targetUrl = '/secure';
  if (beitragId) {
    targetUrl = '/secure?beitrag=' + beitragId;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If an existing window is open, navigate it to the deep link
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
