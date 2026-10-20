# Nova OS Website

Responsive, animated landing page for Nova OS.

## Links
- GitHub: https://github.com/NovaOS-original
- Join the Nova OS Team: https://forms.gle/rGAzMnBBdgNcSPeW9

## Files
- `index.html` — page structure/content
- `style.css` — responsive styling and animations
- `script.js` — interactions, scroll reveals, counters, parallax, navigation and motion
- `nova-cloud.js` — Supabase Google sign-in, consent gate, activity logger and chatbot client

## Supabase cloud features (setup required)

The repository includes a Supabase integration scaffold for Google OAuth, per-user profiles, terms acceptance, privacy-limited activity metadata, and a Gemini-backed NOVA chatbot.

- [Supabase setup and deployment guide](SUPABASE_SETUP.md)
- [Terms & Privacy Notice](TERMS.md)
- [Supabase database schema and RLS policies](supabase/migrations/202610200001_nova_cloud.sql)
- [Authenticated Edge Function API](supabase/functions/nova-api/index.ts)
- [Public client config placeholder](supabase-config.js)

These features remain inactive until the Supabase project URL and publishable key are configured, Google OAuth is enabled, the SQL schema is applied, and the Edge Function is deployed. Store GEMINI_API_KEY only as a server-side Edge Function secret. Never commit Supabase secret/service-role keys. Activity logs contain selected metadata, not full chat messages or prompts.
