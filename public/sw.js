const RUNTIME_CACHE = "unipilot-runtime-v1";

// Network-first, cache-fallback for same-origin GET requests: keeps the app
// usable offline (Phase 10 — NFR-05/06) by serving whatever was last
// successfully loaded while online. Mutations (POST/PATCH/etc.) and /api/
// routes are never intercepted — those must fail loudly offline so callers
// can queue them instead of getting a stale, silently-successful response.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // Next.js's client-side RSC prefetch/segment fetches (recognizable by the
  // `RSC` header or `_rsc` query param) are a background optimization, not
  // part of the "read while offline" story — skip them so a stale cached
  // fragment never gets served in place of the router's own cache, and so
  // replaying these fetches through the SW doesn't hit WebKit's stricter
  // access-control handling of re-issued requests with custom headers.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          void cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await cache.match("/");
          if (shell) return shell;
        }
        throw new Error("offline and not cached");
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "UniPilot AI", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // Malformed payload — fall back to a generic notification rather than
    // silently dropping it.
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "UniPilot AI", {
      body: data.body || "",
      icon: "/pilo-icon.svg",
      badge: "/pilo-icon.svg",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
      return undefined;
    }),
  );
});
