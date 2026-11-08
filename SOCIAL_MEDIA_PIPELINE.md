# NOVA OS Social Media Media Pipeline

This pipeline stores finished social assets in the existing NOVA Supabase project and returns public CDN URLs that Metricool can attach to scheduled posts.

## Architecture

1. A renderer/creator produces an image or MP4.
2. The producer sends the binary file as multipart form data to the `social-media-ingest` Edge Function.
3. The function authenticates with a dedicated ingest token, validates MIME type and size, calculates SHA-256, stores the file in the `social-media-published` bucket, and records metadata in `public.social_media_assets`.
4. The returned `asset.publicUrl` is supplied to Metricool's post media list.
5. Metricool schedules or publishes using the existing connected brand.

## Existing infrastructure

- Supabase project: `Nova` (`xtchvetdluriblzyknhp`, `eu-west-1`)
- GitHub repository: `NovaOS-original/nova-os-website`
- Metricool brand ID: `7961723`
- Brand timezone: `Africa/Accra`
- Platforms: TikTok `@everything_some4`, Instagram `@thereal_sketchies`, YouTube NOVA OS

## Required one-time secret setup

The Edge Function is deployed, but uploads intentionally fail closed until its dedicated token is configured.

1. Generate a random secret with at least 32 random bytes (for example, `openssl rand -hex 32`).
2. In Supabase Dashboard → Edge Functions → Secrets, add:
   - `MEDIA_INGEST_TOKEN` = the generated random secret.
3. Keep this value in the trusted renderer/automation environment only. Never put it in browser JavaScript or commit it to Git.
4. Set `SOCIAL_MEDIA_INGEST_URL` to `https://xtchvetdluriblzyknhp.supabase.co/functions/v1/social-media-ingest` and `MEDIA_INGEST_TOKEN` to the same secret in the trusted uploader environment.

The function uses the built-in Supabase service-role environment variable only server-side. The token is separate from Metricool credentials.

## Upload from a trusted Node 20+ worker

```bash
SOCIAL_MEDIA_INGEST_URL="https://xtchvetdluriblzyknhp.supabase.co/functions/v1/social-media-ingest" \
MEDIA_INGEST_TOKEN="YOUR_SERVER_SIDE_TOKEN" \
node scripts/upload-social-media.mjs ./rendered/football-reel.mp4 tiktok "Matchday predictions"
```

The JSON response includes a `publicUrl`. Pass that URL as a media item to Metricool's create-scheduled-post call. For Instagram Reels and YouTube Shorts, upload an MP4. TikTok and Instagram image posts can use JPG/PNG/WEBP.

## Security and operational rules

- The bucket is public-read because social platforms must fetch media from a public URL. It has no anonymous upload policy; writes go through the authenticated Edge Function.
- The asset metadata table has RLS enabled and no anon/authenticated grants.
- The ingest endpoint rejects requests without the dedicated token, rejects unsupported MIME types, caps files at 100 MB, and uses random object names.
- Never upload private user data, drafts containing personal information, or source project files to the public bucket.
- Keep platform captions and factual source links in the publishing job record or automation context, not in public filenames.
- Track Metricool confirmation separately from upload success. An uploaded asset is not proof that a post was scheduled or published.

## Current boundary

This deploys the secure media-ingest/storage bridge and an uploader client. It does not itself generate video, invoke Metricool, or create a post. The trusted renderer still needs to produce the media file, and the publishing orchestrator must call Metricool with the returned public URL. The ChatGPT Metricool connector remains the publishing path in this workflow; it is not callable from a Supabase Edge Function.
