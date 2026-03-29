const CACHE_NAME = "ergoanalise-survey-v1";
const SURVEY_ASSETS = [
  "/logo-horizontal.png",
  "/logo-vertical.png",
];

// Install: pre-cache survey assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SURVEY_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache if offline, cache survey pages
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Cache-first for static assets
  if (SURVEY_ASSETS.some((a) => url.pathname === a)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Network-first for survey pages, fallback to cache
  if (url.pathname.startsWith("/survey/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});

// Handle offline survey submissions
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SYNC_SURVEYS") {
    syncPendingSurveys();
  }
});

async function syncPendingSurveys() {
  try {
    const db = await openDB();
    const tx = db.transaction("pending_surveys", "readonly");
    const store = tx.objectStore("pending_surveys");
    const request = store.getAll();

    request.onsuccess = async () => {
      const pending = request.result;
      for (const survey of pending) {
        try {
          const res = await fetch(survey.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...survey.headers },
            body: survey.body,
          });
          if (res.ok) {
            const delTx = db.transaction("pending_surveys", "readwrite");
            delTx.objectStore("pending_surveys").delete(survey.id);
          }
        } catch {
          // Still offline, will retry later
        }
      }
    };
  } catch {
    // DB not available
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ergoanalise_offline", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pending_surveys")) {
        db.createObjectStore("pending_surveys", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
