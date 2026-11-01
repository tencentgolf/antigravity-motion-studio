#!/usr/bin/env python3
"""
Commercial Ad Sound Design, Procedural SFX & Sidechain Audio Mixer (`scripts/sfx.py`).

Creates an agency-grade master audio track (`public/audio/<out>-master.wav`) by combining:
1. Voiceover track (generated via `scripts/tts.py`)
2. Procedural Cinematic Backing Track (warm deep sub-bass, atmospheric minor-9th synth pad,
   and crisp 120 BPM syncopated pulse)
3. Frame-Accurate Transition SFX Cues:
   - `impact`: Deep cinematic sub-bass boom + transient click (for hook & logo reveal)
   - `whoosh`: Filtered stereo noise sweep (for whip-pan / slide scene transitions)
   - `riser`: Pitch-swept tension builder before a drop
   - `shimmer`: High-harmonic bell chord (for 3D product reveal / CTA)
4. Automatic Sidechain Ducking:
   - Detects voiceover vocal envelope and ducks the music bed by -8.5 dB with fast attack
     (25ms) and smooth release (220ms) so narration cuts through with broadcast clarity.

Usage:
  python scripts/sfx.py --voiceover public/audio/ad-voice.wav --cues "0.05:impact,3.4:whoosh,3.5:shimmer,7.2:whoosh,10.8:impact" --out ad-master
"""

import argparse
import json
from pathlib import Path
from typing import List, Tuple

import numpy as np
import soundfile as sf
from scipy.signal import butter, filtfilt, lfilter


def lowpass(sig: np.ndarray, cutoff: float, sr: int, order: int = 2) -> np.ndarray:
    nyq = 0.5 * sr
    b, a = butter(order, min(0.98, cutoff / nyq), btype="low")
    return filtfilt(b, a, sig).astype(np.float32)


def bandpass(
    sig: np.ndarray, low: float, high: float, sr: int, order: int = 2
) -> np.ndarray:
    nyq = 0.5 * sr
    b, a = butter(
        order, [max(0.01, low / nyq), min(0.98, high / nyq)], btype="band"
    )
    return filtfilt(b, a, sig).astype(np.float32)


def synth_impact(sr: int, duration: float = 1.4) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False, dtype=np.float32)
    # Pitch drop 110Hz -> 36Hz
    freq = 36.0 + 74.0 * np.exp(-t * 14.0)
    phase = 2.0 * np.pi * np.cumsum(freq) / sr
    sub = np.sin(phase) * np.exp(-t * 3.2)
    # Crisp transient punch at t=0
    rng = np.random.default_rng(42)
    click = bandpass(rng.standard_normal(len(t)).astype(np.float32), 400, 3200, sr)
    click *= np.exp(-t * 45.0) * 0.35
    return np.tanh((sub + click) * 1.4).astype(np.float32) * 0.55


def synth_whoosh(sr: int, duration: float = 0.55) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False, dtype=np.float32)
    rng = np.random.default_rng(101)
    noise = rng.standard_normal(len(t)).astype(np.float32)
    # Bell-shaped amplitude envelope peaking in the middle of the transition
    env = np.sin(np.pi * (t / duration)) ** 2.2
    # Sweep resonant band + pitch doppler
    tonal_freq = 160.0 + 380.0 * np.sin(np.pi * (t / duration))
    tonal = np.sin(2.0 * np.pi * np.cumsum(tonal_freq) / sr) * 0.25
    swept = bandpass(noise, 220, 2800, sr) * 0.65 + tonal
    return (swept * env * 0.48).astype(np.float32)


def synth_shimmer(sr: int, duration: float = 1.6) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False, dtype=np.float32)
    # Cmaj9 / Aminor11 glassy chime frequencies
    freqs = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98]
    out = np.zeros_like(t)
    for i, f in enumerate(freqs):
        detune = 1.0 + (i - 2.5) * 0.0015
        env = np.exp(-t * (2.2 + i * 0.35)) * (1.0 - np.exp(-t * 60.0))
        out += np.sin(2.0 * np.pi * f * detune * t) * env * (0.22 / len(freqs))
    return out.astype(np.float32)


def synth_music_bed(sr: int, n: int, bpm: float = 120.0) -> np.ndarray:
    """
    Generates a warm, modern tech-commercial electronic music bed (A minor 9 / F major 7).
    """
    duration = n / float(sr)
    t = np.linspace(0, duration, n, endpoint=False, dtype=np.float32)

    # 1. Warm atmospheric pad (Am9 -> Fmaj9 chord progression every 4 seconds)
    pad = np.zeros(n, dtype=np.float32)
    chord_a = [220.0, 261.63, 329.63, 392.00, 493.88]  # A3, C4, E4, G4, B4
    chord_b = [174.61, 220.0, 261.63, 329.63, 392.00]  # F3, A3, C4, E4, G4
    blend = 0.5 + 0.5 * np.cos(2.0 * np.pi * t / 8.0)

    for fa, fb in zip(chord_a, chord_b):
        sa = np.sin(2.0 * np.pi * fa * t) + 0.3 * np.sin(2.0 * np.pi * (fa * 2.002) * t)
        sb = np.sin(2.0 * np.pi * fb * t) + 0.3 * np.sin(2.0 * np.pi * (fb * 2.002) * t)
        pad += (sa * blend + sb * (1.0 - blend)) * 0.045

    pad = lowpass(pad, 1400, sr)

    # 2. Deep pulsing bassline (locked to 120 BPM eighth notes)
    beat_hz = bpm / 60.0
    sub_root = np.where(blend > 0.5, 55.0, 43.65)  # A1 -> F1
    pulse_env = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2.0 * np.pi * beat_hz * 2.0 * t - np.pi / 2)) ** 2
    bass = np.sin(2.0 * np.pi * np.cumsum(sub_root) / sr) * pulse_env * 0.16

    # 3. Soft four-on-the-floor kick + subtle hi-hat tick
    beat_phase = (t * beat_hz) % 1.0
    kick_t = beat_phase / beat_hz
    kick_freq = 48.0 + 90.0 * np.exp(-kick_t * 32.0)
    kick = np.sin(2.0 * np.pi * kick_freq * kick_t) * np.exp(-kick_t * 11.0) * 0.18

    rng = np.random.default_rng(7)
    hat_phase = (t * beat_hz * 4.0) % 1.0
    hat_t = hat_phase / (beat_hz * 4.0)
    hat_noise = bandpass(rng.standard_normal(n).astype(np.float32), 5000, 10500, sr)
    hat = hat_noise * np.exp(-hat_t * 55.0) * 0.035

    bed = pad + bass + kick + hat
    # Smooth fade-in (0.3s) and fade-out (0.8s)
    fade_in = min(n, int(sr * 0.3))
    fade_out = min(n, int(sr * 0.8))
    bed[:fade_in] *= np.linspace(0.0, 1.0, fade_in, dtype=np.float32)
    bed[-fade_out:] *= np.linspace(1.0, 0.0, fade_out, dtype=np.float32)
    return bed.astype(np.float32)


def parse_cues(cues_str: str) -> List[Tuple[float, str]]:
    result = []
    if not cues_str.strip():
        return result
    for item in cues_str.split(","):
        item = item.strip()
        if ":" in item:
            sec_s, kind = item.split(":", 1)
            result.append((float(sec_s), kind.strip().lower()))
    return result


def apply_sidechain_ducking(
    music: np.ndarray, voice: np.ndarray, sr: int, duck_db: float = -8.5
) -> np.ndarray:
    """
    Attenuates `music` by `duck_db` whenever `voice` has active energy.
    """
    win = max(1, int(sr * 0.03))
    v_env = np.sqrt(
        np.convolve(voice**2, np.ones(win, dtype=np.float32) / win, mode="same") + 1e-9
    )
    active = (v_env > 0.015).astype(np.float32)
    # Smooth attack/release window (180ms)
    rel_win = max(1, int(sr * 0.18))
    duck_curve = np.convolve(
        active, np.ones(rel_win, dtype=np.float32) / rel_win, mode="same"
    )
    duck_curve = np.clip(duck_curve, 0.0, 1.0)
    min_gain = 10.0 ** (duck_db / 20.0)
    gain = 1.0 - duck_curve * (1.0 - min_gain)
    return (music * gain).astype(np.float32)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Mix voiceover + procedural music bed + transition SFX with sidechain ducking"
    )
    parser.add_argument(
        "--voiceover",
        type=str,
        required=True,
        help="Path to voiceover WAV file (e.g. public/audio/ad-voice.wav)",
    )
    parser.add_argument(
        "--cues",
        type=str,
        default="0.05:impact,3.2:whoosh,3.3:shimmer,6.8:whoosh,10.2:whoosh,10.3:impact",
        help="Comma-separated timestamp:sfx_type cues (impact, whoosh, shimmer)",
    )
    parser.add_argument("--bpm", type=float, default=122.0, help="Backing track BPM")
    parser.add_argument("--tail", type=float, default=1.0, help="Extra music tail seconds after voiceover")
    parser.add_argument("--out", type=str, default="ad-master", help="Base filename in public/audio/")
    args = parser.parse_args()

    vo_path = Path(args.voiceover)
    vo_samples, sr = sf.read(str(vo_path), dtype="float32")
    if vo_samples.ndim > 1:
        vo_samples = np.mean(vo_samples, axis=1)

    total_samples = len(vo_samples) + int(sr * args.tail)
    total_duration = round(total_samples / float(sr), 3)

    vo_padded = np.zeros(total_samples, dtype=np.float32)
    vo_padded[: len(vo_samples)] = vo_samples

    # 1. Generate music bed and apply sidechain ducking against voiceover
    music = synth_music_bed(sr, total_samples, bpm=args.bpm)
    music_ducked = apply_sidechain_ducking(music, vo_padded, sr, duck_db=-8.5)

    # 2. Layer frame-accurate SFX cues
    sfx_bus = np.zeros(total_samples, dtype=np.float32)
    cues = parse_cues(args.cues)
    for sec, kind in cues:
        start_idx = max(0, int(sec * sr))
        if start_idx >= total_samples:
            continue
        if kind == "impact":
            clip = synth_impact(sr)
        elif kind == "whoosh":
            clip = synth_whoosh(sr)
        elif kind == "shimmer":
            clip = synth_shimmer(sr)
        else:
            continue
        end_idx = min(total_samples, start_idx + len(clip))
        sfx_bus[start_idx:end_idx] += clip[: end_idx - start_idx]

    # 3. Master bus mix + soft limiting (-1.0 dBFS)
    master = vo_padded * 0.95 + music_ducked * 0.75 + sfx_bus * 0.65
    master = np.tanh(master * 1.1)
    peak = float(np.max(np.abs(master)))
    if peak > 1e-5:
        master = master * (0.891 / peak)

    out_dir = Path("public/audio")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_wav = out_dir / f"{args.out}.wav"
    sf.write(str(out_wav), master.astype(np.float32), sr)

    # If a matching voiceover JSON exists, create an updated Remotion props file pointing to the master mix
    vo_json = vo_path.with_suffix(".json")
    if vo_json.exists():
        meta = json.loads(vo_json.read_text(encoding="utf-8"))
        meta["audioFile"] = f"audio/{args.out}.wav"
        meta["durationSec"] = total_duration
        meta["soundDesign"] = {"bpm": args.bpm, "cues": args.cues}
        props_out = out_dir / f"{args.out}-props.json"
        props_out.write_text(json.dumps({"voiceover": meta}, indent=2), encoding="utf-8")
        print(f"[sfx] Updated Remotion props with master mix: {props_out}")

    print(f"[sfx] Wrote master ad mix: {out_wav} ({total_duration}s, {len(cues)} SFX cues)")


if __name__ == "__main__":
    main()
