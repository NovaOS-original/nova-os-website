#!/usr/bin/env node
import { createReadStream, statSync } from "node:fs";
import { basename } from "node:path";
import { createHash } from "node:crypto";

const endpoint = process.env.SOCIAL_MEDIA_INGEST_URL;
const token = process.env.MEDIA_INGEST_TOKEN;
const filePath = process.argv[2];
const platform = process.argv[3] ?? "shared";
const caption = process.argv.slice(4).join(" ");

if (!endpoint || !token || !filePath) {
  console.error("Usage: SOCIAL_MEDIA_INGEST_URL=... MEDIA_INGEST_TOKEN=... node scripts/upload-social-media.mjs <file> [tiktok|instagram|youtube|shared] [caption]");
  process.exit(2);
}
const size = statSync(filePath).size;
if (size < 1 || size > 100 * 1024 * 1024) throw new Error("File must be between 1 byte and 100 MB");
const bytes = await (await import("node:fs/promises")).readFile(filePath);
const mimeByExt = { jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", webp:"image/webp", mp4:"video/mp4", webm:"video/webm" };
const ext = basename(filePath).split(".").pop()?.toLowerCase() ?? "";
const mime = mimeByExt[ext];
if (!mime) throw new Error("Supported formats: JPG, PNG, WEBP, MP4, WEBM");
const form = new FormData();
form.set("file", new Blob([bytes], { type: mime }), basename(filePath));
form.set("platform", platform);
form.set("content_type", mime.startsWith("video/") ? "video" : "image");
form.set("caption", caption);
const response = await fetch(endpoint, { method:"POST", headers:{ "x-media-ingest-token":token }, body:form });
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(result.error ?? `Upload failed (${response.status})`);
console.log(JSON.stringify(result, null, 2));
