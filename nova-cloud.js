import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseConfig, SUPABASE_CONFIGURED } from "./supabase-config.js";

const TERMS_VERSION = "2026-10-19";
const $ = (tag, attrs = {}, html = "") => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => k === "class" ? el.className = v : k === "style" ? el.setAttribute("style",v) : el.setAttribute(k,v));
  el.innerHTML = html;
  return el;
};
let supabase, currentUser = null, ready = false, busy = false;
const functionUrl = () => supabaseConfig.url.replace(/\/$/,"") + "/functions/v1/nova-api";
function injectStyles() {
 if (document.getElementById("nova-cloud-style")) return;
 document.head.appendChild($("style",{id:"nova-cloud-style"},`
 .nova-cloud-overlay{position:fixed;inset:0;z-index:99999;background:rgba(4,7,18,.94);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:16px;color:#f4f6ff;font:15px/1.5 system-ui,sans-serif}
 .nova-cloud-card{width:min(620px,100%);max-height:92vh;overflow:auto;background:#11182b;border:1px solid #394565;border-radius:20px;padding:24px;box-shadow:0 25px 90px #0009}.nova-cloud-card h2{margin:0 0 8px;font-size:25px}.nova-cloud-card p,.nova-cloud-card li{color:#c1cbe2}.nova-cloud-card a{color:#b8a8ff}
 .nova-cloud-terms{max-height:34vh;overflow:auto;border:1px solid #34405e;background:#0a1020;border-radius:12px;padding:14px;margin:16px 0}.nova-cloud-check{display:flex;gap:10px;align-items:flex-start;margin:16px 0}.nova-cloud-check input{width:19px;height:19px;flex-shrink:0;margin-top:3px}
 .nova-cloud-btn{border:0;border-radius:11px;padding:12px 16px;background:linear-gradient(100deg,#9a7bff,#66e8f2);color:#09101c;font-weight:800;cursor:pointer}.nova-cloud-btn:disabled{opacity:.45;cursor:not-allowed}.nova-cloud-muted{font-size:12px;color:#a5b1cf}.nova-cloud-error{color:#ffb4b4;min-height:22px}
 .nova-cloud-account{position:fixed;z-index:9990;right:14px;top:14px;display:flex;gap:8px;align-items:center;background:#10182beF;border:1px solid #34405c;border-radius:999px;padding:7px 11px;color:#f4f6ff;font:12px system-ui,sans-serif;max-width:calc(100vw - 28px)}.nova-cloud-account img{width:26px;height:26px;border-radius:50%}.nova-cloud-account button{border:1px solid #4a5573;border-radius:99px;background:#202943;color:#f4f6ff;padding:5px 8px}
 .nova-chat-launch{position:fixed;z-index:9991;right:16px;bottom:16px;border:0;border-radius:99px;padding:14px 18px;background:linear-gradient(100deg,#9a7bff,#66e8f2);color:#09101c;font-weight:850;box-shadow:0 8px 30px #0007}.nova-chat-panel{position:fixed;z-index:9992;right:14px;bottom:78px;width:min(370px,calc(100vw - 28px));height:min(540px,70vh);background:#10182b;border:1px solid #394565;border-radius:18px;display:flex;flex-direction:column;overflow:hidden;color:#f4f6ff;font:14px/1.45 system-ui,sans-serif;box-shadow:0 20px 70px #0009}
 .nova-chat-head{padding:13px 15px;border-bottom:1px solid #34405c;display:flex;justify-content:space-between;align-items:center}.nova-chat-head button{background:none;border:0;color:#fff;font-size:22px}.nova-chat-messages{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}.nova-chat-msg{padding:10px 12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere;max-width:94%}.nova-chat-user{align-self:flex-end;background:#2c2850}.nova-chat-bot{align-self:flex-start;background:#1a2740}.nova-chat-form{display:flex;gap:8px;padding:10px;border-top:1px solid #34405c}.nova-chat-form textarea{flex:1;min-width:0;resize:none;height:58px;background:#080f20;border:1px solid #3a4664;border-radius:10px;padding:8px;color:#fff;font:inherit}.nova-chat-form button{border:0;border-radius:10px;padding:8px 12px;background:#9d8bff;color:#0a1020;font-weight:800}
 .nova-chat-subtitle{font-size:11px;color:#a7b4d1;margin-top:2px}.nova-chat-welcome{margin:auto 0;padding:8px 2px}.nova-chat-welcome>strong{font-size:17px}.nova-chat-welcome p{color:#a7b4d1;font-size:12px}.nova-chat-quick{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.nova-chat-chip{border:1px solid #3b486b;border-radius:99px;background:#151f37;color:#dfe7ff;padding:7px 10px;font-size:11px;cursor:pointer}.nova-chat-field{flex:1;min-width:0}.nova-chat-form{align-items:flex-end}.nova-chat-form textarea{width:100%;display:block}.nova-chat-meta{display:flex;justify-content:space-between;gap:6px;color:#8390ad;font-size:9px;padding:4px 3px 0}.nova-chat-send{align-self:stretch;min-width:68px}.nova-chat-send:disabled{opacity:.55}.nova-chat-pending{opacity:.75}.nova-chat-msg{line-height:1.5;white-space:pre-wrap}
 .nova-cloud-setup{position:fixed;z-index:9998;bottom:14px;left:14px;max-width:min(540px,calc(100vw - 28px));background:#282115;border:1px solid #7d6230;color:#f6e4b8;padding:12px 14px;border-radius:12px;font:12px/1.45 system-ui,sans-serif}.nova-cloud-setup a{color:#fff}`));
}
function showSetupNotice(){document.body.appendChild($("div",{class:"nova-cloud-setup"},'NOVA cloud services need Supabase configuration. Google login, account storage, activity logging and chatbot are not active yet. <a href="https://github.com/NovaOS-original/nova-os-website/blob/main/SUPABASE_SETUP.md">Setup guide</a>'));}
async function api(body){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token) throw new Error("Please sign in again.");
 const response=await fetch(functionUrl(),{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":supabaseConfig.publishableKey},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data.error||"NOVA cloud request failed.");
 return data;
}
function log(type,metadata={}){if(ready) api({action:"log",type,metadata}).catch(()=>{});}
window.novaLogActivity=log;
function openTerms({signedIn=false,error=""}={}){
 document.getElementById("nova-cloud-overlay")?.remove();
 const overlay=$("div",{id:"nova-cloud-overlay",class:"nova-cloud-overlay"});
 const card=$("section",{class:"nova-cloud-card",role:"dialog","aria-modal":"true","aria-labelledby":"nova-cloud-title"});
 card.appendChild($("h2",{id:"nova-cloud-title"},signedIn?"Accept NOVA Terms":"Welcome to NOVA"));
 card.appendChild($("p",{},signedIn?"Review and accept the current terms to unlock the site and cloud features.":"Sign in with Google to use NOVA cloud features. You must accept the Terms & Privacy Notice before accessing the app."));
 card.appendChild($("div",{class:"nova-cloud-terms"},`<h3>Terms & Privacy Notice · Version ${TERMS_VERSION}</h3>
 <p><b>Account data.</b> Supabase stores your account ID, display name, email, profile photo when provided, and terms acceptance timestamp. NOVA never receives or stores your Google password.</p>
 <p><b>Activity logs.</b> NOVA records selected event metadata with timestamps, intended to expire after 90 days. We do not intentionally log every click, keystroke, prompt, full chatbot message, password, or token.</p>
 <p><b>AI processing.</b> Chat messages are sent to Google's Gemini API to answer you; message contents are not stored in NOVA activity logs. Do not submit sensitive or confidential information.</p>
 <p><b>Use and availability.</b> Do not use NOVA for illegal, abusive, infringing, or malicious activity. The service and AI output are experimental and provided without guarantees. Third-party provider terms also apply.</p>
 <p><b>Your choices.</b> You can sign out. Contact maintainers through <a href="https://github.com/NovaOS-original/nova-os-website/issues" target="_blank" rel="noopener">NOVA GitHub issues</a> for data access or deletion requests. Read the <a href="https://github.com/NovaOS-original/nova-os-website/blob/main/TERMS.md" target="_blank" rel="noopener">full Terms & Privacy Notice</a>.</p>`));
 const check=$("input",{type:"checkbox",id:"nova-terms-accept"});
 const label=$("label",{class:"nova-cloud-check",for:"nova-terms-accept"});label.append(check,$("span",{},"I have read and accept the NOVA Terms & Privacy Notice."));card.appendChild(label);
 card.appendChild($("p",{class:"nova-cloud-muted"},"Acceptance is recorded to your account. New terms may require renewed consent."));
 const errorNode=$("p",{class:"nova-cloud-error",role:"status"},error);card.appendChild(errorNode);
 const button=$("button",{class:"nova-cloud-btn",disabled:"disabled"},signedIn?"Accept & Continue":"Accept & Continue with Google");
 check.addEventListener("change",()=>button.disabled=!check.checked||busy);
 button.addEventListener("click",async()=>{
  if(!check.checked||busy)return;busy=true;button.disabled=true;button.textContent="Please wait…";errorNode.textContent="";
  try{
   if(!signedIn){
    sessionStorage.setItem("nova_terms_pending",TERMS_VERSION);
    const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.href,queryParams:{access_type:"offline",prompt:"select_account"}}});
    if(error)throw error;
   }else{
    await api({action:"accept_terms",termsVersion:TERMS_VERSION,accepted:true});
    busy=false;ready=true;overlay.remove();setupAccountAndChat();log("page_view",{tool:pageTool()});
   }
  }catch(e){busy=false;button.disabled=false;button.textContent=signedIn?"Accept & Continue":"Accept & Continue with Google";errorNode.textContent=e?.message||"Could not complete sign-in. Please try again.";}
 });
 card.appendChild(button);overlay.appendChild(card);document.body.appendChild(overlay);
}
function pageTool(){const p=location.pathname;if(p.includes("ai-generator"))return"ai-video";if(p.includes("video-studio"))return"video-studio";return"website";}
function setupAccountAndChat(){
 document.getElementById("nova-cloud-account")?.remove();document.getElementById("nova-chat-launch")?.remove();document.getElementById("nova-chat-panel")?.remove();
 const account=$("div",{id:"nova-cloud-account",class:"nova-cloud-account"});
 const photo=currentUser?.user_metadata?.avatar_url||currentUser?.user_metadata?.picture;if(photo)account.appendChild($("img",{src:photo,alt:""}));
 account.appendChild($("span",{},currentUser?.user_metadata?.full_name||currentUser?.user_metadata?.name||currentUser?.email||"NOVA account"));
 const out=$("button",{type:"button"},"Sign out");out.addEventListener("click",async()=>{log("logout",{tool:pageTool()});await supabase.auth.signOut();});account.appendChild(out);document.body.appendChild(account);
 const launch=$("button",{id:"nova-chat-launch",class:"nova-chat-launch",type:"button"},"✦ Chat with NOVA");
 const panel=$("section",{id:"nova-chat-panel",class:"nova-chat-panel",hidden:"hidden","aria-label":"NOVA chatbot"});
 const head=$("div",{class:"nova-chat-head"},"<div><strong>NOVA Assistant</strong><div class=\"nova-chat-subtitle\">Your NOVA OS & creative tech helper</div></div>");
 const close=$("button",{type:"button","aria-label":"Close chat"},"×");close.addEventListener("click",()=>{panel.hidden=true;launch.focus();});head.appendChild(close);
 const messages=$("div",{class:"nova-chat-messages",id:"nova-chat-messages","aria-live":"polite","aria-relevant":"additions text"});
 const welcome=$("div",{class:"nova-chat-welcome"});
 welcome.appendChild($("strong",{},"What can I help you build?"));
 welcome.appendChild($("p",{},"Ask about NOVA OS, website features, coding, or the Video Studio prototype."));
 const quick=$("div",{class:"nova-chat-quick"});
 [
  ["NOVA OS","Explain the current NOVA OS project and next steps."],
  ["Video Studio","How can I create and export a video in NOVA Video Studio?"],
  ["Build help","Help me debug a coding or GitHub Actions error."]
 ].forEach(([label,prompt])=>{const b=$("button",{type:"button",class:"nova-chat-chip"},label);b.addEventListener("click",()=>{input.value=prompt;form.requestSubmit();});quick.appendChild(b);});
 welcome.appendChild(quick);messages.appendChild(welcome);
 const form=$("form",{class:"nova-chat-form"});
 const field=$("div",{class:"nova-chat-field"});
 const input=$("textarea",{maxlength:"2000",placeholder:"Message NOVA…","aria-label":"Message NOVA","rows":"2"});
 const meta=$("div",{class:"nova-chat-meta"});const count=$("span",{},"0 / 2000");const hint=$("span",{},"Enter to send · Shift+Enter for a new line");meta.append(count,hint);
 field.append(input,meta);
 const send=$("button",{type:"submit",class:"nova-chat-send"},"Send ↗");form.append(field,send);panel.append(head,messages,form);
 const scrollDown=()=>{messages.scrollTop=messages.scrollHeight;};
 const addMessage=(text,kind)=>{const node=$("div",{class:"nova-chat-msg "+(kind==="user"?"nova-chat-user":"nova-chat-bot")});node.textContent=text;messages.appendChild(node);scrollDown();return node;};
 const conversation=[];
 const submitMessage=async()=>{
  const message=input.value.trim();if(!message||send.disabled)return;
  input.value="";count.textContent="0 / 2000";welcome.remove();
  addMessage(message,"user");conversation.push({role:"user",content:message});
  send.disabled=true;send.textContent="Thinking…";input.disabled=true;
  const pending=addMessage("NOVA is thinking…","bot");pending.classList.add("nova-chat-pending");
  try{
   const result=await api({action:"chat",message,history:conversation.slice(-12,-1)});
   pending.textContent=result.answer||"I couldn't generate a reply. Please try again.";pending.classList.remove("nova-chat-pending");
   conversation.push({role:"assistant",content:pending.textContent});
  }catch(e){pending.textContent=e?.message||"Chat is unavailable. Please try again later.";pending.classList.remove("nova-chat-pending");conversation.push({role:"assistant",content:pending.textContent});}
  finally{send.disabled=false;send.textContent="Send ↗";input.disabled=false;input.focus();scrollDown();}
 };
 form.addEventListener("submit",async e=>{e.preventDefault();await submitMessage();});
 input.addEventListener("input",()=>{count.textContent=input.value.length+" / 2000";});
 input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}});
 launch.addEventListener("click",()=>{panel.hidden=!panel.hidden;if(!panel.hidden)input.focus();});
 document.body.append(launch,panel);
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function start(){
 injectStyles();if(!SUPABASE_CONFIGURED){showSetupNotice();return;}
 try{
  supabase=createClient(supabaseConfig.url,supabaseConfig.publishableKey);
  const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;
  currentUser=session?.user||null;
  if(currentUser){
   const {data:profile,error:profileError}=await supabase.from("nova_profiles").select("terms_version,terms_accepted_at").eq("user_id",currentUser.id).maybeSingle();
   if(profileError)throw profileError;
   if(profile?.terms_version===TERMS_VERSION&&profile?.terms_accepted_at){ready=true;setupAccountAndChat();log("page_view",{tool:pageTool()});}
   else if(sessionStorage.getItem("nova_terms_pending")===TERMS_VERSION){openTerms({signedIn:true});}
   else openTerms({signedIn:true});
  }else openTerms({signedIn:false});
  supabase.auth.onAuthStateChange((_event,sessionNow)=>{
   const user=sessionNow?.user||null;
   if(user&&user.id!==currentUser?.id){currentUser=user;ready=false;const pending=sessionStorage.getItem("nova_terms_pending")===TERMS_VERSION;sessionStorage.removeItem("nova_terms_pending");openTerms({signedIn:true,error:pending?"Please confirm acceptance once more to record it to your account.":""});}
   else if(!user){currentUser=null;ready=false;document.getElementById("nova-cloud-account")?.remove();document.getElementById("nova-chat-launch")?.remove();document.getElementById("nova-chat-panel")?.remove();openTerms({signedIn:false});}
  });
  document.addEventListener("click",e=>{const id=e.target?.closest?.("button")?.id;const map={generate:"video_generation_started",export:"video_exported",downloadFrame:"video_exported",random:"video_generation_started"};if(id&&map[id])log(map[id],{tool:pageTool()});});
 }catch(e){showSetupNotice();}
}
start();
