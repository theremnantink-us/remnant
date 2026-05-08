/* push-client.js — Web Push subscription management */
import { supabase } from './supabase-config.js';

const VAPID_PUBLIC_KEY = 'BF4lXfAdjGYADbpyxckwp-lKpv1hGmZOtLcFFjADBQfFOwb6XCUuvnq_5gUSQdaromGehP1HOE5M_74Z_kVedqM';

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (e) {
    console.warn('SW registration failed:', e);
    return null;
  }
}

export async function getPushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  const perm = Notification.permission;
  if (perm === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return 'unsubscribed';
  const sub = await reg.pushManager.getSubscription();
  return sub ? 'subscribed' : 'unsubscribed';
}

export async function subscribePush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const j = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
  }, { onConflict: 'endpoint' });

  return !error;
}

export async function unsubscribePush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
