const CACHE="prime-manual-v20";
// index.htmlはキャッシュしない（更新時に古いコードが残るのを防ぐ）
const ASSETS=["./manifest.json","./icon.jpg"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  if(e.request.url.includes("sw.js")) return;
  // index.htmlは常にネットワークから取得（キャッシュしない）
  const url=new URL(e.request.url);
  if(url.pathname==="/"||url.pathname.endsWith("index.html")){
    e.respondWith(fetch(e.request).catch(()=>caches.match("./index.html")));
    return;
  }
  // その他のファイルはキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      return res;
    }))
  );
});
