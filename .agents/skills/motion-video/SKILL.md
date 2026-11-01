---
name: motion-video
description: >-
  Build and render professional motion advertisements, technical explainers, social media shorts,
  3D visualizers, local AI video clips (Wan 2.1), and still-image storyboard videos using the
  Antigravity Motion Studio repository. Trigger this skill whenever the user asks to create a
  video, commercial ad, promo clip, explainer animation, or turn still images and a script/storyline
  into a video.
---

# Antigravity Motion Studio Skill

Use this repository's motion studio pipeline to produce videos from code, 3D scenes, local AI video models, or still images + a script.

## 1. Fast Path: Still Images + Script/Storyline → Finished Video (`StoryboardAd`)
When the user provides **still images** (screenshots, product renders, photos) and a **script/storyline**:

1. **Build Storyboard Assets (Voiceover + Sidechain Music + SFX + Slide Props):**
   ```bash
   python scripts/storyboard.py \
     --images "/abs/path/to/img1.png,/abs/path/to/img2.png,/abs/path/to/img3.png" \
     --headlines "Scene 1 Headline|Scene 2 Headline|Scene 3 Headline" \
     --script "Sentence one for image one. Sentence two for image two. Sentence three for image three." \
     --brand "BRAND_NAME" \
     --out <video-slug>
   ```
   *(Each sentence in `--script` maps to one image slide in `--images`.)*

2. **Render the Final MP4:**
   ```bash
   npx remotion render src/index.ts StoryboardAd out/<video-slug>.mp4 --props=./public/audio/<video-slug>-storyboard-props.json
   ```

---

## 2. Custom Code / 3D / AI Video Compositions
Inspect `GEMINI.md` / `CLAUDE.md` / `AGENTS.md` and use the compositions in `src/compositions/`:

* **`CommercialAd`** (`src/compositions/CommercialAd.tsx`): Multi-scene agency product launch spot (`<TransitionSeries>`, `<CameraMotionBlur>`, `@react-three/drei` 3D hardware, `evolvePath` telemetry).
* **`StoryboardAd`** (`src/compositions/StoryboardAd.tsx`): Still images + script/storyline animated with 2.5D camera motion (`zoom-in`, `pan-right`, `tilt-3d`, `zoom-out`), kinetic headlines, and synced subtitles.
* **`TechExplainer`** (`src/compositions/TechExplainer.tsx`): 16:9 architecture & live code walkthrough.
* **`SocialShort`** (`src/compositions/SocialShort.tsx`): 9:16 vertical short with kinetic word-by-word captions.
* **`ThreeVisualizer`** (`src/compositions/ThreeVisualizer.tsx`): 3D WebGL audio-reactive visualizer.
* **`AiVideoShowcase`** (`src/compositions/AiVideoShowcase.tsx`) + `scripts/generate_video.py`: Dual-backend local `Wan 2.1` generator supporting established **ComfyUI API workflows** (`workflows/comfyui/wan21_t2v_api.json` for Text-to-Video & `workflows/comfyui/wan21_i2v_api.json` via `--backend comfyui --image <path>` for Image-to-Video) plus standalone `diffusers` (`--fps-upsample 32` for optical-flow smoothing). Setup/launch ComfyUI via `npm run comfy:setup` and `npm run comfy:serve`.

### Audio & Sound Design Tools (`scripts/`)
* **`scripts/tts.py`**:
  * Local Kokoro 82M ONNX with voice blending: `--engine kokoro --voice "am_michael:0.7,am_fenrir:0.3"` or `"af_heart:0.6,af_bella:0.4"`
  * Edge Neural TTS with exact `WordBoundary` timestamps: `--engine edge --voice en-US-AndrewMultilingualNeural`
  * External audio ingest + Whisper word alignment: `--audio-in path/to/recording.wav`
  * Zero-shot local voice cloning + Whisper word alignment: `--clone-voice path/to/ref_10s.wav --text "..."`
* **`scripts/sfx.py`**:
  * Mixes voiceover with a 120+ BPM electronic music bed, `-8.5 dB` automatic sidechain ducking, and frame-locked transition SFX (`impact`, `whoosh`, `shimmer`).
