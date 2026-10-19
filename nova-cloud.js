import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithRedirect, getRedirectResult, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-functions.js";
import { firebaseConfig, FIREBASE_CONFIGURED } from "./firebase-config.js";

const TERMS_VERSION = "2026-10-19";
const $ = (tag, attrs = {}, html = "") => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => k === "class" ? el.className = v : k === "style" ? el.setAttribute("style", v) : el.setAttribute(k, v));
  el.innerHTML = html;
  return el;
};
let auth, functions, currentUser = null, ready = false, busy = false;
let sessionCall, acceptCall, logCall, chatCall;

function injectStyles() {
  if (document.getElementById("nova-cloud-style")) return;
  document.head.appendChild($("style", { id: "nova-cloud-style" }, `
    .nova-cloud-overlay{position:fixed;inset:0;z-index:99999;background:rgba(4,7,18,.94);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:16px;color:#f4f6ff;font:15px/1.5 system-ui,sans-serif}
    .nova-cloud-card{width:min(620px,100%);max-height:92vh;overflow:auto;background:#11182b;border:1px solid #394565;border-radius:20px;padding:24px;box-shadow:0 25px 90px #0009}
    .nova-cloud-card h2{margin:0 0 8px;font-size:25px}.nova-cloud-card p,.nova-cloud-card li{color:#c1cbe2}.nova-cloud-card a{color:#b8a8ff}
    .nova-cloud-terms{max-height:34vh;overflow:auto;border:1px solid #34405e;background:#0a1020;border-radius:12px;padding:14px;margin:16px 0}
    .nova-cloud-check{display:flex;gap:10px;align-items:flex-start;margin:16px 0}.nova-cloud-check input{width:19px;height:19px;flex-shrink:0;margin-top:3px}
    .nova-cloud-btn{border:0;border-radius:11px;padding:12px 16px;background:linear-gradient(100deg,#9a7bff,#66e8f2);color:#09101c;font-weight:800;cursor:pointer}.nova-cloud-btn:disabled{opacity:.45;cursor:not-allowed}
    .nova-cloud-muted{font-size:12px;color:#a5b1cf}.nova-cloud-error{color:#ffb4b4;min-height:22px}
    .nova-cloud-account{position:fixed;z-index:9990;right:14px;top:14px;display:flex;gap:8px;align-items:center;background:#10182beF;border:1px solid #34405c;border-radius:999px;padding:7px 11px;color:#f4f6ff;font:12px system-ui,sans-serif;max-width:calc(100vw - 28px)}
    .nova-cloud-account img{width:26px;height:26px;border-radius:50%}.nova-cloud-account button{border:1px solid #4a5573;border-radius:99px;background:#202943;color:#f4f6ff;padding:5px 8px}
    .nova-chat-launch{position:fixed;z-index:9991;right:16px;bottom:16px;border:0;border-radius:99px;padding:14px 18px;background:linear-gradient(100deg,#9a7bff,#66e8f2);color:#09101c;font-weight:850;box-shadow:0 8px 30px #0007}
    .nova-chat-panel{position:fixed;z-index:9992;right:14px;bottom:78px;width:min(370px,calc(100vw - 28px));height:min(540px,70vh);background:#10182b;border:1px solid #394565;border-radius:18px;display:flex;flex-direction:column;overflow:hidden;color:#f4f6ff;font:14px/1.45 system-ui,sans-serif;box-shadow:0 20px 70px #0009}
    .nova-chat-head{padding:13px 15px;border-bottom:1px solid #34405c;display:flex;justify-content:space-between;align-items:center}.nova-chat-head button{background:none;border:0;color:#fff;font-size:22px}
    .nova-chat-messages{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}.nova-chat-msg{padding:10px 12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere;max-width:94%}.nova-chat-user{align-self:flex-end;background:#2c2850}.nova-chat-bot{align-self:flex-start;background:#1a2740}.nova-chat-form{display:flex;gap:8px;padding:10px;border-top:1px solid #34405c}.nova-chat-form textarea{flex:1;min-width:0;resize:none;height:58px;background:#080f20;border:1px solid #3a4664;border-radius:10px;padding:8px;color:#fff;font:inherit}.nova-chat-form button{border:0;border-radius:10px;padding:8px 12px;background:#9d8bff;color:#0a1020;font-weight:800}
    .nova-cloud-setup{position:fixed;z-index:9998;bottom:14px;left:14px;max-width:min(540px,calc(100vw - 28px));background:#282115;border:1px solid #7d6230;color:#f6e4b8;padding:12px 14px;border-radius:12px;font:12px/1.45 system-ui,sans-serif}.nova-cloud-setup a{color:#fff}
  `));
}
function showSetupNotice() {
  const n = $("div", { class: "nova-cloud-setup" }, 'NOVA cloud services are not configured yet. Google sign-in, account storage, activity logging and chatbot require Firebase setup. <a href="FIREBASE_SETUP.md">Setup guide</a>');
  document.body.appendChild(n);
}
function log(type, metadata = {}) {
  if (!ready || !logCall) return;
  logCall({ type, metadata }).catch(() => {});
}
function openTerms({ signedIn = false, error = "" } = {}) {
  document.getElementById("nova-cloud-overlay")?.remove();
  const overlay = $("div", { id: "nova-cloud-overlay", class: "nova-cloud-overlay" });
  const card = $("section", { class: "nova-cloud-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "nova-cloud-title" });
  card.appendChild($("h2", { id: "nova-cloud-title" }, signedIn ? "Accept NOVA Terms" : "Welcome to NOVA"));
  card.appendChild($("p", {}, signedIn ? "Review and accept the current terms to unlock the site and cloud features." : "Sign in with Google to use NOVA cloud features. You must accept the Terms & Privacy Notice before accessing the app."));
  card.appendChild($("div", { class: "nova-cloud-terms" }, `
    <h3>Terms & Privacy Notice · Version ${TERMS_VERSION}</h3>
    <p><b>Account data.</b> Firebase stores your Google account ID, display name, email, profile photo URL when provided, and acceptance timestamp. NOVA never receives or stores your Google password.</p>
    <p><b>Activity logs.</b> NOVA records limited event metadata (such as page views, video generation events, and chatbot requests) with a timestamp. We do not intentionally log every click, keystroke, prompt, full chatbot message, password, or token. Activity logs are intended to expire after 90 days once the documented Firestore TTL policy is enabled.</p>
    <p><b>AI processing.</b> Prompts and uploaded images may be sent to third-party AI providers to generate results. Chat messages are sent to Google's Gemini API to answer you; message contents are not intentionally stored in NOVA activity logs. Do not submit sensitive or confidential information.</p>
    <p><b>Use and availability.</b> Do not use NOVA for illegal, abusive, infringing, or malicious activity. The service and AI output are experimental and provided without guarantees of accuracy or uninterrupted availability. Third-party provider terms also apply.</p>
    <p><b>Your choices.</b> You can sign out. Contact the maintainers via the <a href="https://github.com/NovaOS-original/nova-os-website/issues" target="_blank" rel="noopener">NOVA GitHub issues</a> for data access or deletion requests. Read the <a href="TERMS.md" target="_blank" rel="noopener">full Terms & Privacy Notice</a>.</p>
  `));
  const check = $("input", { type: "checkbox", id: "nova-terms-accept" });
  const label = $("label", { class: "nova-cloud-check", for: "nova-terms-accept" });
  label.append(check, $("span", {}, "I have read and accept the NOVA Terms & Privacy Notice."));
  card.appendChild(label);
  card.appendChild($("p", { class: "nova-cloud-muted" }, "This consent is recorded to your account. Accepting a new terms version may be required after updates."));
  const errorNode = $("p", { class: "nova-cloud-error", role: "status" }, error);
  card.appendChild(errorNode);
  const button = $("button", { class: "nova-cloud-btn", disabled: "disabled" }, signedIn ? "Accept & Continue" : "Accept & Continue with Google");
  check.addEventListener("change", () => { button.disabled = !check.checked || busy; });
  button.addEventListener("click", async () => {
    if (!check.checked || busy) return;
    busy = true; button.disabled = true; button.textContent = "Please wait…"; errorNode.textContent = "";
    try {
      localStorage.setItem("nova_terms_pending", TERMS_VERSION);
      if (!signedIn) {
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } else {
        await acceptCall({ accepted: true, termsVersion: TERMS_VERSION });
        localStorage.removeItem("nova_terms_pending");
        ready = true;
        overlay.remove();
        setupAccountAndChat();
        log("page_view", { tool: pageTool() });
      }
    } catch (e) {
      busy = false; button.disabled = false; button.textContent = signedIn ? "Accept & Continue" : "Accept & Continue with Google";
      errorNode.textContent = e?.message || "Could not complete sign-in. Please try again.";
    }
  });
  card.appendChild(button);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
function pageTool() {
  const p = location.pathname;
  if (p.includes("ai-generator")) return "ai-video";
  if (p.includes("video-studio")) return "video-studio";
  return "website";
}
function setupAccountAndChat() {
  document.getElementById("nova-cloud-account")?.remove();
  document.getElementById("nova-chat-launch")?.remove();
  document.getElementById("nova-chat-panel")?.remove();
  const account = $("div", { id: "nova-cloud-account", class: "nova-cloud-account" });
  if (currentUser?.photoURL) account.appendChild($("img", { src: currentUser.photoURL, alt: "" }));
  account.appendChild($("span", {}, currentUser?.displayName || currentUser?.email || "NOVA account"));
  const out = $("button", { type: "button" }, "Sign out");
  out.addEventListener("click", async () => { log("logout", { tool: pageTool() }); await signOut(auth); });
  account.appendChild(out); document.body.appendChild(account);

  const launch = $("button", { id: "nova-chat-launch", class: "nova-chat-launch", type: "button" }, "✦ Chat with NOVA");
  const panel = $("section", { id: "nova-chat-panel", class: "nova-chat-panel", hidden: "hidden", "aria-label": "NOVA chatbot" });
  const head = $("div", { class: "nova-chat-head" }, "<strong>NOVA Assistant</strong>");
  const close = $("button", { type: "button", "aria-label": "Close chat" }, "×");
  close.addEventListener("click", () => panel.hidden = true); head.appendChild(close);
  const messages = $("div", { class: "nova-chat-messages", id: "nova-chat-messages", "aria-live": "polite" });
  messages.appendChild($("div", { class: "nova-chat-msg nova-chat-bot" }, "Hi! I'm NOVA Assistant. Ask me about Nova OS, the website, or Video Studio."));
  const form = $("form", { class: "nova-chat-form" });
  const input = $("textarea", { maxlength: "2000", placeholder: "Ask NOVA…", "aria-label": "Message" });
  const send = $("button", { type: "submit" }, "Send");
  form.append(input, send); panel.append(head, messages, form);
  launch.addEventListener("click", () => { panel.hidden = !panel.hidden; input.focus(); });
  form.addEventListener("submit", async e => {
    e.preventDefault(); const message = input.value.trim(); if (!message || send.disabled) return;
    messages.appendChild($("div", { class: "nova-chat-msg nova-chat-user" }, escapeHtml(message)));
    input.value = ""; send.disabled = true; send.textContent = "…";
    const pending = $("div", { class: "nova-chat-msg nova-chat-bot" }, "Thinking…"); messages.appendChild(pending); messages.scrollTop = messages.scrollHeight;
    try {
      const result = await chatCall({ message });
      pending.textContent = result.data?.answer || "I couldn't generate a reply. Please try again.";
    } catch (e) { pending.textContent = e?.message || "Chat is unavailable. Please try again later."; }
    finally { send.disabled = false; send.textContent = "Send"; messages.scrollTop = messages.scrollHeight; }
  });
  document.body.append(launch, panel);
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
async function start() {
  injectStyles();
  if (!FIREBASE_CONFIGURED) { showSetupNotice(); return; }
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    functions = getFunctions(app, "us-central1");
    sessionCall = httpsCallable(functions, "getSession");
    acceptCall = httpsCallable(functions, "acceptTerms");
    logCall = httpsCallable(functions, "logActivity");
    chatCall = httpsCallable(functions, "chatWithNova");
    await getRedirectResult(auth).catch(() => null);
    onAuthStateChanged(auth, async user => {
      currentUser = user; ready = false;
      if (!user) {
        document.getElementById("nova-cloud-account")?.remove();
        document.getElementById("nova-chat-launch")?.remove();
        document.getElementById("nova-chat-panel")?.remove();
        openTerms({ signedIn: false });
        return;
      }
      try {
        const result = await sessionCall();
        if (result.data?.termsAccepted && result.data?.termsVersion === TERMS_VERSION) {
          ready = true; document.getElementById("nova-cloud-overlay")?.remove();
          setupAccountAndChat(); log("page_view", { tool: pageTool() });
        } else if (localStorage.getItem("nova_terms_pending") === TERMS_VERSION) {
          await acceptCall({ accepted: true, termsVersion: TERMS_VERSION });
          localStorage.removeItem("nova_terms_pending");
          ready = true; document.getElementById("nova-cloud-overlay")?.remove();
          setupAccountAndChat(); log("page_view", { tool: pageTool() });
        } else {
          openTerms({ signedIn: true });
        }
      } catch (e) {
        openTerms({ signedIn: true, error: "Could not verify your account or terms acceptance. Please retry. " + (e?.message || "") });
      }
    });
    document.addEventListener("click", e => {
      const id = e.target?.closest?.("button")?.id;
      const map = { generate: "video_generation_started", export: "video_exported", downloadFrame: "video_exported", random: "video_generation_started" };
      if (id && map[id]) log(map[id], { tool: pageTool() });
    });
  } catch (e) {
    showSetupNotice();
  }
}
start();
