#!/usr/bin/env python3
"""
Dual-Backend Local AI Video Generator (`ComfyUI` + `Diffusers`) for Antigravity Motion Studio.

Supports two execution backends on NVIDIA RTX GPUs (e.g. RTX 4080 12GB VRAM):
1. `comfyui` (or `auto` when ComfyUI server is running on http://127.0.0.1:8188):
   - Executes established ComfyUI API workflows (`workflows/comfyui/wan21_t2v_api.json` for
     Text-to-Video, or `workflows/comfyui/wan21_i2v_api.json` when `--image` is passed for
     Image-to-Video).
   - Supports any custom exported ComfyUI API workflow via `--workflow path/to/workflow_api.json`.
2. `diffusers` (standalone fallback via `Wan-AI/Wan2.1-T2V-1.3B-Diffusers`):
   - Runs directly in Python using `torch.bfloat16` + CPU offload without needing a separate server.

Outputs `public/video/<out>.mp4` and `public/video/<out>-props.json` ready for Remotion (`AiVideoShowcase`).

Usage Examples:
  # 1. Text-to-Video (auto-uses ComfyUI if running on :8188, otherwise Diffusers):
  python scripts/generate_video.py --prompt "Cinematic ocean waves at golden hour, 4k" --out waves

  # 2. Image-to-Video via ComfyUI Wan 2.1 I2V workflow:
  python scripts/generate_video.py --backend comfyui --image docs/previews/step1-setup.png --prompt "Subtle 3D camera push-in with glowing neon reflections" --out step1-motion

  # 3. Custom ComfyUI API Workflow:
  python scripts/generate_video.py --backend comfyui --workflow workflows/comfyui/wan21_t2v_api.json --prompt "..." --out custom-clip
"""

import argparse
import json
import mimetypes
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_T2V_WORKFLOW = ROOT_DIR / "workflows" / "comfyui" / "wan21_t2v_api.json"
DEFAULT_I2V_WORKFLOW = ROOT_DIR / "workflows" / "comfyui" / "wan21_i2v_api.json"

DEFAULT_NEGATIVE_PROMPT = (
    "bright tones, overexposed, static, blurred details, subtitles, style, works, "
    "paintings, images, static, overall gray, worst quality, low quality, JPEG compression "
    "residue, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, "
    "deformed, disfigured, misshapen limbs, fused fingers, still picture, messy background, "
    "three legs, many people in the background, walking backwards"
)


def is_comfyui_running(comfy_url: str) -> bool:
    try:
        req = urllib.request.Request(f"{comfy_url.rstrip('/')}/system_stats", method="GET")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def upload_image_to_comfyui(comfy_url: str, image_path: Path) -> str:
    boundary = f"----AntigravityBoundary{uuid.uuid4().hex}"
    mime_type = mimetypes.guess_type(image_path.name)[0] or "image/png"
    file_bytes = image_path.read_bytes()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{image_path.name}"\r\n'
        f"Content-Type: {mime_type}\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}\r\n" \
        f'Content-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n' \
        f"--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{comfy_url.rstrip('/')}/upload/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        return result.get("name", image_path.name)


def inject_workflow_params(
    workflow: dict,
    prompt: str,
    negative_prompt: str,
    width: int,
    height: int,
    num_frames: int,
    steps: int,
    cfg: float,
    seed: int,
    uploaded_image_name: str | None = None,
) -> dict:
    wf = json.loads(json.dumps(workflow))
    for node in wf.values():
        if not isinstance(node, dict):
            continue
        inputs = node.get("inputs", {})
        class_type = node.get("class_type", "")

        # Inject text prompts
        if inputs.get("text") == "__PROMPT__":
            inputs["text"] = prompt
        elif inputs.get("text") == "__NEGATIVE_PROMPT__":
            inputs["text"] = negative_prompt

        # Inject uploaded source image for Image-to-Video (I2V)
        if uploaded_image_name and (
            inputs.get("image") == "__INPUT_IMAGE__" or class_type == "LoadImage"
        ):
            inputs["image"] = uploaded_image_name

        # Inject video dimensions and frame count
        if class_type in {"EmptyHunyuanLatentVideo", "WanImageToVideo"}:
            inputs["width"] = width
            inputs["height"] = height
            inputs["length"] = num_frames

        # Inject sampler parameters
        if class_type == "KSampler":
            inputs["seed"] = seed
            inputs["steps"] = steps
            inputs["cfg"] = cfg

    return wf


def run_comfyui_workflow(
    comfy_url: str,
    workflow_path: Path,
    prompt: str,
    negative_prompt: str,
    width: int,
    height: int,
    num_frames: int,
    steps: int,
    cfg: float,
    seed: int,
    out_mp4: Path,
    image_path: Path | None = None,
) -> int:
    base_url = comfy_url.rstrip("/")
    uploaded_image = None
    if image_path:
        if not image_path.exists():
            raise FileNotFoundError(f"Input image not found: {image_path}")
        print(f"[comfyui] Uploading source image '{image_path.name}' to {base_url}...")
        uploaded_image = upload_image_to_comfyui(base_url, image_path)

    raw_workflow = json.loads(workflow_path.read_text(encoding="utf-8"))
    prompt_graph = inject_workflow_params(
        raw_workflow,
        prompt=prompt,
        negative_prompt=negative_prompt,
        width=width,
        height=height,
        num_frames=num_frames,
        steps=steps,
        cfg=cfg,
        seed=seed,
        uploaded_image_name=uploaded_image,
    )

    client_id = str(uuid.uuid4())
    payload = json.dumps({"prompt": prompt_graph, "client_id": client_id}).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        queued = json.loads(resp.read().decode("utf-8"))
        prompt_id = queued["prompt_id"]

    print(
        f"[comfyui] Queued workflow '{workflow_path.name}' (prompt_id={prompt_id}, {width}x{height}, {num_frames} frames)..."
    )

    # Poll /history/<prompt_id> until execution completes
    while True:
        time.sleep(2.0)
        hist_req = urllib.request.Request(f"{base_url}/history/{prompt_id}", method="GET")
        with urllib.request.urlopen(hist_req, timeout=15) as resp:
            history = json.loads(resp.read().decode("utf-8"))
        if prompt_id in history:
            entry = history[prompt_id]
            outputs = entry.get("outputs", {})
            for node_output in outputs.values():
                for key in ("gifs", "videos", "images"):
                    items = node_output.get(key, [])
                    for item in items:
                        filename = item.get("filename", "")
                        if filename.endswith((".mp4", ".webm", ".webp", ".gif")):
                            params = urllib.parse.urlencode(
                                {
                                    "filename": filename,
                                    "subfolder": item.get("subfolder", ""),
                                    "type": item.get("type", "output"),
                                }
                            )
                            dl_url = f"{base_url}/view?{params}"
                            urllib.request.urlretrieve(dl_url, str(out_mp4))
                            return 16
            raise RuntimeError(
                f"ComfyUI workflow finished but no video output was found in history: {outputs}"
            )


def run_diffusers_pipeline(
    prompt: str,
    negative_prompt: str,
    width: int,
    height: int,
    num_frames: int,
    steps: int,
    cfg: float,
    seed: int,
    out_mp4: Path,
) -> int:
    import torch
    from diffusers import AutoencoderKLWan, WanPipeline
    from diffusers.utils import export_to_video

    if not torch.cuda.is_available():
        raise RuntimeError(
            "CUDA GPU not detected by PyTorch. Make sure PyTorch with CUDA is installed."
        )

    gpu_name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    print(f"[wan2.1-diffusers] GPU: {gpu_name} ({vram_gb:.1f} GB VRAM)")

    model_id = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
    print(f"[wan2.1-diffusers] Loading '{model_id}'...")

    vae = AutoencoderKLWan.from_pretrained(
        model_id, subfolder="vae", torch_dtype=torch.float32
    )
    pipe = WanPipeline.from_pretrained(
        model_id, vae=vae, torch_dtype=torch.bfloat16
    )
    pipe.enable_model_cpu_offload()
    if hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

    fps = 16
    print(
        f"[wan2.1-diffusers] Generating {num_frames} frames at {width}x{height} ({steps} steps, seed={seed})..."
    )
    generator = torch.Generator(device="cuda").manual_seed(seed)

    output = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        height=height,
        width=width,
        num_frames=num_frames,
        guidance_scale=cfg,
        num_inference_steps=steps,
        generator=generator,
    ).frames[0]

    export_to_video(output, str(out_mp4), fps=fps)
    return fps


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate local AI video via ComfyUI Wan 2.1 workflows (T2V & I2V) or Diffusers"
    )
    parser.add_argument(
        "--backend",
        choices=["auto", "comfyui", "diffusers"],
        default="auto",
        help="Execution backend: 'comfyui' (established T2V/I2V workflows), 'diffusers', or 'auto' (default)",
    )
    parser.add_argument(
        "--comfy-url",
        type=str,
        default="http://127.0.0.1:8188",
        help="ComfyUI server URL (default: http://127.0.0.1:8188)",
    )
    parser.add_argument(
        "--workflow",
        type=str,
        default=None,
        help="Optional custom ComfyUI API workflow JSON (defaults to wan21_t2v_api.json or wan21_i2v_api.json)",
    )
    parser.add_argument(
        "--image",
        type=str,
        default=None,
        help="Optional input still image for Wan 2.1 Image-to-Video (I2V) generation via ComfyUI",
    )
    parser.add_argument(
        "--prompt",
        type=str,
        required=True,
        help="Detailed visual prompt for the video scene",
    )
    parser.add_argument(
        "--negative-prompt",
        type=str,
        default=DEFAULT_NEGATIVE_PROMPT,
        help="Negative prompt to avoid artifacts",
    )
    parser.add_argument(
        "--aspect",
        choices=["16:9", "9:16"],
        default="16:9",
        help="Aspect ratio: '16:9' (832x480) or '9:16' (480x832)",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=49,
        help="Number of frames to generate (must be 4k+1, e.g. 33, 49, 81; default 49 = ~3.1s at 16fps)",
    )
    parser.add_argument(
        "--steps",
        type=int,
        default=28,
        help="Denoising inference steps (default: 28)",
    )
    parser.add_argument(
        "--guidance-scale",
        type=float,
        default=5.5,
        help="Classifier-free guidance scale (default: 5.5)",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument(
        "--fps-upsample",
        type=int,
        default=0,
        help="Optional target FPS (e.g. 32 or 60) using optical-flow frame interpolation",
    )
    parser.add_argument("--out", type=str, default="ai-clip", help="Base filename in public/video/")
    args = parser.parse_args()

    width, height = (832, 480) if args.aspect == "16:9" else (480, 832)
    num_frames = ((args.frames - 1) // 4) * 4 + 1

    video_dir = Path("public/video")
    video_dir.mkdir(parents=True, exist_ok=True)
    out_mp4 = video_dir / f"{args.out}.mp4"

    # Resolve backend
    backend = args.backend
    if backend == "auto":
        if args.image or args.workflow or is_comfyui_running(args.comfy_url):
            backend = "comfyui"
        else:
            backend = "diffusers"

    t0 = time.time()
    if backend == "comfyui":
        if not is_comfyui_running(args.comfy_url):
            raise RuntimeError(
                f"ComfyUI server is not reachable at {args.comfy_url}. "
                f"Start it first with `npm run comfy:serve` (or `python scripts/setup_comfyui.py --serve`), "
                f"or pass `--backend diffusers`."
            )
        image_path = Path(args.image) if args.image else None
        if args.workflow:
            wf_path = Path(args.workflow)
        else:
            wf_path = DEFAULT_I2V_WORKFLOW if image_path else DEFAULT_T2V_WORKFLOW

        fps = run_comfyui_workflow(
            comfy_url=args.comfy_url,
            workflow_path=wf_path,
            prompt=args.prompt,
            negative_prompt=args.negative_prompt,
            width=width,
            height=height,
            num_frames=num_frames,
            steps=args.steps,
            cfg=args.guidance_scale,
            seed=args.seed,
            out_mp4=out_mp4,
            image_path=image_path,
        )
    else:
        fps = run_diffusers_pipeline(
            prompt=args.prompt,
            negative_prompt=args.negative_prompt,
            width=width,
            height=height,
            num_frames=num_frames,
            steps=args.steps,
            cfg=args.guidance_scale,
            seed=args.seed,
            out_mp4=out_mp4,
        )

    elapsed = time.time() - t0

    if args.fps_upsample and args.fps_upsample > fps:
        import imageio_ffmpeg

        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        interp_mp4 = video_dir / f"{args.out}.{args.fps_upsample}fps.mp4"
        print(
            f"[wan2.1] Optical-flow interpolating {fps}fps -> {args.fps_upsample}fps..."
        )
        subprocess.run(
            [
                ffmpeg_exe,
                "-y",
                "-i",
                str(out_mp4),
                "-vf",
                f"minterpolate=fps={args.fps_upsample}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                str(interp_mp4),
            ],
            check=True,
        )
        interp_mp4.replace(out_mp4)
        fps = args.fps_upsample

    duration_sec = round(num_frames / float(fps), 3)
    props_path = video_dir / f"{args.out}-props.json"
    props_data = {
        "videoFile": f"video/{args.out}.mp4",
        "durationSec": duration_sec,
        "width": width,
        "height": height,
        "prompt": args.prompt,
        "backend": backend,
    }
    props_path.write_text(json.dumps(props_data, indent=2), encoding="utf-8")

    print(f"[wan2.1] Done in {elapsed:.1f}s via '{backend}' backend!")
    print(f"[wan2.1] Saved video: {out_mp4} ({duration_sec}s @ {fps}fps)")
    print(f"[wan2.1] Saved Remotion props: {props_path}")


if __name__ == "__main__":
    main()
