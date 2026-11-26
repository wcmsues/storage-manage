/* 动力二组库房管理系统 · 离线缓存
   只在 http(s) 下注册（index.html 内按协议判断），file:// 不加载本文件。
   升级版本时改 CACHE 名即可淘汰旧缓存，业务数据存 localStorage，不受影响。 */
const CACHE = "spare-warehouse-v0.7.1";
const ASSETS = [
  "./index.html",
  "./manifest.webmanifest",
  "./assets/logo-v3-180.png",
  "./assets/logo-v3-192.png",
  "./assets/logo-v3-512.png",
  "./assets/logo-v3-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

function put(req, res) {
  if (!res || !res.ok || res.type === "opaque") return;
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：联网优先，断网回退缓存（保证更新后立即拿到新版）
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => { put(req, res); return res; })
        .catch(() => caches.match("./index.html").then(hit => hit || caches.match(req)))
    );
    return;
  }

  // 静态资源：缓存优先，后台静默更新
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => { put(req, res); return res; }).catch(() => hit);
      return hit || net;
    })
  );
});
