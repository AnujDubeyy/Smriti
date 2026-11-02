# Public offline boundary

The allowlist contains only offline.html/css/js, brand images/icons and bundled fonts. Installation requests use credentials: omit. Neither online HTML nor a failing route URL is put into the cache. GET navigation requests can receive the generic offline shell on network failure. APIs, requests with Authorization, non-GET and cross-origin requests are excluded. Query-bearing asset requests and RSC requests are not cached.

There is no patient-data UI or persistent patient store in Phase 1. Before adding protected routes, preserve these exclusions and add authenticated browser regression tests. This design does not replace server-side authorization, consent or Phase 2 RLS.
