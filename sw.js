/*
  Offline cache for Before.

  Network-first for the page: always tries to fetch the latest
  index.html, and falls back to the cached copy only when there
  is no connection. That way a new commit shows up on the next
  launch instead of being shadowed by a stale cache.

  It never touches your entries — those live in localStorage and
  are never read, sent, or cached by this file.
*/
var CACHE = "before-v3";

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(["./", "./index.html"]); })
      .catch(function () { /* first load offline — not fatal */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;

  var isPage = e.request.mode === "navigate" ||
               e.request.destination === "document";

  if (isPage) {
    // Newest page wins; cached copy is the fallback when offline.
    e.respondWith(
      fetch(e.request)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          return res;
        })
        .catch(function () {
          return caches.match(e.request).then(function (hit) {
            return hit || caches.match("./index.html");
          });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request);
    })
  );
});
