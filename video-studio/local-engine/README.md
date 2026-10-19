# NOVA Video Studio — Local AI Engine

This folder adds a **local text-to-video generation path** alongside the static browser motion-graphics editor. It uses the public CogVideoX-2B model through Hugging Face Diffusers. Inference runs on your own Windows PC; this project does not call a paid/hosted video-generation API and does not require an API key.

## Hardware and storage

- Windows 10/11 and Python 3.10–3.12 (Python 3.11 is the recommended starting point).
- NVIDIA GPU with CUDA-capable drivers. CogVideoX is memory-intensive; sequential CPU offload and VAE slicing/tiling are enabled, but usable speed and compatibility depend on the GPU and RAM.
- A stable internet connection for the first model download, then enough disk space to cache the weights and Python dependencies. Plan for tens of gigabytes of free space.
- CPU-only generation is not enabled in this starter because it may be impractically slow. Android browsers cannot run this Python engine directly; use the existing browser motion-graphics editor on Android.

Official CogVideoX documentation lists substantially different memory needs by precision and optimization, and model compatibility changes over time. Check the official docs before installing: https://huggingface.co/docs/diffusers/en/api/pipelines/cogvideox

## Setup on Windows

1. Install Python 3.11 and up-to-date NVIDIA drivers.
2. Open this folder in File Explorer and run `setup_windows.bat`. It creates the `.venv` environment and prints the remaining install steps.
3. In a terminal opened in this folder, activate the environment:

   `\.venv\\Scripts\\Activate.ps1`

4. Use the official [PyTorch install selector](https://pytorch.org/get-started/locally/) to install a CUDA-enabled PyTorch build **inside the activated `.venv`**. Follow its Windows + Pip + Python + CUDA options.
5. Install the remaining packages:

   ```powershell
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

5. Generate your first clip:

   ```powershell
   python generate.py --prompt "A cinematic aerial shot over a futuristic city at sunset, volumetric light, smooth camera movement"
   ```

The first run downloads the model weights automatically from the public model repository. No account token is required for this public checkpoint. The initial download can take a long time.

## Options

```powershell
python generate.py --prompt "A lone astronaut walking across a red desert" --output outputs/astronaut.mp4 --steps 30 --frames 49 --seed 7
```

- `--steps`: inference steps (more may improve results but take longer).
- `--frames`: 49 is the recommended starter; longer clips cost more memory and time.
- `--width` / `--height`: dimensions must be divisible by 16.
- `--fps`: playback frame rate of the exported MP4.
- `--seed`: reproducibility helper; identical output is not guaranteed across hardware/software versions.

## What is and isn't connected

This is a command-line local model runner, **not yet wired as a button in the GitHub Pages website**. A static GitHub Pages site cannot execute Python or access your PC's GPU. Connecting the webpage to a local runner would require a separately running local service and explicit browser permissions, so that integration is a later milestone. The hosted website continues to provide browser-native motion graphics without any local setup.

## Safety, licensing, and limitations

- Read the CogVideoX model license and acceptable-use terms before using or redistributing generated content: https://huggingface.co/THUDM/CogVideoX-2b
- Model quality is not guaranteed to match or outperform Kling or any other commercial system.
- Generated video may contain artifacts, inconsistent motion, or inaccurate details. Review clips before publishing.
- This software downloads model weights from the public Hugging Face model host. That is a file download, not a hosted inference API call.
