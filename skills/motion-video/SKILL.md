---
name: motion-video
description: >-
  Build and render professional motion advertisements, technical explainers, social media shorts,
  3D visualizers, local AI video clips (Wan 2.1), and still-image storyboard videos using the
  central Antigravity Motion Studio repository (__STUDIO_PATH__). Trigger this skill whenever the
  user asks to create a video, commercial ad, promo clip, explainer animation, or turn still images
  and a script/storyline into a video from any project or workspace.
---

# Antigravity Motion Studio Skill

Use the central motion studio repository at `__STUDIO_PATH__` to produce videos for **any** project without duplicating `node_modules` or AI/TTS model weights.

## 1. Fast Path: Still Images + Script/Storyline → Finished Video (`StoryboardAd`)
When the user provides **still images** (screenshots, product renders, photos) and a **script/storyline**:

1. **Build Storyboard Assets (Voiceover + Sidechain Music + SFX + Slide Props):**
   Pass absolute paths to the user's images:
   ```bash
   python "__STUDIO_PATH__/scripts/storyboard.py" \
     --images "/abs/path/to/img1.png,/abs/path/to/img2.png,/abs/path/to/img3.png" \
     --headlines "Scene 1 Headline|Scene 2 Headline|Scene 3 Headline" \
     --script "Sentence one for image one. Sentence two for image two. Sentence three for image three." \
     --brand "BRAND_NAME" \
     --out <video-slug>
   ```
   *(Each sentence in `--script` maps to one image slide in `--images`.)*

2. **Render the Final MP4:**
   ```bash
   cd "__STUDIO_PATH__"
   npx remotion render src/index.ts StoryboardAd out/<video-slug>.mp4 --props=./public/audio/<video-slug>-storyboard-props.json
   ```
   *(On Windows PowerShell, use `npx.cmd remotion ...`. If invoked from another project workspace, copy `__STUDIO_PATH__/out/<video-slug>.mp4` into the user's active workspace when finished.)*

---

## 2. Custom Code / 3D / AI Video Compositions
For custom programmatic scenes, inspect `__STUDIO_PATH__/GEMINI.md` and use the studio's compositions in `__STUDIO_PATH__/src/compositions/`:

* **`CommercialAd`** (`src/compositions/CommercialAd.tsx`): Multi-scene agency product launch spot (`<TransitionSeries>`, `<CameraMotionBlur>`, `@react-three/drei` 3D hardware, `evolvePath` telemetry).
* **`StoryboardAd`** (`src/compositions/StoryboardAd.tsx`): Still images + script/storyline animated with 2.5D camera motion (`zoom-in`, `pan-right`, `tilt-3d`, `zoom-out`), kinetic headlines, and synced subtitles.
* **`TechExplainer`** (`src/compositions/TechExplainer.tsx`): 16:9 architecture & live code walkthrough.
* **`SocialShort`** (`src/compositions/SocialShort.tsx`): 9:16 vertical short with kinetic word-by-word captions.
* **`ThreeVisualizer`** (`src/compositions/ThreeVisualizer.tsx`): 3D WebGL audio-reactive visualizer.
* **`AiVideoShowcase`** (`src/compositions/AiVideoShowcase.tsx`) + `scripts/generate_video.py`: Dual-backend local `Wan 2.1` generator supporting established **ComfyUI API workflows** (`workflows/comfyui/wan21_t2v_api.json` for Text-to-Video & `workflows/comfyui/wan21_i2v_api.json` via `--backend comfyui --image <path>` for Image-to-Video) plus standalone `diffusers` (`--fps-upsample 32` for optical-flow smoothing). Setup/launch ComfyUI via `npm run comfy:setup` and `npm run comfy:serve`.

### Audio & Sound Design Tools (`__STUDIO_PATH__/scripts/`)
* **`scripts/tts.py`**:
  * Local Kokoro 82M ONNX with voice blending: `--engine kokoro --voice "am_michael:0.7,am_fenrir:0.3"` or `"af_heart:0.6,af_bella:0.4"`
  * Edge Neural TTS with exact `WordBoundary` timestamps: `--engine edge --voice en-US-AndrewMultilingualNeural`
* **`scripts/sfx.py`**:
  * Mixes voiceover with a 120+ BPM electronic music bed, `-8.5 dB` automatic sidechain ducking, and frame-locked transition SFX (`impact`, `whoosh`, `shimmer`).

## 3. Validation Checklist
1. Run `npm run typecheck` inside `__STUDIO_PATH__` after any TypeScript edits.
2. Render a preview still (`npx remotion still src/index.ts <CompId> out/preview.png --frame=60 --props=...`) and inspect it visually.
3. Render the final `.mp4` and copy it to the user's active project folder if they invoked this skill from outside `__STUDIO_PATH__`.
