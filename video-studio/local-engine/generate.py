#!/usr/bin/env python3
"""Generate a text-to-video clip locally with CogVideoX-2B. No hosted inference API."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a short video locally with the public CogVideoX-2B model."
    )
    parser.add_argument("--prompt", required=True, help="Describe the video to generate (English works best).")
    parser.add_argument("--output", default="outputs/nova-generated.mp4", help="Output MP4 path.")
    parser.add_argument("--steps", type=int, default=30, help="Inference steps (more steps take longer).")
    parser.add_argument("--frames", type=int, default=49, help="Number of frames; 49 is a sensible starter.")
    parser.add_argument("--width", type=int, default=720, help="Output width; dimensions should be divisible by 16.")
    parser.add_argument("--height", type=int, default=480, help="Output height; dimensions should be divisible by 16.")
    parser.add_argument("--fps", type=int, default=8, help="Frames per second in the exported file.")
    parser.add_argument("--seed", type=int, default=42, help="Seed for repeatable starting noise.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.prompt.strip():
        print("ERROR: --prompt cannot be empty.", file=sys.stderr)
        return 2
    if args.steps < 1 or args.steps > 100:
        print("ERROR: --steps must be between 1 and 100.", file=sys.stderr)
        return 2
    if args.frames < 9 or args.frames > 81:
        print("ERROR: --frames must be between 9 and 81. Start with 49.", file=sys.stderr)
        return 2
    if args.width < 256 or args.height < 256 or args.width % 16 or args.height % 16:
        print("ERROR: width and height must be at least 256 and divisible by 16.", file=sys.stderr)
        return 2

    try:
        import torch
        from diffusers import CogVideoXPipeline
        from diffusers.utils import export_to_video
    except ImportError as exc:
        print(
            "Missing dependencies. Run setup_windows.bat from this folder, "
            "then activate the .venv and try again. Details: " + str(exc),
            file=sys.stderr,
        )
        return 2

    if not torch.cuda.is_available():
        print(
            "No CUDA-capable NVIDIA GPU was detected. This starter engine targets Windows + NVIDIA GPU. "
            "CPU-only generation is not enabled because it can be impractically slow. "
            "Check NVIDIA drivers and install a CUDA-enabled PyTorch build.",
            file=sys.stderr,
        )
        return 3

    output = Path(args.output).expanduser()
    output.parent.mkdir(parents=True, exist_ok=True)

    print("Loading public model THUDM/CogVideoX-2b.")
    print("The first run downloads several gigabytes of model weights; no API token is needed.")
    print("Loading may take several minutes. Keep the PC plugged in and leave enough free disk space.")

    try:
        pipe = CogVideoXPipeline.from_pretrained(
            "THUDM/CogVideoX-2b",
            torch_dtype=torch.float16,
        )
        # Sequential offload reduces peak VRAM at the cost of speed.
        pipe.enable_sequential_cpu_offload()
        pipe.vae.enable_slicing()
        pipe.vae.enable_tiling()

        generator = torch.Generator(device="cuda").manual_seed(args.seed)
        print("Generating video. This can take a while; progress appears below.")
        result = pipe(
            prompt=args.prompt.strip(),
            num_videos_per_prompt=1,
            num_inference_steps=args.steps,
            num_frames=args.frames,
            guidance_scale=6,
            width=args.width,
            height=args.height,
            generator=generator,
        )
        frames = result.frames[0]
        export_to_video(frames, str(output), fps=args.fps)
        print(f"Done. Video saved to: {output.resolve()}")
        return 0
    except KeyboardInterrupt:
        print("\nGeneration interrupted by user.", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"Generation failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        print(
            "Try closing GPU-heavy apps, lowering --steps, and checking available disk space. "
            "If the error mentions CUDA out of memory, this GPU may not have enough VRAM for the selected setup.",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
