# NOVA Video Studio

A free, browser-native motion video creator hosted as part of the Nova OS website. It requires no external API keys, account connections, or paid generation API.

## Run it
Open `index.html` in a modern browser, or publish the containing website through GitHub Pages. The interface is designed to work on mobile and desktop.

## Current features
- Prompt and title input
- Cinematic, neon, minimal, nature, and bold motion styles
- Landscape 16:9, portrait 9:16, and square 1:1 canvas sizes
- Animated backgrounds, particles, title motion, prompt captions, and duration control
- Real-time preview, timeline scrub, poster PNG export
- Browser-native WebM recording using Canvas captureStream and MediaRecorder
- No external API dependency

## Honest scope
This version generates procedural motion graphics and animated title scenes. It is **not** a photorealistic text-to-video model and does not claim to outperform Kling or similar services. High-fidelity generative video requires trained model weights and substantial compute; this project deliberately avoids hosted AI APIs and therefore uses local browser rendering.

MP4 encoding is not guaranteed by every browser; WebM is the supported export target where MediaRecorder is available. Rendering is real-time and performance depends on the device.

## Privacy
Prompts are processed in the page and are not sent to a generation server. No analytics or external API calls are included by the app.
