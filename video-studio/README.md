# NOVA Video Studio

A browser-based video creation project hosted as part of the Nova OS website. It now has three routes: browser-native motion graphics with no API, optional hosted AI generation through Hugging Face Inference Providers, and an optional local open-source model runner.

## Open it

- Main studio: `index.html`
- Hosted AI generator: `ai-generator.html`
- Local model setup: `local-engine/README.md`

## Browser-native editor

- Prompt and title input; cinematic, neon, minimal, nature, and bold styles
- Landscape 16:9, portrait 9:16, and square 1:1 layouts
- Animated backgrounds, particles, title motion, preview, timeline scrub
- Poster PNG and browser-native WebM export
- Works without account connections, API keys, or hosted AI inference

This mode creates procedural motion graphics and animated title scenes. It is not a photorealistic text-to-video model and does not claim to outperform Kling or similar services.

## Optional hosted AI generation

The AI generator integrates the Hugging Face JavaScript Inference Client for text-to-video, image-to-video, and image-plus-prompt-to-video task methods. It supports selecting an inference provider and model ID; model/provider compatibility changes over time.

1. Create a Hugging Face user access token with Inference Providers permission.
2. Open `ai-generator.html`, paste the token, choose a mode, and select a compatible model/provider.
3. Upload a starting image for image-to-video modes, then generate and download the result.

**Free tier limitation:** Hugging Face's published pricing currently lists US$0.10/month in inference-provider credits for free users, subject to change. Video inference can use credits quickly, and a provider/model may be unavailable. Do not describe this as unlimited free video generation. Read the [current pricing page](https://huggingface.co/docs/inference-providers/pricing) before use.

**Token safety:** the page does not save the token to local storage or the repository; it is kept in page memory while open and sent directly from the browser to Hugging Face. This is appropriate for personal testing, not a public multi-user production service. Never hard-code a personal token in source code. A production multi-user deployment needs a secure server-side proxy and abuse/cost controls.

## Optional local AI generation

See `local-engine/README.md` for the CogVideoX-2B local runner. It downloads public model weights and needs a compatible Windows/Python/NVIDIA CUDA setup. It avoids paid hosted inference, but is not a no-download or low-hardware option and is not currently connected to the browser's Generate button.

## Compatibility and limitations

- WebM export depends on browser MediaRecorder support; MP4 is not guaranteed by the browser-native editor.
- Hosted output formats, supported options, latency, free credits, and model availability depend on the provider and may change.
- Model licenses and provider terms apply. Review them before commercial use.
