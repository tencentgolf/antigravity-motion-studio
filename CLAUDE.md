# Antigravity Motion Studio (`AGENTS.md` / `CLAUDE.md`)

Agent instructions for **Google Antigravity (Gemini)**, **Claude Code**, and **OpenAI Codex**.

## 1. Architecture Overview
This repository is a unified, code-first motion graphics and commercial video studio powered by **Remotion v4**, **React Three Fiber (`@remotion/three` + `@react-three/drei`)**, **Local AI Video (`Wan 2.1`)**, and a **Dual-Engine TTS + Broadcast SFX/Ducking pipeline** (`scripts/tts.py` & `scripts/sfx.py`).

* **Entrypoint & Registry:** `src/index.ts` and `src/Root.tsx`
* **Compositions (`src/compositions/`):**
  * `CommercialAd.tsx` (`1920x1080`, 30fps): Agency-style multi-scene commercial using `<TransitionSeries>`, `<CameraMotionBlur>`, `@remotion/google-fonts`, `@remotion/paths` (`evolvePath`), `@remotion/noise`, and `@react-three/drei` studio 3D materials.
  * `StoryboardAd.tsx` (`1920x1080`, 30fps): Turns any sequence of still images + a script/storyline into a voice-synced, 2.5D animated commercial with automatic transitions and kinetic lower-thirds.
  * `StudioGuide.tsx` (`1920x1080`, 30fps): 4-step instructional onboarding video showcasing setup, multi-agent skill integration, broadcast audio + sidechain SFX, and the still-images-to-video pipeline.
  * `TechExplainer.tsx` (`1920x1080`, 30fps): Step-by-step animated architecture diagrams & code walkthroughs.
  * `SocialShort.tsx` (`1080x1920` 9:16 vertical, 30fps): Kinetic word-by-word animated captions with an audio-reactive waveform bar.
  * `ThreeVisualizer.tsx` (`1920x1080`, 30fps): Deterministic 3D WebGL visualizer using `<ThreeCanvas>`.
  * `HalloweenExplainer.tsx` (`1920x1080`, 30fps): Multi-chapter cultural/historical explainer synced to voiceover segments.
  * `AiVideoShowcase.tsx` (`1920x1080`, 30fps): Wraps locally generated AI video clips (`<OffthreadVideo>`) with HUD typography, vignette grading, and audio spectrum bars.

## 2. Key CLI Pipelines

### A. Still Images + Script/Storyline → Video (`scripts/storyboard.py`)
```bash
python scripts/storyboard.py \
  --images "path/to/img1.png,path/to/img2.png,path/to/img3.png" \
  --headlines "Headline 1|Headline 2|Headline 3" \
  --script "Sentence for slide one. Sentence for slide two. Sentence for slide three." \
  --brand "BRAND_NAME" \
  --out <slug>
npx remotion render src/index.ts StoryboardAd out/<slug>.mp4 --props=./public/audio/<slug>-storyboard-props.json
```

### B. Voiceover + Broadcast EQ (`scripts/tts.py`)
* **Kokoro 82M Local ONNX (offline + custom voice blending):**
  ```bash
  python scripts/tts.py --engine kokoro --voice "am_michael:0.7,am_fenrir:0.3" --text "Your script." --out <name>
  ```
* **Edge Neural TTS (exact hardware `WordBoundary` millisecond timestamps):**
  ```bash
  python scripts/tts.py --engine edge --voice en-US-AndrewMultilingualNeural --text "Your script." --out <name>
  ```

### C. Sound Design & Sidechain Ducking Mixer (`scripts/sfx.py`)
```bash
python scripts/sfx.py --voiceover public/audio/<vo-name>.wav --cues "0.05:impact,3.35:whoosh,3.5:shimmer,6.9:whoosh,10.2:whoosh,10.35:impact" --out <master-name>
npx remotion render src/index.ts CommercialAd out/<ad-name>.mp4 --props=./public/audio/<master-name>-props.json
```

### D. Local AI Video (`ComfyUI Wan 2.1 T2V / I2V` + `Diffusers` via `scripts/generate_video.py`)
```bash
# Install & launch local ComfyUI API server (vendor/ComfyUI):
npm run comfy:setup && npm run comfy:serve

# Text-to-Video (or pass `--backend comfyui --image still.png` for Image-to-Video):
python scripts/generate_video.py --prompt "Detailed visual prompt..." --aspect 16:9 --frames 49 --fps-upsample 32 --out <clip-name>
npx remotion render src/index.ts AiVideoShowcase out/<final-name>.mp4 --props=./public/video/<clip-name>-props.json
```
