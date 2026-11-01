#!/usr/bin/env python3
"""
One-Command Automated Updater for Antigravity Motion Studio (`scripts/update_studio.py`).

Safely updates all four studio layers without breaking version locks or CUDA PyTorch:
1. Remotion & Node packages: Runs `npx remotion upgrade` so all `@remotion/*` packages
   upgrade in lockstep.
2. Python TTS / Whisper / AI packages: Upgrades `requirements.txt` packages while
   preserving your existing CUDA `torch` / `torchvision` installation.
3. Local ComfyUI & Custom Nodes (`vendor/ComfyUI`): Runs `git pull --ff-only` on ComfyUI
   and `custom_nodes/*` (e.g. `ComfyUI-VideoHelperSuite`) and updates their requirements.
4. Global Agent Skills: Re-syncs any already-installed global skill files (`~/.gemini`,
   `~/.claude`, or `~/.codex`) so they match the latest repository `SKILL.md`.

Usage:
  npm run studio:update
  # or:
  python scripts/update_studio.py
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
COMFY_DIR = ROOT_DIR / "vendor" / "ComfyUI"


def run_cmd(cmd: list[str], cwd: Path = ROOT_DIR) -> None:
    print(f"[studio-update] Running: {' '.join(cmd)}")
    subprocess.run(cmd, cwd=str(cwd), check=True)


def upgrade_remotion() -> None:
    npx_bin = "npx.cmd" if sys.platform.startswith("win") else "npx"
    if not shutil.which(npx_bin):
        print("[studio-update] npx not found in PATH; skipping Remotion upgrade.")
        return
    print("[studio-update] 1/4 Upgrading @remotion/* packages in lockstep...")
    run_cmd([npx_bin, "remotion", "upgrade"])


def upgrade_python_packages() -> None:
    print("[studio-update] 2/4 Upgrading Python TTS, Whisper & AI packages (preserving CUDA torch)...")
    req_file = ROOT_DIR / "requirements.txt"
    if not req_file.exists():
        return

    pkgs = []
    for line in req_file.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        pkg_name = stripped.split("=")[0].split(">")[0].split("<")[0].strip().lower()
        if pkg_name in {"torch", "torchvision", "torchaudio"}:
            continue
        pkgs.append(stripped)

    if pkgs:
        run_cmd([sys.executable, "-m", "pip", "install", "--upgrade", "--quiet", *pkgs])


def upgrade_comfyui() -> None:
    if not (COMFY_DIR / ".git").exists():
        print("[studio-update] 3/4 ComfyUI not installed in vendor/ComfyUI (run `npm run comfy:setup` to install).")
        return

    print("[studio-update] 3/4 Pulling latest ComfyUI & custom nodes...")
    run_cmd(["git", "pull", "--ff-only"], cwd=COMFY_DIR)

    custom_nodes = COMFY_DIR / "custom_nodes"
    if custom_nodes.exists():
        for node_dir in custom_nodes.iterdir():
            if node_dir.is_dir() and (node_dir / ".git").exists():
                print(f"[studio-update] Updating custom node: {node_dir.name}")
                run_cmd(["git", "pull", "--ff-only"], cwd=node_dir)

    # Re-run setup_comfyui.py to sync any new ComfyUI dependencies safely
    run_cmd([sys.executable, str(ROOT_DIR / "scripts" / "setup_comfyui.py")])


def sync_existing_global_skills() -> None:
    print("[studio-update] 4/4 Syncing installed global agent skills...")
    home = Path.home()
    targets = []
    if (home / ".gemini" / "config" / "skills" / "motion-video").exists():
        targets.append("antigravity")
    if (home / ".claude" / "skills" / "motion-video").exists():
        targets.append("claude")
    if (home / ".codex" / "skills" / "motion-video").exists():
        targets.append("codex")

    for target in targets:
        run_cmd(
            [
                sys.executable,
                str(ROOT_DIR / "scripts" / "install_skill.py"),
                "--target",
                target,
            ]
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Update Antigravity Motion Studio dependencies")
    parser.add_argument("--skip-npm", action="store_true", help="Skip npx remotion upgrade")
    parser.add_argument("--skip-pip", action="store_true", help="Skip Python pip package upgrades")
    parser.add_argument("--skip-comfy", action="store_true", help="Skip ComfyUI git pull")
    args = parser.parse_args()

    if not args.skip_npm:
        upgrade_remotion()
    if not args.skip_pip:
        upgrade_python_packages()
    if not args.skip_comfy:
        upgrade_comfyui()
    sync_existing_global_skills()
    print("[studio-update] All studio components are up to date!")


if __name__ == "__main__":
    main()
