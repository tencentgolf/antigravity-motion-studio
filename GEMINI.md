# Motion Video Studio (`GEMINI.md`)

Project-specific instructions for Antigravity (Gemini) in `C:\projects\motion-video`.

## 1. Architecture Overview
This workspace is a unified, code-first motion graphics studio powered by **Remotion v4**, **React Three Fiber (`@remotion/three`)**, and a dual-engine **TTS + Broadcast DSP pipeline** (`scripts/tts.py`).

* **Entrypoint & Registry:** `src/index.ts` and `src/Root.tsx`
* **Compositions (`src/compositions/`):**
  * `TechExplainer.tsx` (`1920x1080`, 30fps): Step-by-step animated architecture diagrams & code walkthroughs.
  * `SocialShort.tsx` (`1080x1920` 9:16 vertical, 30fps): Kinetic word-by-word animated captions with an audio-reactive waveform bar.
  * `ThreeVisualizer.tsx` (`1920x1080`, 30fps): Deterministic 3D WebGL visualizer using `<ThreeCanvas>` (`angle` OpenGL renderer enabled in `remotion.config.ts`).
  * `HalloweenExplainer.tsx` (`1920x1080`, 30fps): Multi-chapter historical/cultural explainer synced to voiceover segments.
  * `AiVideoShowcase.tsx` (`1920x1080`, 30fps): Wraps locally generated AI video clips (`<OffthreadVideo>`) with HUD typography, vignette grading, and audio spectrum bars.
  * `CommercialAd.tsx` (`1920x1080`, 30fps): Agency-style multi-scene commercial using `<TransitionSeries>`, `<CameraMotionBlur>`, `@remotion/google-fonts`, `@remotion/paths` (`evolvePath`), `@remotion/noise`, and `@react-three/drei` studio 3D materials.
  * `StoryboardAd.tsx` (`1920x1080`, 30fps): Turns any sequence of still images + a script/storyline into a voice-synced, 2.5D animated commercial with automatic transitions and kinetic lower-thirds.
  * `StudioGuide.tsx` (`1920x1080`, 30fps): 4-step instructional onboarding video showcasing setup, multi-agent skill integration, broadcast audio + sidechain SFX, and the still-images-to-video pipeline.
* **Shared Timing & Spectrum Helpers (`src/lib/timing.ts`):**
  * `useStepSpring(frame, fps, stepStartSec)`: Declarative spring progress starting at `stepStartSec` seconds.
  * `getEnvelope(frame, fps, startSec, endSec, fadeSec)`: Smooth fade-in/out envelope.
  * `getProceduralSpectrum(frame, fps, barCount, bpm)`: Deterministic synthetic spectrum for music/visual-only mode.

## 2. Voiceover & Word-Timing Pipeline (`scripts/tts.py`)
Whenever a video requires narration or word-synced captions:

1. **Generate Polished Audio & Timings:**
   * **Edge Neural TTS (exact hardware `WordBoundary` millisecond timestamps):**
     ```powershell
     python scripts/tts.py --engine edge --voice en-US-AndrewMultilingualNeural --text "Your script here." --out <name>
     ```
     *(Other strong voices: `en-US-AvaMultilingualNeural`, `en-US-BrianMultilingualNeural`)*
   * **Kokoro 82M Local ONNX (offline + custom voice blending):**
     ```powershell
     python scripts/tts.py --engine kokoro --voice "af_heart:0.6,af_bella:0.4" --text "Your script here." --out <name>
     ```
     *(Male blend example: `"am_michael:0.7,am_fenrir:0.3"`; model files live in `models/kokoro-v1.0.onnx` and `models/voices-v1.0.bin`)*
   * **Broadcast Polish:** Enabled by default (`80Hz` high-pass, `180Hz` warmth EQ, `3.6kHz` presence boost, soft-knee 2.5:1 compression, `-1.0 dBFS` normalization). Pass `--no-polish` only if raw unedited synthesis is needed.

2. **Output Files (`public/audio/`):**
   * `public/audio/<name>.wav`: Broadcast-polished audio file.
   * `public/audio/<name>.json`: Timing metadata (`durationSec`, `segments`, word-level `startSec`/`endSec`).
   * `public/audio/<name>-props.json`: Ready-to-pass Remotion `--props` file (`{ "voiceover": ... }`) that `calculateMetadata` in `src/Root.tsx` uses to automatically set `durationInFrames`.

## 3. Workflow for Creating a New Video
1. If voiceover-driven, run `scripts/tts.py` first to generate `public/audio/<name>.wav` and `public/audio/<name>-props.json`.
2. Create or update the composition in `src/compositions/` and register it in `src/Root.tsx` with `calculateMetadata` reading `props.voiceover?.durationSec`.
3. Verify TypeScript compilation (`npm run typecheck`) and render a preview still (`npx.cmd remotion still src/index.ts <CompId> out/preview.png --frame=60`) to inspect the visual layout.
4. Render the final MP4:
   ```powershell
   npx.cmd remotion render src/index.ts <CompId> out/<video-name>.mp4 --props=./public/audio/<name>-props.json
   ```

## 4. Photorealistic Local AI Video Pipeline (`ComfyUI` + `Wan 2.1` via `scripts/generate_video.py`)
Whenever a video requires photorealistic footage or animating a still image (`Wan 2.1` via ComfyUI workflows in `workflows/comfyui/` or standalone `diffusers`):

1. **Setup / Start ComfyUI (if using `--backend comfyui` or `--image` I2V):**
   ```powershell
   npm run comfy:setup
   npm run comfy:serve
   ```
2. **Generate AI Video Clip (Text-to-Video or Image-to-Video):**
   ```powershell
   # Text-to-Video (auto-selects ComfyUI `wan21_t2v_api.json` if running, or Diffusers fallback):
   python scripts/generate_video.py --prompt "Detailed visual description..." --aspect 16:9 --frames 49 --out <clip-name>

   # Image-to-Video (animates a still image via ComfyUI `wan21_i2v_api.json`):
   python scripts/generate_video.py --backend comfyui --image path/to/still.png --prompt "Camera motion description..." --out <clip-name>
   ```
   * Outputs `public/video/<clip-name>.mp4` and `public/video/<clip-name>-props.json`.
3. **Composite & Render in Remotion (`AiVideoShowcase`):**
   ```powershell
   npx.cmd remotion render src/index.ts AiVideoShowcase out/<final-name>.mp4 --props=./public/video/<clip-name>-props.json
   ```

## 5. Commercial Sound Design & Sidechain Ducking Mixer (`scripts/sfx.py`)
For professional motion advertisements (`CommercialAd`), layer the voiceover with a procedural backing beat, `-8.5 dB` automatic sidechain ducking, and frame-locked transition SFX (`impact`, `whoosh`, `shimmer`):
```powershell
python scripts/sfx.py --voiceover public/audio/<vo-name>.wav --cues "0.05:impact,3.35:whoosh,3.5:shimmer,6.9:whoosh,10.2:whoosh,10.35:impact" --out <master-name>
npx.cmd remotion render src/index.ts CommercialAd out/<ad-name>.mp4 --props=./public/audio/<master-name>-props.json
```

## 6. Still Images + Script/Storyline Pipeline (`scripts/storyboard.py`)
To turn a set of still images (screenshots, renders, photos) and a narration script into a finished commercial video:
```powershell
python scripts/storyboard.py `
  --images "path/to/img1.png,path/to/img2.png,path/to/img3.png" `
  --headlines "Headline 1|Headline 2|Headline 3" `
  --script "Sentence for slide one. Sentence for slide two. Sentence for slide three." `
  --brand "BRAND_NAME" `
  --out <slug>
npx.cmd remotion render src/index.ts StoryboardAd out/<slug>.mp4 --props=./public/audio/<slug>-storyboard-props.json
```
