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
