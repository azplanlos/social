import { useCallback, useEffect, useRef, useState } from 'react';
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

export type PushState = 'unsupported' | 'prompt' | 'subscribed' | 'denied';

/**
 * Hook for managing push notification subscriptions.
 * 
 * On iOS (Safari 16.4+), push notifications only work when:
 * - The app is added to the Home Screen (PWA / standalone mode)
 * - The permission request is triggered by a user gesture (button click)
 *
 * This hook provides:
 * - `pushState`: current state of the push subscription
 * - `subscribeToPush`: function to call on a button click to request permission and subscribe
 * 
 * On non-iOS browsers, it will attempt to auto-subscribe if permission was already granted.
 */
export function usePushNotifications(token: string | null) {
  const [pushState, setPushState] = useState<PushState>('unsupported');
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const subscribedRef = useRef(false);

  // Check support and register service worker
  useEffect(() => {
    if (!token) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported');
      return;
    }

    async function init() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        registrationRef.current = registration;

        // Check existing subscription
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          // Already subscribed — send to backend in case this device isn't registered yet
          await sendSubscriptionToBackend(existingSub, token!);
          subscribedRef.current = true;
          setPushState('subscribed');
          return;
        }

        // Check current permission state
        if (Notification.permission === 'denied') {
          setPushState('denied');
        } else if (Notification.permission === 'granted') {
          // Permission already granted (non-iOS or previously granted) — auto-subscribe
          await doSubscribe(registration, token!);
        } else {
          // Need to prompt — must be triggered by user gesture on iOS
          setPushState('prompt');
        }
      } catch (error) {
        console.error('Push init failed:', error);
        setPushState('unsupported');
      }
    }

    init();
  }, [token]);

  // Function to be called from a user gesture (button click)
  const subscribeToPush = useCallback(async () => {
    if (!token || !registrationRef.current || subscribedRef.current) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState('denied');
        return;
      }
      await doSubscribe(registrationRef.current, token);
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  }, [token]);

  async function doSubscribe(registration: ServiceWorkerRegistration, authToken: string) {
    const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    await sendSubscriptionToBackend(subscription, authToken);
    subscribedRef.current = true;
    setPushState('subscribed');
  }

  return { pushState, subscribeToPush };
}

async function sendSubscriptionToBackend(subscription: PushSubscription, token: string) {
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
  console.info('Push subscription registered successfully.');
}
