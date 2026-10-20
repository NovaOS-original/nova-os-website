import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const TERMS_VERSION = "2026-10-19";
const allowedEvents = new Set(["page_view","video_generation_started","video_generation_completed","video_generation_failed","video_exported","chat_request","login","logout"]);
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return reply({ error: "Sign in required" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? '{"default":""}').default;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? '{"default":""}').default;
  if (!publishableKey || !serviceKey) return reply({ error: "Backend keys are not configured" }, 500);
  const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return reply({ error: "Invalid session" }, 401);
  try {
    const body = await req.json();
    const action = String(body?.action ?? "");
    if (action === "accept_terms") {
      if (body?.accepted !== true || body?.termsVersion !== TERMS_VERSION) return reply({ error: "Explicit acceptance of the current terms is required." }, 400);
      const { error } = await admin.from("nova_profiles").upsert({
        user_id: user.id,
        display_name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").slice(0,160),
        email: String(user.email ?? "").slice(0,254),
        avatar_url: String(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? "").slice(0,2048),
        terms_version: TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) throw error;
      await admin.from("nova_activity_logs").insert({ user_id: user.id, event_type: "login", metadata: { termsVersion: TERMS_VERSION } });
      return reply({ ok: true, termsVersion: TERMS_VERSION });
    }
    const { data: profile, error: profileError } = await admin.from("nova_profiles").select("terms_version,terms_accepted_at").eq("user_id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.terms_version !== TERMS_VERSION || !profile.terms_accepted_at) return reply({ error: "Please accept the current NOVA terms first." }, 403);

    if (action === "log") {
      const type = String(body?.type ?? "");
      if (!allowedEvents.has(type)) return reply({ error: "Unsupported activity event" }, 400);
      const input = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};
      const metadata: Record<string, string> = {};
      if (typeof input.tool === "string" && ["website","video-studio","ai-video","chatbot"].includes(input.tool)) metadata.tool = input.tool;
      if (typeof input.mode === "string" && ["text","image","imageText","local"].includes(input.mode)) metadata.mode = input.mode;
      const { error } = await admin.from("nova_activity_logs").insert({ user_id: user.id, event_type: type, metadata, expires_at: new Date(Date.now() + 90*86400000).toISOString() });
      if (error) throw error;
      return reply({ ok: true });
    }
    if (action === "chat") {
      const message = String(body?.message ?? "").trim();
      if (!message || message.length > 2000) return reply({ error: "Enter a message up to 2,000 characters." }, 400);
      const today = new Date().toISOString().slice(0,10);
      const { data: usage, error: usageError } = await admin.from("nova_chat_usage").select("request_count").eq("user_id", user.id).eq("usage_day", today).maybeSingle();
      if (usageError) throw usageError;
      if ((usage?.request_count ?? 0) >= 30) return reply({ error: "Daily chatbot limit reached. Please try again tomorrow." }, 429);
      const { error: upsertError } = await admin.from("nova_chat_usage").upsert({ user_id: user.id, usage_day: today, request_count: (usage?.request_count ?? 0) + 1 }, { onConflict: "user_id,usage_day" });
      if (upsertError) throw upsertError;
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiKey) return reply({ error: "Chatbot is not configured yet." }, 503);
      await admin.from("nova_activity_logs").insert({ user_id: user.id, event_type: "chat_request", metadata: { tool: "chatbot" }, expires_at: new Date(Date.now() + 90*86400000).toISOString() });
      const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: "You are NOVA Assistant for the NOVA OS open-source project and website. Be helpful, clear, honest about limitations, and do not claim actions were performed unless verified." }] }, contents: [{ role: "user", parts: [{ text: message }] }], generationConfig: { maxOutputTokens: 800, temperature: 0.7 } })
      });
      if (!aiResponse.ok) return reply({ error: "AI provider is temporarily unavailable." }, 502);
      const aiJson = await aiResponse.json();
      const answer = aiJson?.candidates?.[0]?.content?.parts?.map((p: {text?: string}) => p.text ?? "").join("").trim();
      return reply({ answer: answer || "I couldn't generate a reply. Please try again." });
    }
    return reply({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("nova-api request failed", err instanceof Error ? err.message : "unknown");
    return reply({ error: "The request could not be completed." }, 500);
  }
});
