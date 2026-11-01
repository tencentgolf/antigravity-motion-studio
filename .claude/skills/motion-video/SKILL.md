---
name: motion-video
description: >-
  Build and render professional motion advertisements, technical explainers, social media shorts,
  3D visualizers, local AI video clips (Wan 2.1), and still-image storyboard videos using the
  Antigravity Motion Studio repository. Trigger this skill whenever the user asks to create a
  video, commercial ad, promo clip, explainer animation, or turn still images and a script/storyline
  into a video.
---

# Antigravity Motion Studio Skill (Claude Code)

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
2. **Render the Final MP4:**
   ```bash
   npx remotion render src/index.ts StoryboardAd out/<video-slug>.mp4 --props=./public/audio/<video-slug>-storyboard-props.json
   ```

## 2. Custom Compositions, ComfyUI Wan 2.1 & Audio Tools
See `CLAUDE.md` at the repository root for full documentation on `CommercialAd`, `TechExplainer`, `SocialShort`, `ThreeVisualizer`, `AiVideoShowcase`, `scripts/tts.py`, `scripts/sfx.py`, `scripts/setup_comfyui.py`, `workflows/comfyui/`, and `scripts/generate_video.py`.
