#!/usr/bin/env python3
"""
Studio Voiceover, Voice Cloning, External Audio Ingest & Exact Word-Timing Generator (`scripts/tts.py`).

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
3. External Audio Ingest + Whisper Word Alignment (`--audio-in path/to/recording.wav`):
   - Takes any recorded microphone track or VoiceStudio/ElevenLabs export, runs the
     Broadcast Vocal DSP chain, and extracts exact word-level & sentence-level timestamps
     locally using `faster-whisper`.
4. Zero-Shot Local Voice Cloning (`--clone-voice path/to/reference.wav`):
   - Clones any target voice from a 5–15s reference WAV on local GPU (`f5-tts` or
     `chatterbox-tts`), applies the Broadcast Vocal DSP chain, and aligns word timestamps
     via `faster-whisper`.
5. Broadcast DSP Chain (`--polish` enabled by default):
   - 80 Hz high-pass filter (removes rumble)
   - 180 Hz warmth boost (+2.5 dB)
   - 3.6 kHz presence boost (+2.2 dB for vocal clarity)
   - Soft-knee broadcast compressor + -1.0 dBFS true-peak normalization

Usage Examples:
  python scripts/tts.py --engine kokoro --voice "am_michael:0.7,am_fenrir:0.3" --text "Your script." --out vo
  python scripts/tts.py --engine edge --voice en-US-AndrewMultilingualNeural --text "Your script." --out vo
  python scripts/tts.py --audio-in my_mic_recording.wav --out vo-recorded
  python scripts/tts.py --clone-voice my_voice_10s.wav --text "Narrated in my cloned voice." --out vo-cloned
"""

import argparse
import asyncio
import json
import re
import subprocess
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


def align_audio_with_whisper(
    wav_path: Path,
    fallback_text: str = "",
    total_dur: float = 0.0,
    whisper_model: str = "base",
) -> List[Dict]:
    """
    Extracts exact word-level and segment-level timestamps from any WAV file
    using `faster-whisper` (`word_timestamps=True`).
    """
    try:
        import soundfile as sf
        from faster_whisper import WhisperModel
        from scipy.signal import resample_poly

        print(f"[tts-whisper] Aligning word timestamps with faster-whisper ('{whisper_model}')...")
        wav_samples, wav_sr = sf.read(str(wav_path), dtype="float32")
        if wav_samples.ndim > 1:
            wav_samples = np.mean(wav_samples, axis=1)
        if wav_sr != 16000:
            gcd = int(np.gcd(wav_sr, 16000))
            wav_samples = resample_poly(wav_samples, 16000 // gcd, wav_sr // gcd).astype(
                np.float32
            )

        model = WhisperModel(whisper_model, device="cpu", compute_type="int8")
        segments_iter, _ = model.transcribe(wav_samples, word_timestamps=True)

        segments: List[Dict] = []
        for idx, seg in enumerate(segments_iter):
            words_list = []
            for w in seg.words or []:
                token = w.word.strip()
                if not token:
                    continue
                words_list.append(
                    {
                        "word": token,
                        "startSec": round(float(w.start), 3),
                        "endSec": round(max(float(w.start) + 0.05, float(w.end)), 3),
                    }
                )
            seg_text = seg.text.strip()
            if not words_list and seg_text:
                words_list = estimate_word_timings(
                    seg_text, float(seg.start), max(0.2, float(seg.end - seg.start))
                )
            if seg_text:
                segments.append(
                    {
                        "id": f"seg-{idx + 1}",
                        "text": seg_text,
                        "startSec": round(float(seg.start), 3),
                        "endSec": round(float(seg.end), 3),
                        "words": words_list,
                    }
                )
        if segments:
            return segments
    except Exception as exc:
        print(f"[tts-whisper] Whisper alignment fallback ({exc}); estimating from text...")

    # Fallback if faster-whisper is unavailable or audio was silent
    text = fallback_text.strip() or "Voiceover audio track."
    sentences = split_sentences(text)
    dur_per_sent = max(0.5, total_dur / max(1, len(sentences)))
    cursor = 0.0
    fallback_segments = []
    for idx, sent in enumerate(sentences):
        words = estimate_word_timings(sent, cursor, dur_per_sent)
        fallback_segments.append(
            {
                "id": f"seg-{idx + 1}",
                "text": sent,
                "startSec": round(cursor, 3),
                "endSec": round(cursor + dur_per_sent, 3),
                "words": words,
            }
        )
        cursor += dur_per_sent
    return fallback_segments


def read_any_audio(audio_path: Path) -> Tuple[np.ndarray, int]:
    import soundfile as sf

    try:
        samples, sr = sf.read(str(audio_path), dtype="float32")
        return samples, sr
    except Exception:
        import imageio_ffmpeg

        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        tmp_wav = audio_path.with_suffix(".converted.tmp.wav")
        subprocess.run(
            [
                ffmpeg_exe,
                "-y",
                "-i",
                str(audio_path),
                "-ar",
                "24000",
                "-ac",
                "1",
                str(tmp_wav),
            ],
            check=True,
        )
        samples, sr = sf.read(str(tmp_wav), dtype="float32")
        tmp_wav.unlink(missing_ok=True)
        return samples, sr


def ingest_external_audio(
    audio_in: Path,
    out_wav: Path,
    fallback_text: str = "",
    polish: bool = True,
    whisper_model: str = "base",
) -> Tuple[List[Dict], float]:
    """
    Ingests any external recording (microphone WAV/MP3 or VoiceStudio export),
    applies the Broadcast Vocal DSP chain, and extracts exact word timings with Whisper.
    """
    import soundfile as sf

    if not audio_in.exists():
        raise FileNotFoundError(f"Input audio file not found: {audio_in}")

    samples, sr = read_any_audio(audio_in)
    if samples.ndim > 1:
        samples = np.mean(samples, axis=1)

    if polish:
        samples = apply_broadcast_polish(samples, sr)

    sf.write(str(out_wav), samples, sr)
    total_dur = round(len(samples) / float(sr), 3)
    segments = align_audio_with_whisper(
        out_wav, fallback_text=fallback_text, total_dur=total_dur, whisper_model=whisper_model
    )
    return segments, total_dur


def synthesize_cloned_voice(
    text: str,
    ref_audio: Path,
    out_wav: Path,
    ref_text: str = "",
    polish: bool = True,
    whisper_model: str = "base",
) -> Tuple[List[Dict], float]:
    """
    Zero-shot local voice cloning from a 5-15s reference clip (`--clone-voice`).
    Tries `f5-tts` (`F5TTS`) first, then `chatterbox-tts` (`ChatterboxTTS`), then
    runs Broadcast DSP + Whisper word alignment.
    """
    import soundfile as sf

    if not ref_audio.exists():
        raise FileNotFoundError(f"Reference voice sample not found: {ref_audio}")

    raw_wav = out_wav.with_suffix(".raw_clone.tmp.wav")
    cloned_ok = False

    # 1. Try F5-TTS Python API
    try:
        from f5_tts.api import F5TTS

        print(f"[tts-clone] Cloning voice from '{ref_audio.name}' via F5-TTS...")
        f5 = F5TTS()
        f5.infer(
            ref_file=str(ref_audio),
            ref_text=ref_text,
            gen_text=text,
            file_wave=str(raw_wav),
        )
        cloned_ok = raw_wav.exists()
    except ImportError:
        pass

    # 2. Try Chatterbox-TTS Python API
    if not cloned_ok:
        try:
            import torch
            import torchaudio
            from chatterbox.tts import ChatterboxTTS

            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[tts-clone] Cloning voice from '{ref_audio.name}' via ChatterboxTTS ({device})...")
            model = ChatterboxTTS.from_pretrained(device=device)
            wav_tensor = model.generate(text, audio_prompt_path=str(ref_audio))
            torchaudio.save(str(raw_wav), wav_tensor, model.sr)
            cloned_ok = raw_wav.exists()
        except ImportError:
            pass

    if not cloned_ok:
        raise RuntimeError(
            "Zero-shot voice cloning requires either `f5-tts` or `chatterbox-tts` installed.\n"
            "Install one with:\n"
            "  pip install f5-tts\n"
            "  # or:\n"
            "  pip install chatterbox-tts\n"
            "Alternatively, export a WAV from VoiceStudio and pass `--audio-in path/to/output.wav`."
        )

    samples, sr = sf.read(str(raw_wav), dtype="float32")
    raw_wav.unlink(missing_ok=True)
    if samples.ndim > 1:
        samples = np.mean(samples, axis=1)

    if polish:
        samples = apply_broadcast_polish(samples, sr)

    sf.write(str(out_wav), samples, sr)
    total_dur = round(len(samples) / float(sr), 3)
    segments = align_audio_with_whisper(
        out_wav, fallback_text=text, total_dur=total_dur, whisper_model=whisper_model
    )
    return segments, total_dur


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

    lead_in = 0.06
    audio_chunks.append(np.zeros(int(sample_rate * lead_in), dtype=np.float32))
    cursor += lead_in

    for idx, sentence in enumerate(sentences):
        samples, sr = kokoro.create(
            sentence, voice=voice_target, speed=speed, lang="en-us"
        )
        sample_rate = sr
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
        description="Generate human-sounding TTS, clone voices, or align external audio + Remotion timing JSON"
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
    parser.add_argument(
        "--audio-in",
        type=str,
        default=None,
        help="Optional path to an existing audio recording (WAV/MP3 from mic or VoiceStudio) to polish & Whisper-align",
    )
    parser.add_argument(
        "--clone-voice",
        type=str,
        default=None,
        help="Optional path to a 5-15s reference WAV to clone locally via F5-TTS or ChatterboxTTS",
    )
    parser.add_argument(
        "--ref-text",
        type=str,
        default="",
        help="Optional transcript of the --clone-voice reference audio clip",
    )
    parser.add_argument(
        "--whisper-model",
        type=str,
        default="base",
        help="Whisper model size for --audio-in / --clone-voice alignment (default: 'base')",
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

    polish = not args.no_polish

    if args.audio_in:
        audio_in_path = Path(args.audio_in)
        segments, total_duration = ingest_external_audio(
            audio_in_path,
            out_wav,
            fallback_text=args.text,
            polish=polish,
            whisper_model=args.whisper_model,
        )
        engine_label = f"audio-in+whisper ({audio_in_path.name})"
    elif args.clone_voice:
        ref_path = Path(args.clone_voice)
        segments, total_duration = synthesize_cloned_voice(
            args.text,
            ref_path,
            out_wav,
            ref_text=args.ref_text,
            polish=polish,
            whisper_model=args.whisper_model,
        )
        engine_label = f"voice-clone+whisper ({ref_path.name})"
    else:
        kokoro_ready = (
            Path("models/kokoro-v1.0.onnx").exists()
            and Path("models/voices-v1.0.bin").exists()
        )
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
