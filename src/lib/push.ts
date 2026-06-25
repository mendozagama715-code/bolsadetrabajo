import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function abToBase64(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function ensurePushSubscription(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: "Tu navegador no soporta notificaciones push." };

  const reg = (await navigator.serviceWorker.getRegistration("/sw.js")) || (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;

  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "Permiso denegado." };

  const { data: keyData, error: keyErr } = await supabase.functions.invoke("get-vapid-public-key");
  if (keyErr || !keyData?.publicKey) return { ok: false, reason: "No se pudo obtener la clave del servidor." };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    });
  }

  const endpoint = sub.endpoint;
  const p256dh = abToBase64(sub.getKey("p256dh"));
  const auth = abToBase64(sub.getKey("auth"));

  const { error } = await supabase.from("push_tokens").upsert(
    { user_id: userId, endpoint, p256dh, auth, user_agent: navigator.userAgent, last_used_at: new Date().toISOString() },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function disablePushSubscription(userId: string) {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_tokens").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}
