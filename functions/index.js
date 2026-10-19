const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const TERMS_VERSION = "2026-10-19";
const REGION = "us-central1";
const allowedEvents = new Set([
  "page_view", "video_generation_started", "video_generation_completed",
  "video_generation_failed", "video_exported", "chat_request", "login", "logout"
]);

function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in with Google to continue.");
  return request.auth;
}
async function requireTerms(uid) {
  const snap = await db.doc("users/" + uid).get();
  if (!snap.exists || snap.get("termsVersion") !== TERMS_VERSION || !snap.get("termsAcceptedAt")) {
    throw new HttpsError("failed-precondition", "Please accept the current NOVA terms before using cloud features.");
  }
}
function expiryDate() {
  return Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
}

exports.getSession = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const ref = db.doc("users/" + auth.uid);
  const snap = await ref.get();
  return {
    authenticated: true,
    termsAccepted: !!snap.exists && snap.get("termsVersion") === TERMS_VERSION && !!snap.get("termsAcceptedAt"),
    termsVersion: TERMS_VERSION,
    profile: snap.exists ? {
      displayName: snap.get("displayName") || "",
      email: snap.get("email") || "",
      photoURL: snap.get("photoURL") || ""
    } : null
  };
});

exports.acceptTerms = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  if (request.data?.termsVersion !== TERMS_VERSION || request.data?.accepted !== true) {
    throw new HttpsError("invalid-argument", "A valid explicit acceptance of the current terms is required.");
  }
  const ref = db.doc("users/" + auth.uid);
  const prior = await ref.get();
  await ref.set({
    uid: auth.uid,
    displayName: String(auth.token.name || "").slice(0, 160),
    email: String(auth.token.email || "").slice(0, 254),
    photoURL: String(auth.token.picture || "").slice(0, 2048),
    termsVersion: TERMS_VERSION,
    termsAcceptedAt: FieldValue.serverTimestamp(),
    createdAt: prior.exists ? (prior.get("createdAt") || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await db.collection("users").doc(auth.uid).collection("activity").add({
    type: "login", createdAt: FieldValue.serverTimestamp(), expiresAt: expiryDate(),
    metadata: { termsVersion: TERMS_VERSION }
  });
  return { ok: true, termsVersion: TERMS_VERSION };
});

exports.logActivity = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  await requireTerms(auth.uid);
  const type = String(request.data?.type || "");
  if (!allowedEvents.has(type)) throw new HttpsError("invalid-argument", "Unsupported activity event.");
  const metadataIn = request.data?.metadata && typeof request.data.metadata === "object" ? request.data.metadata : {};
  const metadata = {};
  if (typeof metadataIn.tool === "string" && ["video-studio", "ai-video", "chatbot"].includes(metadataIn.tool)) metadata.tool = metadataIn.tool;
  if (typeof metadataIn.mode === "string" && ["text", "image", "imageText", "local"].includes(metadataIn.mode)) metadata.mode = metadataIn.mode;
  await db.collection("users").doc(auth.uid).collection("activity").add({
    type, createdAt: FieldValue.serverTimestamp(), expiresAt: expiryDate(), metadata
  });
  return { ok: true };
});

exports.chatWithNova = onCall({ region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 60, memory: "256MiB" }, async (request) => {
  const auth = requireAuth(request);
  await requireTerms(auth.uid);
  const message = String(request.data?.message || "").trim();
  if (!message || message.length > 2000) throw new HttpsError("invalid-argument", "Enter a message up to 2,000 characters.");
  const day = new Date().toISOString().slice(0, 10);
  const quotaRef = db.doc("privateRateLimits/" + auth.uid + "_" + day);
  const allowed = await db.runTransaction(async tx => {
    const snap = await tx.get(quotaRef);
    const count = snap.exists ? Number(snap.get("chatCount") || 0) : 0;
    if (count >= 30) return false;
    tx.set(quotaRef, { uid: auth.uid, day, chatCount: count + 1, expiresAt: expiryDate() }, { merge: true });
    return true;
  });
  if (!allowed) throw new HttpsError("resource-exhausted", "Daily chatbot limit reached. Please try again tomorrow.");
  await db.collection("users").doc(auth.uid).collection("activity").add({
    type: "chat_request", createdAt: FieldValue.serverTimestamp(), expiresAt: expiryDate(),
    metadata: { tool: "chatbot" }
  });

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY.value() },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: "You are NOVA Assistant, a helpful guide for the Nova OS community and its video studio. Be honest about limitations, avoid claiming you performed actions you did not perform, and do not request passwords, API keys, or sensitive personal data." }] },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
    })
  });
  if (!response.ok) {
    const status = response.status;
    throw new HttpsError(status === 429 ? "resource-exhausted" : "unavailable", "The AI provider could not answer right now. Try again later.");
  }
  const payload = await response.json();
  const answer = (payload.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
  if (!answer) throw new HttpsError("unavailable", "The AI provider returned an empty response.");
  return { answer };
});
