# Supabase setup for NOVA OS

NOVA OS is hosted as a static GitHub Pages site. Supabase provides Google OAuth, Postgres storage with row-level security, and the Edge Function API. The committed client config remains a placeholder until a real project is connected, so the website will not lock visitors out prematurely.

## 1. Connect the Supabase project
1. Open your existing project in https://supabase.com/dashboard.
2. Copy the **Project URL** and the **publishable key** (Settings → API Keys or the project's Connect dialog). Use a publishable key beginning `sb_publishable_` if available; the legacy `anon` key is also supported.
3. Do not use or share the `service_role` or `sb_secret_` key in browser code or GitHub.
4. In Authentication → Providers, enable Google and configure the Google OAuth client ID/secret in Supabase.
5. In Authentication → URL Configuration, add `https://novaos-original.github.io` to Site URL / Redirect URLs. If your GitHub Pages site is served under a repository path, add that exact origin/path pattern too. For local testing, add the exact localhost callback URL.

## 2. Create database tables and policies
Open SQL Editor in your Supabase project and run the contents of `supabase/migrations/202610200001_nova_cloud.sql`. It creates user profiles, activity logs, and private chatbot rate-limit records with row-level security. Users can only read their own profile/activity; the browser cannot directly write activity logs or access rate-limit records.

## 3. Deploy the API Edge Function
In Supabase Dashboard → Edge Functions, create/deploy a function named `nova-api` using the source at `supabase/functions/nova-api/index.ts`. Or use the Supabase CLI from the repository root:
```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy nova-api
supabase secrets set GEMINI_API_KEY=your_gemini_key
```
Run the secrets command locally and do not commit the value. The function also needs the project's default Supabase environment variables, which are provided automatically in hosted Edge Functions. Gemini is optional for login/activity, but required for chatbot responses.

## 4. Activate Google login
Only after the database and function are ready, update `supabase-config.js` with the Project URL and publishable key, then commit that file to GitHub. This turns on the login/terms gate across the site. These two values are public client configuration; no backend secret belongs in this file.

## 5. Verify and retention
- Sign in with Google from Android Chrome and desktop.
- Confirm users must accept the terms before cloud activity/chat requests.
- Confirm one account cannot read another account's rows.
- Test the chatbot limit of 30 requests per user per day.
- Activity rows have `expires_at` timestamps 90 days out. Configure a scheduled cleanup/retention job if you need automatic deletion; the timestamp alone does not delete rows.
- Add Supabase Auth rate limits, CAPTCHA/bot protection and monitor Edge Function logs before broad public rollout.

## Privacy and security notes
- Google passwords are handled by Supabase Auth and never stored by NOVA.
- Chat prompts are sent to Gemini for response generation but are not stored in the activity table.
- The API stores selected event names and limited metadata only, not all clicks, keystrokes or full chat text.
- Never expose a Supabase secret/service-role key or Gemini API key to the browser.
