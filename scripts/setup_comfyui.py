#!/usr/bin/env python3
"""
Install and/or launch a local ComfyUI engine (`vendor/ComfyUI`) configured for
Wan 2.1 Text-to-Video (T2V) and Image-to-Video (I2V) workflows.

Usage:
  # Install ComfyUI + VideoHelperSuite custom nodes into vendor/ComfyUI:
  python scripts/setup_comfyui.py

  # Launch headless ComfyUI API server on http://127.0.0.1:8188:
  python scripts/setup_comfyui.py --serve
"""

import argparse
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
COMFY_DIR = ROOT_DIR / "vendor" / "ComfyUI"
CUSTOM_NODES_DIR = COMFY_DIR / "custom_nodes"


def run_cmd(cmd: list[str], cwd: Path | None = None) -> None:
    print(f"[comfy-setup] Running: {' '.join(cmd)}")
    subprocess.run(cmd, cwd=str(cwd) if cwd else None, check=True)


def install_comfyui(with_custom_nodes: bool = True) -> None:
    COMFY_DIR.parent.mkdir(parents=True, exist_ok=True)

    if not (COMFY_DIR / "main.py").exists():
        print(f"[comfy-setup] Cloning ComfyUI into {COMFY_DIR}...")
        run_cmd(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "https://github.com/comfyanonymous/ComfyUI.git",
                str(COMFY_DIR),
            ]
        )
    else:
        print(f"[comfy-setup] ComfyUI already cloned at {COMFY_DIR}")

    # Install ComfyUI dependencies without overwriting existing CUDA PyTorch
    req_file = COMFY_DIR / "requirements.txt"
    if req_file.exists():
        filtered_lines = []
        for line in req_file.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            pkg_name = stripped.split("=")[0].split(">")[0].split("<")[0].strip().lower()
            if pkg_name in {"torch", "torchvision", "torchaudio"}:
                continue
            filtered_lines.append(stripped)

        print("[comfy-setup] Installing ComfyUI Python dependencies (preserving CUDA torch)...")
        run_cmd([sys.executable, "-m", "pip", "install", "--quiet", *filtered_lines])

    if with_custom_nodes:
        CUSTOM_NODES_DIR.mkdir(parents=True, exist_ok=True)
        vhs_dir = CUSTOM_NODES_DIR / "ComfyUI-VideoHelperSuite"
        if not vhs_dir.exists():
            print("[comfy-setup] Cloning ComfyUI-VideoHelperSuite (VHS_VideoCombine MP4 export)...")
            run_cmd(
                [
                    "git",
                    "clone",
                    "--depth",
                    "1",
                    "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git",
                    str(vhs_dir),
                ]
            )
            vhs_req = vhs_dir / "requirements.txt"
            if vhs_req.exists():
                run_cmd(
                    [
                        sys.executable,
                        "-m",
                        "pip",
                        "install",
                        "--quiet",
                        "-r",
                        str(vhs_req),
                    ]
                )

    print(f"[comfy-setup] ComfyUI ready at {COMFY_DIR}")
    print("[comfy-setup] Start the server anytime with: npm run comfy:serve")


def serve_comfyui(host: str = "127.0.0.1", port: int = 8188) -> None:
    if not (COMFY_DIR / "main.py").exists():
        install_comfyui()
    print(f"[comfy-setup] Starting ComfyUI server at http://{host}:{port} ...")
    run_cmd(
        [
            sys.executable,
            str(COMFY_DIR / "main.py"),
            "--listen",
            host,
            "--port",
            str(port),
        ],
        cwd=COMFY_DIR,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Setup and launch local ComfyUI for Wan 2.1")
    parser.add_argument(
        "--serve",
        action="store_true",
        help="Start the local ComfyUI API server on http://127.0.0.1:8188",
    )
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8188)
    args = parser.parse_args()

    if args.serve:
        serve_comfyui(host=args.host, port=args.port)
    else:
        install_comfyui()


if __name__ == "__main__":
    main()
