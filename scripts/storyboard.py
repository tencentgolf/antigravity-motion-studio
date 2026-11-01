#!/usr/bin/env python3
"""
Still Images + Script/Storyline -> Finished Video Builder (`scripts/storyboard.py`).

Takes a list of still images (from any folder on your machine), per-scene headlines,
and a narration script (or a pre-recorded `--audio-in` / `--clone-voice` reference), then automatically:
1. Copies your images into `public/storyboard/<out>-<i>.<ext>`
2. Synthesizes broadcast-polished voiceover + word timings (`scripts/tts.py`)
3. Calculates exact scene-transition timestamps and mixes a sidechain-ducked backing
   track + transition whooshes/impacts (`scripts/sfx.py`)
4. Outputs `public/audio/<out>-storyboard-props.json` ready to render `StoryboardAd`!

Usage:
  python scripts/storyboard.py \
    --images "docs/previews/step1-setup.png,docs/previews/step2-skills.png,docs/previews/step3-audio.png" \
    --headlines "1. One-Minute Setup|2. Multi-Agent Skills|3. Broadcast Audio DSP" \
    --script "Clone the studio and install dependencies in sixty seconds. Connect the skill to Gemini, Claude Code, or Codex. Then render broadcast voiceovers with automatic sidechain ducking." \
    --brand "ANTIGRAVITY" \
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
        description="Build a complete StoryboardAd video props package from still images + script or recorded voice"
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
        default="Scene narration track.",
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
    parser.add_argument(
        "--audio-in",
        type=str,
        default=None,
        help="Optional pre-recorded WAV/MP3 (e.g. mic recording or VoiceStudio export) to polish & Whisper-align",
    )
    parser.add_argument(
        "--clone-voice",
        type=str,
        default=None,
        help="Optional 5-15s reference WAV to clone locally via F5-TTS or ChatterboxTTS",
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

    # 1. Run TTS / Whisper Audio Alignment / Voice Cloning
    vo_name = f"{args.out}-vo"
    tts_cmd = [
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
    ]
    if args.audio_in:
        tts_cmd.extend(["--audio-in", args.audio_in])
    if args.clone_voice:
        tts_cmd.extend(["--clone-voice", args.clone_voice])

    subprocess.run(tts_cmd, cwd=str(studio_root), check=True)

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
