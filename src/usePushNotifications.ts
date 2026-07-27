import { useEffect, useRef } from 'react';
import axios from 'axios';
import { config } from './config';

/**
 * Converts a base64url-encoded VAPID key to a Uint8Array for the Web Push API.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook that registers the service worker and subscribes to push notifications.
 * Sends the subscription to the backend so the server can push to this device.
 *
 * @param token - The auth token (JWT) for backend requests. Subscription only happens when token is set.
 */
export function usePushNotifications(token: string | null) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!token || subscribedRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported in this browser.');
      return;
    }

    async function subscribe() {
      try {
        // Register the service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.info('Push notification permission denied.');
          return;
        }

        // Subscribe to push via the browser Push API
        const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // Extract keys and send to backend
        const subscriptionJson = subscription.toJSON();
        await axios.post(
          '/push/subscribe',
          {
            endpoint: subscriptionJson.endpoint,
            p256dh: subscriptionJson.keys?.p256dh,
            auth: subscriptionJson.keys?.auth,
          },
          {
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              Authorization: 'Bearer ' + token,
            },
            withCredentials: true,
          }
        );

        subscribedRef.current = true;
        console.info('Push subscription registered successfully.');
      } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
      }
    }

    subscribe();
  }, [token]);
}
