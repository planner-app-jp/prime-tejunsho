const CACHE="prime-manual-v49";
const ASSETS=["./manifest.json","./icon.jpg"];

// リダイレクト情報を取り除いた素のレスポンスに変換して保存する
// (Cloudflare Pagesは /index.html → / に308リダイレクトするため、そのまま
//  キャッシュするとiOSが "Response served by service worker has redirections"
//  エラーでページを開けなくなる)
async function cleanIndex(res){
  const body=await res.blob();
  return new Response(body,{status:200,headers:{"Content-Type":"text/html; charset=utf-8"}});
}

self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    try{
      const res=await fetch("./index.html");
      if(res.ok) await c.put("./index.html",await cleanIndex(res));
    }catch(err){}
    await c.addAll(ASSETS);
    self.skipWaiting();
  })());
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  if(e.request.url.includes("sw.js")) return;
  const url=new URL(e.request.url);
  // 画面表示はネットワーク優先(更新即反映)、成功時にコピー保存、失敗時(オフライン)はキャッシュ
  if(e.request.mode==="navigate"&&url.origin===location.origin){
    e.respondWith((async()=>{
      try{
        const res=await fetch(e.request);
        if(res.ok){
          const clean=await cleanIndex(res.clone());
          const c=await caches.open(CACHE);
          await c.put("./index.html",clean.clone());
          return clean;
        }
        return res;
      }catch(err){
        const hit=await caches.match("./index.html");
        if(hit) return hit;
        throw err;
      }
    })());
    return;
  }
  // その他のファイルはキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      if(res.ok&&!res.redirected){
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      }
      return res;
    }))
  );
});
