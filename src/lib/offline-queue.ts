// ============================================================================
// Cola offline para acciones sobre vacantes / postulaciones.
// - Guarda peticiones REST en IndexedDB (store 'queue').
// - Registra Background Sync ('sync-vacantes'). Si el navegador no lo soporta
//   (Safari/iOS), escuchamos 'online' y pedimos al SW que drene la cola.
// - Al recuperar conexión, el SW hace fetch a Supabase y muestra Notification.
// ============================================================================

const DB_NAME = "bt-offline";
const STORE = "queue";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface QueuedAction {
  id?: number;
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  body?: unknown;
  label: string;
  createdAt: number;
}

async function put(item: QueuedAction) {
  const db = await openDB();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(item);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function queueLength(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function registerBackgroundSync() {
  try {
    const reg = await navigator.serviceWorker.ready;
    // @ts-expect-error - sync no está en el tipado estándar
    if (reg.sync) await reg.sync.register("sync-vacantes");
  } catch {
    /* ignore, usaremos fallback 'online' */
  }
}

/**
 * Encola una acción REST contra Supabase (vacantes / postulaciones / egresados).
 * @param table   nombre de la tabla en public
 * @param method  POST (insert) | PATCH (update) | DELETE
 * @param body    payload para POST/PATCH
 * @param match   filtros PostgREST (ej. { id: 'eq.<uuid>' })
 * @param label   texto amigable para la notificación
 */
export async function enqueueSupabaseAction(opts: {
  table: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  match?: Record<string, string>;
  label: string;
  accessToken: string;
}): Promise<number> {
  const params = new URLSearchParams(opts.match ?? {}).toString();
  const url = `${SUPABASE_URL}/rest/v1/${opts.table}${params ? "?" + params : ""}`;
  const item: QueuedAction = {
    url,
    method: opts.method,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${opts.accessToken}`,
      Prefer: opts.method === "POST" ? "return=representation" : "return=minimal",
    },
    body: opts.body,
    label: opts.label,
    createdAt: Date.now(),
  };
  const id = await put(item);
  await registerBackgroundSync();
  return id;
}

/** Registra SW y monta el fallback 'online' para navegadores sin SyncManager. */
export async function initOfflineSync() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.warn("SW register failed", e);
    return;
  }

  const drain = async () => {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "drain-queue" });
  };

  window.addEventListener("online", drain);
  // Intento inicial por si quedó cola de una sesión previa
  if (navigator.onLine) drain();
}
