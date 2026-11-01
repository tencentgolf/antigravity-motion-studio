#!/usr/bin/env python3
"""
Still Images + Script/Storyline -> Finished Video Builder (`scripts/storyboard.py`).

Takes a list of still images (from any folder on your machine), per-scene headlines,
and a narration script (one sentence per image), then automatically:
1. Copies your images into `public/storyboard/<out>-<i>.<ext>`
2. Synthesizes broadcast-polished voiceover + word timings (`scripts/tts.py`)
3. Calculates exact scene-transition timestamps and mixes a sidechain-ducked backing
   track + transition whooshes/impacts (`scripts/sfx.py`)
4. Outputs `public/audio/<out>-storyboard-props.json` ready to render `StoryboardAd`!

Usage:
  python scripts/storyboard.py \
    --images "out/tech-explainer-preview.png,out/commercial-ad-scene2.png,out/commercial-ad-scene3.png" \
    --headlines "1. Code-First Architecture|2. Studio 3D Hardware|3. Vector Telemetry" \
    --script "Start with a clean TypeScript architecture. Add studio 3D lighting and physical materials. Ship cinema-grade telemetry and motion ads automatically." \
    --brand "HYPERION" \
    --out demo-storyboard
"""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a complete StoryboardAd video props package from still images + script"
    )
    parser.add_argument(
        "--images",
        type=str,
        required=True,
        help="Comma-separated paths to still images (one per scene)",
    )
    parser.add_argument(
        "--headlines",
        type=str,
        required=True,
        help="Pipe-separated ('|') headlines corresponding to each image",
    )
    parser.add_argument(
        "--script",
        type=str,
        required=True,
        help="Narration script with one sentence per image slide",
    )
    parser.add_argument("--brand", type=str, default="STUDIO", help="Brand/project tag")
    parser.add_argument(
        "--engine",
        choices=["auto", "kokoro", "edge"],
        default="kokoro",
        help="TTS engine (default: kokoro)",
    )
    parser.add_argument(
        "--voice",
        type=str,
        default="am_michael:0.7,am_fenrir:0.3",
        help="Voice ID or Kokoro blend",
    )
    parser.add_argument("--out", type=str, default="storyboard", help="Output base name")
    args = parser.parse_args()

    studio_root = Path(__file__).resolve().parent.parent
    storyboard_dir = studio_root / "public" / "storyboard"
    storyboard_dir.mkdir(parents=True, exist_ok=True)

    img_paths = [Path(p.strip()) for p in args.images.split(",") if p.strip()]
    headlines = [h.strip() for h in args.headlines.split("|") if h.strip()]

    if not img_paths:
        raise ValueError("At least one image path must be provided via --images")

    motions = ["zoom-in", "pan-right", "tilt-3d", "zoom-out"]
    slides = []

    for idx, src_path in enumerate(img_paths):
        if not src_path.is_absolute():
            src_path = (Path.cwd() / src_path).resolve()
        if not src_path.exists():
            raise FileNotFoundError(f"Image not found: {src_path}")

        ext = src_path.suffix.lower() or ".png"
        dest_name = f"{args.out}-slide-{idx + 1}{ext}"
        dest_path = storyboard_dir / dest_name
        shutil.copy2(src_path, dest_path)

        headline = headlines[idx] if idx < len(headlines) else f"Scene 0{idx + 1}"
        slides.append(
            {
                "image": f"storyboard/{dest_name}",
                "headline": headline,
                "tag": args.brand,
                "motion": motions[idx % len(motions)],
            }
        )

    # 1. Run TTS
    vo_name = f"{args.out}-vo"
    subprocess.run(
        [
            sys.executable,
            str(studio_root / "scripts" / "tts.py"),
            "--engine",
            args.engine,
            "--voice",
            args.voice,
            "--text",
            args.script,
            "--out",
            vo_name,
        ],
        cwd=str(studio_root),
        check=True,
    )

    vo_json_path = studio_root / "public" / "audio" / f"{vo_name}.json"
    vo_meta = json.loads(vo_json_path.read_text(encoding="utf-8"))

    # 2. Build SFX cues automatically from segment start times
    cues = ["0.05:impact"]
    for idx, seg in enumerate(vo_meta.get("segments", [])):
        if idx > 0:
            t_whoosh = max(0.1, round(seg["startSec"] - 0.15, 2))
            cues.append(f"{t_whoosh}:whoosh")
            if idx == len(vo_meta["segments"]) - 1:
                cues.append(f"{round(seg['startSec'], 2)}:shimmer")

    master_name = f"{args.out}-master"
    subprocess.run(
        [
            sys.executable,
            str(studio_root / "scripts" / "sfx.py"),
            "--voiceover",
            str(studio_root / "public" / "audio" / f"{vo_name}.wav"),
            "--cues",
            ",".join(cues),
            "--out",
            master_name,
        ],
        cwd=str(studio_root),
        check=True,
    )

    master_props_path = studio_root / "public" / "audio" / f"{master_name}-props.json"
    master_props = json.loads(master_props_path.read_text(encoding="utf-8"))

    storyboard_props = {
        "brandName": args.brand,
        "slides": slides,
        "voiceover": master_props["voiceover"],
    }

    final_props_path = studio_root / "public" / "audio" / f"{args.out}-storyboard-props.json"
    final_props_path.write_text(json.dumps(storyboard_props, indent=2), encoding="utf-8")
    print(f"[storyboard] Ready! Props written to: {final_props_path}")


if __name__ == "__main__":
    main()
