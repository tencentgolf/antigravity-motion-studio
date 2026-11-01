#!/usr/bin/env python3
"""
Studio Voiceover + Exact Word-Timing Generator for Remotion (`motion-video`).

Features:
1. Kokoro 82M ONNX (`--engine kokoro`):
   - Supports custom voice blending (e.g., `--voice "af_heart:0.6,af_bella:0.4"` or
     `--voice "am_michael:0.7,am_fenrir:0.3"`) for warm, human vocal texture.
   - Synthesizes full conversational clauses to preserve natural pitch prosody.
2. Microsoft Edge Neural TTS (`--engine edge`):
   - Uses studio conversational neural voices (`en-US-AvaMultilingualNeural`,
     `en-US-AndrewMultilingualNeural`, `en-US-BrianMultilingualNeural`).
   - Extracts exact hardware `WordBoundary` millisecond timestamps for frame-accurate
     Remotion captions.
3. Broadcast DSP Chain (`--polish` enabled by default):
   - 80 Hz high-pass filter (removes rumble)
   - 180 Hz warmth boost (+2.5 dB)
   - 3.5 kHz presence boost (+2.0 dB for vocal clarity)
   - Soft-knee broadcast compressor + -1.0 dBFS true-peak normalization

Usage Examples:
  python scripts/tts.py --engine edge --voice en-US-AndrewMultilingualNeural --out voiceover
  python scripts/tts.py --engine kokoro --voice "af_heart:0.6,af_bella:0.4" --out voiceover-kokoro
"""

import argparse
import asyncio
import json
import re
import subprocess
import wave
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np


def split_sentences(text: str) -> List[str]:
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", text.strip()) if p.strip()]
    return parts if parts else [text.strip()]


def estimate_word_timings(
    sentence: str, start_sec: float, duration_sec: float
) -> List[Dict]:
    words = [w for w in sentence.split() if w]
    if not words:
        return []
    weights = [
        max(2, len(re.sub(r"\W+", "", w)))
        + (3 if w[-1] in ".!?" else (1.5 if w[-1] in ",;:" else 0))
        for w in words
    ]
    total_weight = sum(weights)
    cursor = start_sec
    result = []
    for w, weight in zip(words, weights):
        w_dur = duration_sec * (weight / total_weight)
        result.append(
            {
                "word": w,
                "startSec": round(cursor, 3),
                "endSec": round(cursor + w_dur, 3),
            }
        )
        cursor += w_dur
    return result


def biquad_peaking_eq(
    samples: np.ndarray, sr: int, freq: float, gain_db: float, q: float = 1.0
) -> np.ndarray:
    from scipy.signal import lfilter

    a = 10.0 ** (gain_db / 40.0)
    w0 = 2.0 * np.pi * freq / sr
    alpha = np.sin(w0) / (2.0 * q)
    cos_w0 = np.cos(w0)

    b0 = 1.0 + alpha * a
    b1 = -2.0 * cos_w0
    b2 = 1.0 - alpha * a
    a0 = 1.0 + alpha / a
    a1 = -2.0 * cos_w0
    a2 = 1.0 - alpha / a

    b = np.array([b0, b1, b2], dtype=np.float64) / a0
    a_coeff = np.array([1.0, a1 / a0, a2 / a0], dtype=np.float64)
    return lfilter(b, a_coeff, samples).astype(np.float32)


def apply_broadcast_polish(samples: np.ndarray, sr: int) -> np.ndarray:
    """
    Studio vocal chain:
    1. 80 Hz high-pass filter (2nd-order Butterworth)
    2. 180 Hz low-mid warmth (+2.5 dB)
    3. 3600 Hz vocal presence (+2.2 dB)
    4. Smooth envelope dynamic compression (ratio 2.5:1)
    5. -1.0 dBFS peak normalization
    """
    from scipy.signal import butter, filtfilt

    audio = samples.astype(np.float32)
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)

    # 1. High-pass at 80 Hz
    nyq = 0.5 * sr
    b_hp, a_hp = butter(2, 80.0 / nyq, btype="high")
    audio = filtfilt(b_hp, a_hp, audio).astype(np.float32)

    # 2. Warmth boost at 180 Hz (+2.5 dB, Q=0.9)
    audio = biquad_peaking_eq(audio, sr, freq=180.0, gain_db=2.5, q=0.9)

    # 3. Presence clarity boost at 3.6 kHz (+2.2 dB, Q=1.1)
    if nyq > 4200:
        audio = biquad_peaking_eq(audio, sr, freq=3600.0, gain_db=2.2, q=1.1)

    # 4. Smooth soft-knee vocal compression
    win = max(1, int(sr * 0.015))
    env = np.sqrt(
        np.convolve(audio**2, np.ones(win, dtype=np.float32) / win, mode="same")
        + 1e-8
    )
    threshold = 0.14
    ratio = 2.5
    gain = np.where(
        env > threshold,
        (threshold + (env - threshold) / ratio) / env,
        1.0,
    )
    # Smooth gain transitions (release smoothing)
    smooth_win = max(1, int(sr * 0.04))
    gain_smooth = np.convolve(
        gain, np.ones(smooth_win, dtype=np.float32) / smooth_win, mode="same"
    )
    audio = audio * gain_smooth

    # 5. Soft saturation + -1.0 dBFS peak ceiling (0.891)
    audio = np.tanh(audio * 1.15)
    peak = float(np.max(np.abs(audio)))
    if peak > 1e-5:
        audio = audio * (0.891 / peak)

    return audio.astype(np.float32)


def resolve_kokoro_voice(kokoro, voice_spec: str):
    """
    Supports single voice ID ('af_heart') or weighted blend ('af_heart:0.6,af_bella:0.4').
    """
    if "," not in voice_spec and ":" not in voice_spec:
        return voice_spec.strip()

    blended = None
    total_w = 0.0
    for part in voice_spec.split(","):
        part = part.strip()
        if not part:
            continue
        if ":" in part:
            v_name, w_str = part.split(":", 1)
            weight = float(w_str)
        else:
            v_name, weight = part, 1.0
        style = kokoro.get_voice_style(v_name.strip())
        blended = style * weight if blended is None else blended + style * weight
        total_w += weight

    if blended is None or total_w <= 0:
        return "af_heart"
    return (blended / total_w).astype(np.float32)


def synthesize_kokoro(
    text: str,
    out_wav: Path,
    voice_spec: str = "af_heart:0.6,af_bella:0.4",
    speed: float = 0.98,
    polish: bool = True,
) -> Tuple[List[Dict], float]:
    import soundfile as sf
    from kokoro_onnx import Kokoro

    model_path = Path("models/kokoro-v1.0.onnx")
    voices_path = Path("models/voices-v1.0.bin")
    kokoro = Kokoro(str(model_path), str(voices_path))
    voice_target = resolve_kokoro_voice(kokoro, voice_spec)

    sentences = split_sentences(text)
    audio_chunks = []
    segments = []
    cursor = 0.0
    sample_rate = 24000
    pause_sec = 0.16

    # Small initial lead-in (0.06s) for natural breath start
    lead_in = 0.06
    audio_chunks.append(np.zeros(int(sample_rate * lead_in), dtype=np.float32))
    cursor += lead_in

    for idx, sentence in enumerate(sentences):
        samples, sr = kokoro.create(
            sentence, voice=voice_target, speed=speed, lang="en-us"
        )
        sample_rate = sr
        # Trim dead digital silence at edges while keeping natural decay
        non_silent = np.where(np.abs(samples) > 0.003)[0]
        if len(non_silent) > 0:
            start_i = max(0, int(non_silent[0]) - int(sr * 0.02))
            end_i = min(len(samples), int(non_silent[-1]) + int(sr * 0.05))
            samples = samples[start_i:end_i]

        dur = len(samples) / float(sr)
        words = estimate_word_timings(sentence, cursor, dur)
        segments.append(
            {
                "id": f"seg-{idx + 1}",
                "text": sentence,
                "startSec": round(cursor, 3),
                "endSec": round(cursor + dur, 3),
                "words": words,
            }
        )
        audio_chunks.append(samples)
        pause = np.zeros(int(sr * pause_sec), dtype=np.float32)
        audio_chunks.append(pause)
        cursor += dur + pause_sec

    full_audio = np.concatenate(audio_chunks)
    if polish:
        full_audio = apply_broadcast_polish(full_audio, sample_rate)

    sf.write(str(out_wav), full_audio, sample_rate)
    total_dur = round(len(full_audio) / float(sample_rate), 3)
    return segments, total_dur


async def _run_edge_tts(
    text: str, mp3_path: Path, voice: str, rate: str, pitch: str
) -> List[Dict]:
    import edge_tts

    communicate = edge_tts.Communicate(
        text, voice=voice, rate=rate, pitch=pitch, boundary="WordBoundary"
    )
    word_events: List[Dict] = []
    with open(mp3_path, "wb") as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start_sec = chunk["offset"] / 10_000_000.0
                dur_sec = chunk["duration"] / 10_000_000.0
                word_events.append(
                    {
                        "word": chunk["text"],
                        "startSec": round(start_sec, 3),
                        "endSec": round(start_sec + max(0.08, dur_sec), 3),
                    }
                )
    return word_events


def attach_punctuation_to_words(
    full_text: str, raw_words: List[Dict]
) -> List[Dict]:
    """
    Edge-TTS WordBoundary strips punctuation from `chunk['text']` (e.g. 'hand' instead of 'hand.').
    Re-attach original punctuation tokens from `full_text` so captions display cleanly.
    """
    tokens = [t for t in full_text.split() if t]
    if len(tokens) == len(raw_words):
        return [
            {
                "word": tok,
                "startSec": w["startSec"],
                "endSec": w["endSec"],
            }
            for tok, w in zip(tokens, raw_words)
        ]
    return raw_words


def synthesize_edge(
    text: str,
    out_wav: Path,
    voice: str = "en-US-AndrewMultilingualNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    polish: bool = True,
) -> Tuple[List[Dict], float]:
    import soundfile as sf

    tmp_mp3 = out_wav.with_suffix(".tmp.mp3")
    raw_words = asyncio.run(_run_edge_tts(text, tmp_mp3, voice, rate, pitch))

    samples, sr = sf.read(str(tmp_mp3), dtype="float32")
    tmp_mp3.unlink(missing_ok=True)

    if polish:
        samples = apply_broadcast_polish(samples, sr)

    sf.write(str(out_wav), samples, sr)
    total_dur = round(len(samples) / float(sr), 3)

    words = attach_punctuation_to_words(text, raw_words)
    if not words:
        words = estimate_word_timings(text, 0.0, total_dur)

    # Group words into sentence segments
    sentences = split_sentences(text)
    segments = []
    word_idx = 0
    for idx, sentence in enumerate(sentences):
        s_count = len([w for w in sentence.split() if w])
        seg_words = words[word_idx : word_idx + s_count]
        word_idx += s_count
        if seg_words:
            seg_start = seg_words[0]["startSec"]
            seg_end = seg_words[-1]["endSec"]
        else:
            seg_start = 0.0
            seg_end = total_dur
        segments.append(
            {
                "id": f"seg-{idx + 1}",
                "text": sentence,
                "startSec": seg_start,
                "endSec": seg_end,
                "words": seg_words,
            }
        )

    return segments, total_dur


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate human-sounding TTS audio + Remotion timing JSON"
    )
    parser.add_argument(
        "--text",
        type=str,
        default="Stop keyframing by hand. Write TypeScript, sync local AI voice, and render at 60fps.",
        help="Narration script text",
    )
    parser.add_argument(
        "--engine",
        choices=["auto", "kokoro", "edge"],
        default="auto",
        help="TTS engine: 'kokoro' (local 82M ONNX + voice blend), 'edge' (Neural + exact WordBoundary), or 'auto'",
    )
    parser.add_argument(
        "--voice",
        type=str,
        default="",
        help=(
            "Voice spec. For Kokoro: 'af_heart:0.6,af_bella:0.4' or 'am_michael:0.7,am_fenrir:0.3'. "
            "For Edge: 'en-US-AndrewMultilingualNeural' or 'en-US-AvaMultilingualNeural'."
        ),
    )
    parser.add_argument("--speed", type=float, default=0.98, help="Speech speed for Kokoro (default 0.98)")
    parser.add_argument("--no-polish", action="store_true", help="Disable broadcast EQ + compression chain")
    parser.add_argument("--out", type=str, default="voiceover", help="Base filename in public/audio/")
    args = parser.parse_args()

    audio_dir = Path("public/audio")
    audio_dir.mkdir(parents=True, exist_ok=True)

    out_wav = audio_dir / f"{args.out}.wav"
    out_json = audio_dir / f"{args.out}.json"
    props_json = audio_dir / f"{args.out}-props.json"

    kokoro_ready = (
        Path("models/kokoro-v1.0.onnx").exists()
        and Path("models/voices-v1.0.bin").exists()
    )

    polish = not args.no_polish
    chosen_engine = args.engine
    if chosen_engine == "auto":
        chosen_engine = "kokoro" if kokoro_ready else "edge"

    if chosen_engine == "kokoro":
        voice_spec = args.voice or "af_heart:0.6,af_bella:0.4"
        segments, total_duration = synthesize_kokoro(
            args.text, out_wav, voice_spec=voice_spec, speed=args.speed, polish=polish
        )
        engine_label = f"kokoro-onnx ({voice_spec})"
    else:
        voice_spec = args.voice or "en-US-AndrewMultilingualNeural"
        try:
            segments, total_duration = synthesize_edge(
                args.text, out_wav, voice=voice_spec, polish=polish
            )
            engine_label = f"edge-neural ({voice_spec})"
        except Exception as exc:
            if kokoro_ready:
                fallback_voice = (
                    "am_michael:0.7,am_fenrir:0.3"
                    if "Andrew" in voice_spec or "Brian" in voice_spec
                    else "af_heart:0.6,af_bella:0.4"
                )
                print(
                    f"[tts] Edge TTS unavailable ({exc}); falling back to local Kokoro ({fallback_voice})..."
                )
                segments, total_duration = synthesize_kokoro(
                    args.text,
                    out_wav,
                    voice_spec=fallback_voice,
                    speed=args.speed,
                    polish=polish,
                )
                engine_label = f"kokoro-onnx ({fallback_voice})"
            else:
                raise

    metadata = {
        "engine": engine_label,
        "polished": polish,
        "audioFile": f"audio/{args.out}.wav",
        "durationSec": total_duration,
        "segments": segments,
    }

    out_json.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    props_json.write_text(
        json.dumps({"voiceover": metadata}, indent=2), encoding="utf-8"
    )
    print(f"[tts] Engine: {engine_label} | Broadcast Polish: {polish}")
    print(f"[tts] Wrote audio: {out_wav} ({total_duration}s)")
    print(f"[tts] Wrote timings: {out_json}")
    print(f"[tts] Wrote Remotion props: {props_json}")


if __name__ == "__main__":
    main()
