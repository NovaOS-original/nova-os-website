const ALLOWED_ORIGIN = "https://novaos-original.github.io";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: cors });

function validPayload(p: any) {
  return !!p && p.v === 1 &&
    typeof p.y === "string" && p.y.startsWith("data:image/jpeg;base64,") && /^[A-Za-z0-9+/=]+$/.test(p.y.slice(23)) && p.y.length < 700_000 &&
    typeof p.h === "string" && p.h.startsWith("data:image/jpeg;base64,") && /^[A-Za-z0-9+/=]+$/.test(p.h.slice(23)) && p.h.length < 700_000 &&
    typeof p.n === "string" && p.n.length <= 120 &&
    typeof p.s === "string" && p.s.length <= 120 &&
    typeof p.m === "string" && p.m.length <= 700 &&
    typeof p.e === "string" && p.e.length <= 120 &&
    ["rose", "night", "gold"].includes(p.t);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function allowRequest(req: Request, base: string, key: string, action: "create" | "read", maxRequests: number, windowSeconds: number): Promise<boolean> {
  // Store a one-way hash only, never the raw client IP.
  const address = req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const fingerprint = await sha256(action + ":" + address);
  const result = await fetch(base + "/rest/v1/rpc/lovespark_allow_request", {
    method: "POST",
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_bucket_key: action + ":" + fingerprint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    }),
  });
  if (!result.ok) {
    console.error("LoveSpark rate limiter unavailable", result.status);
    return false;
  }
  return await result.json() === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  if (req.method === "POST" && req.headers.get("origin") !== ALLOWED_ORIGIN) {
    return reply({ error: "Request origin is not allowed." }, 403);
  }

  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) return reply({ error: "Short-link service is not configured yet." }, 503);

  const allowed = req.method === "POST"
    ? await allowRequest(req, base, key, "create", 5, 3600)
    : await allowRequest(req, base, key, "read", 120, 60);
  if (!allowed) return reply({ error: "Too many requests or the security check is temporarily unavailable. Please wait and try again." }, 429);

  const restHeaders = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
  if (req.method === "POST") {
    if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
      return reply({ error: "Content-Type must be application/json." }, 415);
    }
    let body: any;
    try {
      const raw = await req.text();
      if (raw.length > 1_500_000) return reply({ error: "Please use smaller photos and try again." }, 413);
      body = JSON.parse(raw);
    } catch { return reply({ error: "Invalid request." }, 400); }
    if (!validPayload(body?.payload)) return reply({ error: "The surprise details or photos are invalid or too large." }, 400);

    for (let attempt = 0; attempt < 5; attempt++) {
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      const code = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "").slice(0, 11);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const result = await fetch(base + "/rest/v1/lovespark_surprises", {
        method: "POST",
        headers: { ...restHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ code, payload: body.payload, expires_at: expiresAt }),
      });
      if (result.ok) return reply({ code, expires_at: expiresAt });
      if (result.status !== 409) {
        console.error("LoveSpark database insert failed", result.status);
        return reply({ error: "Could not create a short link right now. Please try again." }, 500);
      }
    }
    return reply({ error: "Could not create a unique link. Please try again." }, 500);
  }

  const code = new URL(req.url).searchParams.get("code") || "";
  if (!/^[A-Za-z0-9_-]{7,12}$/.test(code)) return reply({ error: "That short link is invalid." }, 400);
  const result = await fetch(base + "/rest/v1/lovespark_surprises?code=eq." + encodeURIComponent(code) + "&select=payload,expires_at&limit=1", {
    headers: { apikey: key, Authorization: "Bearer " + key },
  });
  if (!result.ok) return reply({ error: "Could not load this surprise." }, 500);
  const rows = await result.json();
  if (!rows.length || !rows[0].expires_at || new Date(rows[0].expires_at).getTime() <= Date.now()) {
    return reply({ error: "This surprise link has expired or is unavailable. Ask the sender to make a new one." }, 404);
  }
  return reply({ payload: rows[0].payload, expires_at: rows[0].expires_at });
});