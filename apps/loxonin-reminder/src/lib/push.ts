// クライアント専用ヘルパ。SSR中には評価されないよう、必ず関数内でのみ navigator/window に触れる。
import { VAPID_PUBLIC_KEY } from "../constants";

const DEVICE_ID_STORAGE_KEY = "loxonin-device-id";

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const deviceId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}

export function isPushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js");
}

export async function getExistingSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

// 標準的な VAPID 公開鍵の base64url → Uint8Array 変換
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  const isIDevice = /iPad|iPhone|iPod/.test(ua);
  const isTouchMac =
    ua.includes("Mac") && "maxTouchPoints" in navigator && navigator.maxTouchPoints > 1;
  return isIDevice || isTouchMac;
}

export function isStandalone(): boolean {
  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return true;
    }
  }
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
