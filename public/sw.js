self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// -------------------- Push (sin cambios) --------------------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Notificación", body: event.data && event.data.text() };
  }
  const title = data.title || "Bolsa de Trabajo UIEPCh";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

// -------------------- IndexedDB helpers (mismo esquema que el cliente) --------------------
const DB_NAME = "bt-offline";
const STORE = "queue";

function openDB() {
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

async function readAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removeItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------- Drenado de la cola --------------------
async function drainQueue() {
  const items = await readAll();
  let ok = 0,
    fail = 0;
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (!res.ok) {
        // 4xx: no vale la pena reintentar (RLS, validación). Descartamos.
        if (res.status >= 400 && res.status < 500) {
          await removeItem(item.id);
          await self.registration.showNotification("Acción rechazada", {
            body: `${item.label || "Operación"} no se pudo aplicar (${res.status}).`,
            icon: "/icon-192.png",
            tag: `sync-fail-${item.id}`,
          });
          fail++;
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      await removeItem(item.id);
      ok++;
      await self.registration.showNotification("Sincronizado ✓", {
        body: `${item.label || "Operación"} enviada correctamente.`,
        icon: "/icon-192.png",
        tag: `sync-ok-${item.id}`,
      });
    } catch (err) {
      // Re-lanzamos para que Background Sync reintente con backoff.
      fail++;
      throw err;
    }
  }
  return { ok, fail };
}

// Evento nativo del navegador cuando vuelve la conexión.
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-vacantes") {
    event.waitUntil(drainQueue());
  }
});

// Fallback: el cliente pide drenar manualmente (Safari/iOS al detectar 'online').
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "drain-queue") {
    event.waitUntil(drainQueue().catch(() => {}));
  }
});
