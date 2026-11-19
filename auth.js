var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../worker/auth.js
var COOKIE = "ss_auth";
var MSG = "ss-auth-v1";
async function hmac(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmac, "hmac");
function eq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
__name(eq, "eq");
function loginPage(title, error, next) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${title} - Sunday Sauce projects</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1f1a;color:#e8ece4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  .card{width:min(92vw,340px);background:#232a23;border:1px solid #3a463a;border-radius:14px;padding:28px 24px;box-sizing:border-box}
  h1{font-size:1.05rem;margin:0 0 4px;color:#c9d6c0;letter-spacing:.02em}
  p.sub{margin:0 0 18px;font-size:.85rem;color:#8fa08a}
  input[type=password]{width:100%;box-sizing:border-box;padding:12px 14px;font-size:1rem;border-radius:8px;border:1px solid #4a5a4a;background:#161b16;color:#e8ece4;margin-bottom:12px}
  button{width:100%;padding:12px;font-size:1rem;font-weight:600;border:0;border-radius:8px;background:#7fae6d;color:#10150f;cursor:pointer}
  .err{color:#e0a090;font-size:.85rem;min-height:1.2em;margin:0 0 8px}
  p.foot{margin:16px 0 0;font-size:.72rem;color:#6a7a66;text-align:center}
</style></head><body>
<form class="card" method="post" action="/login">
  <h1>${title}</h1>
  <p class="sub">Sunday Sauce projects - private preview</p>
  <p class="err">${error || ""}</p>
  <input type="password" name="password" autocomplete="current-password" placeholder="Password" autofocus required>
  <input type="hidden" name="next" value="${next || "/"}">
  <button type="submit">Open site</button>
  <p class="foot">Same password as the old preview sites.</p>
</form></body></html>`;
}
__name(loginPage, "loginPage");
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
__name(parseCookies, "parseCookies");
function withSecurityHeaders(resp, env) {
  const r = new Response(resp.body, resp);
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  r.headers.set("X-Content-Type-Options", "nosniff");
  r.headers.set("Referrer-Policy", "no-referrer");
  if (env && env.CACHE_CONTROL) r.headers.set("cache-control", env.CACHE_CONTROL);
  if (env && env.CSP) r.headers.set("content-security-policy", env.CSP);
  return r;
}
__name(withSecurityHeaders, "withSecurityHeaders");
var partCache = /* @__PURE__ */ new Map();
async function getParts(env, url) {
  const key = url.pathname;
  if (partCache.has(key)) return partCache.get(key);
  const m = await env.ASSETS.fetch(new Request(new URL(`${key}.parts.json`, url).toString(), { headers: new Headers() }));
  let list = [];
  if (m.ok) {
    try {
      const sizes = await m.json();
      let off = 0;
      list = sizes.map((size, i) => ({ url: new URL(`${key}.part${String(i).padStart(2, "0")}`, url), size }));
    } catch (e) {
      list = [];
    }
  }
  partCache.set(key, list);
  return list;
}
__name(getParts, "getParts");
async function fetchAssetRanged(request, env, url) {
  const noRange = new Request(url.toString(), { headers: new Headers() });
  const asset = await env.ASSETS.fetch(noRange);
  const range = request.headers.get("range");
  if (asset.ok) {
    const buf = await asset.arrayBuffer();
    const baseHeaders2 = { "content-type": asset.headers.get("content-type") || "application/octet-stream", "accept-ranges": "bytes" };
    if (range) {
      const m = range.match(/^bytes=(\d*)-(\d*)$/);
      if (m && (m[1] !== "" || m[2] !== "")) {
        let start2 = m[1] === "" ? Math.max(0, buf.byteLength - parseInt(m[2], 10)) : parseInt(m[1], 10);
        let end2 = m[2] === "" || m[1] === "" ? buf.byteLength - 1 : Math.min(parseInt(m[2], 10), buf.byteLength - 1);
        if (start2 >= buf.byteLength || start2 > end2) {
          return new Response(null, { status: 416, headers: { ...baseHeaders2, "content-range": `bytes */${buf.byteLength}` } });
        }
        return new Response(buf.slice(start2, end2 + 1), { status: 206, headers: { ...baseHeaders2, "content-range": `bytes ${start2}-${end2}/${buf.byteLength}`, "content-length": String(end2 - start2 + 1) } });
      }
    }
    return new Response(buf, { status: 200, headers: { ...baseHeaders2, "content-length": String(buf.byteLength) } });
  }
  const parts = await getParts(env, url);
  if (!parts.length) return asset;
  const total = parts.reduce((a, b) => a + b.size, 0);
  const baseHeaders = { "content-type": "application/octet-stream", "accept-ranges": "bytes" };
  let start = 0, end = total - 1, status = 200;
  if (range) {
    const m = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!m || m[1] === "" && m[2] === "") {
      return new Response(null, { status: 416, headers: { ...baseHeaders, "content-range": `bytes */${total}` } });
    }
    start = m[1] === "" ? Math.max(0, total - parseInt(m[2], 10)) : parseInt(m[1], 10);
    end = m[2] === "" || m[1] === "" ? total - 1 : Math.min(parseInt(m[2], 10), total - 1);
    if (start >= total || start > end) {
      return new Response(null, { status: 416, headers: { ...baseHeaders, "content-range": `bytes */${total}` } });
    }
    status = 206;
  }
  const chunks = [];
  let off = 0;
  for (const part of parts) {
    const pStart = off, pEnd = off + part.size - 1;
    off = pEnd + 1;
    if (pEnd < start || pStart > end) continue;
    const buf = await (await env.ASSETS.fetch(new Request(part.url.toString(), { headers: new Headers() }))).arrayBuffer();
    chunks.push(buf.slice(Math.max(0, start - pStart), Math.min(part.size, end - pStart + 1)));
  }
  const body = new Uint8Array(chunks.reduce((a, c) => a + c.byteLength, 0));
  let at = 0;
  for (const c of chunks) {
    body.set(new Uint8Array(c), at);
    at += c.byteLength;
  }
  const headers = { ...baseHeaders, "content-length": String(body.byteLength) };
  if (status === 206) headers["content-range"] = `bytes ${start}-${end}/${total}`;
  return new Response(body, { status, headers });
}
__name(fetchAssetRanged, "fetchAssetRanged");
var HUB_FILES = { v2: "hub-data-v2.json", legacy: "hub-data.json" };
function ghApi(env, path, init) {
  init = init || {};
  return fetch(`https://api.github.com/repos/${env.HUB_REPO}/contents/${path}`, {
    ...init,
    headers: {
      "authorization": `Bearer ${env.GITHUB_PAT}`,
      "accept": "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "ss-projects-hub-worker",
      ...init.headers || {}
    }
  });
}
__name(ghApi, "ghApi");
async function handleHubApi(request, env) {
  const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  const err = /* @__PURE__ */ __name((msg, status) => new Response(JSON.stringify({ error: msg }), { status, headers: H }), "err");
  if (request.method === "GET") {
    const u = new URL(request.url);
    const f = u.searchParams.get("legacy") === "1" ? HUB_FILES.legacy : HUB_FILES.v2;
    const r = await ghApi(env, f);
    if (r.status === 404) return err("not found", 404);
    if (!r.ok) return err("github " + r.status, 502);
    const j = await r.json();
    const raw = atob(j.content.replace(/\n/g, ""));
    return new Response(JSON.stringify({ sha: j.sha, raw }), { headers: H });
  }
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return err("bad json", 400);
    }
    const raw = body && body.raw;
    const message = String(body && body.message || "hub data update").slice(0, 100);
    if (typeof raw !== "string" || !raw.length || raw.length > 15e5) return err("bad raw", 400);
    try {
      const env2 = JSON.parse(raw);
      if (typeof env2.iv !== "string" || typeof env2.ct !== "string") throw new Error("shape");
    } catch (e) {
      return err("raw must be an encrypted envelope", 400);
    }
    const g = await ghApi(env, HUB_FILES.v2);
    let sha;
    if (g.ok) {
      sha = (await g.json()).sha;
    } else if (g.status !== 404) return err("github " + g.status, 502);
    const put = await ghApi(env, HUB_FILES.v2, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sha ? { message, content: btoa(raw), sha } : { message, content: btoa(raw) })
    });
    if (put.status === 409 || put.status === 422) return err("conflict", 409);
    if (!put.ok) return err("github " + put.status, 502);
    const pj = await put.json();
    return new Response(JSON.stringify({ ok: true, sha: pj.content.sha }), { headers: H });
  }
  return err("method not allowed", 405);
}
__name(handleHubApi, "handleHubApi");
var auth_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const title = env.SITE_TITLE || "Project preview";
    const rangeFiles = (env.RANGE_FILES || "").split(",").map((s) => s.trim()).filter(Boolean);
    const serveAsset = /* @__PURE__ */ __name(async () => {
      if (rangeFiles.includes(url.pathname)) return fetchAssetRanged(request, env, url);
      const res = await env.ASSETS.fetch(request);
      if (url.pathname.startsWith("/downloads/")) {
        const name = url.pathname.split("/").pop() || "download";
        const attach = /* @__PURE__ */ __name((body, status, base) => {
          const headers = base ? new Headers(base) : new Headers();
          headers.set("content-disposition", `attachment; filename="${name}"`);
          return new Response(body, { status, headers });
        }, "attach");
        if (res.ok) return attach(res.body, res.status, res.headers);
        if (res.status === 404) {
          const base = url.pathname;
          const parts = [];
          for (let i = 0; ; i++) {
            const partUrl = new URL(`${base}.part${String(i).padStart(2, "0")}`, url);
            const r = await env.ASSETS.fetch(new Request(partUrl, request));
            if (!r.ok || !r.body) {
              r.body && r.body.cancel();
              break;
            }
            parts.push(r);
            if (i > 20) break;
          }
          if (parts.length) {
            const total = parts.reduce((a, r) => a + parseInt(r.headers.get("content-length") || "0", 10), 0);
            const stream = new ReadableStream({
              async start(controller) {
                for (const r of parts) {
                  const reader = r.body.getReader();
                  for (; ; ) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    controller.enqueue(value);
                  }
                }
                controller.close();
              },
              cancel() {
                parts.forEach((r) => r.body.cancel());
              }
            });
            const headers = new Headers();
            headers.set("content-type", "application/octet-stream");
            if (total > 0) headers.set("content-length", String(total));
            headers.set("content-disposition", `attachment; filename="${name}"`);
            return new Response(stream, { status: 200, headers });
          }
        }
      }
      return res;
    }, "serveAsset");
    if (url.pathname.endsWith("/version.json") || url.pathname === "/version.json") {
      const vres = withSecurityHeaders(await env.ASSETS.fetch(request), env);
      const headers = new Headers(vres.headers);
      headers.set("access-control-allow-origin", "*");
      headers.set("cache-control", "no-store");
      return new Response(vres.body, { status: vres.status, headers });
    }
    if (env.PUBLIC === "true") {
      return withSecurityHeaders(await serveAsset(), env);
    }
    if (url.pathname === "/beacon.js") {
      return withSecurityHeaders(await env.ASSETS.fetch(request), env);
    }
    const expected = await hmac(env.SITE_PASSWORD, MSG);
    if (url.pathname === "/login") {
      if (request.method === "GET") {
        return withSecurityHeaders(new Response(loginPage(title, "", url.searchParams.get("next") || "/"), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
      }
      if (request.method === "POST") {
        const form = await request.formData().catch(() => null);
        const pw = form && form.get("password");
        const next = form && form.get("next") || "/";
        if (typeof pw === "string" && eq(await hmac(pw, MSG), expected)) {
          return new Response(null, { status: 303, headers: {
            "location": next.startsWith("/") ? next : "/",
            "set-cookie": `${COOKIE}=${expected}; Path=/; Domain=sundaysauce-projects.workers.dev; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`,
            "cache-control": "no-store"
          } });
        }
        return withSecurityHeaders(new Response(loginPage(title, "Wrong password - try again.", next), { status: 401, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
      }
      return new Response("Method not allowed", { status: 405 });
    }
    if (url.pathname === "/logout") {
      return new Response(null, { status: 303, headers: { "location": "/login", "set-cookie": `${COOKIE}=; Path=/; Domain=sundaysauce-projects.workers.dev; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
    }
    const cookies = parseCookies(request.headers.get("cookie"));
    if (cookies[COOKIE] && eq(cookies[COOKIE], expected)) {
      if (env.HUB_REPO && url.pathname === "/api/hub-data") return withSecurityHeaders(await handleHubApi(request, env), env);
      return withSecurityHeaders(await serveAsset(), env);
    }
    return new Response(null, { status: 303, headers: { "location": "/login?next=" + encodeURIComponent(url.pathname + url.search) } });
  }
};
export {
  auth_default as default
};
//# sourceMappingURL=auth.js.map

