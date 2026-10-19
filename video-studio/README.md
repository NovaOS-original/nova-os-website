# NOVA Video Studio

A browser-based video creation project hosted as part of the Nova OS website. It has three routes: browser-native motion graphics, free public hosted AI video generation without a user API token, and an optional local open-source model runner.

## Open it

- Main studio: `index.html`
- Free AI generator: `ai-generator.html`
- Local model setup: `local-engine/README.md`

## Browser-native editor

- Prompt and title input; cinematic, neon, minimal, nature, and bold styles
- Landscape 16:9, portrait 9:16, and square 1:1 layouts
- Animated backgrounds, particles, title motion, preview, timeline scrub
- Poster PNG and browser-native WebM export
- Works without account connections, API keys, or hosted AI inference

This mode creates procedural motion graphics and animated title scenes. It is not a photorealistic text-to-video model.

## Free hosted AI generation (no user token)

The AI generator calls a public LTX Video Gradio API hosted on Hugging Face Spaces. It supports text-to-video and image-to-video from the browser, without requiring a separate video-provider account, API token, provider connection, or payment details. If NOVA Firebase cloud accounts are configured, Google sign-in and acceptance of the current terms are required to use the site.

1. Open `ai-generator.html`.
2. Choose Text → Video or Image → Video.
3. Describe the scene/motion, optionally upload a starting picture, and press Generate.
4. Wait for the shared public GPU queue, then preview or download the MP4.

**Important limitations:** this uses a third-party community demo and shared free compute. It may queue slowly, be rate-limited, sleep, change its API, or go offline. Free public access is not a guarantee of unlimited or uninterrupted generations. Images are sent to the public service for processing; do not upload private or sensitive material. The site does not store an API token because none is required.

The integration is based on the public [Lightricks LTX Video Space](https://huggingface.co/spaces/Lightricks/ltx-video-distilled) and Hugging Face's [Spaces API documentation](https://huggingface.co/docs/hub/en/spaces-api-endpoints). If that Space changes its endpoint schema, the integration may need updating.

## Optional local AI generation

See `local-engine/README.md` for the CogVideoX-2B local runner. It downloads public model weights and needs a compatible Windows/Python/NVIDIA CUDA setup. It avoids paid hosted inference, but is not a no-download or low-hardware option and is not currently connected to the browser's Generate button.

## Compatibility and limitations

- WebM export depends on browser MediaRecorder support; MP4 is not guaranteed by the browser-native editor.
- Hosted output formats, latency, shared free quota, and model availability depend on the third-party demo and may change.
- Model licenses and provider terms apply. Review them before commercial use.
