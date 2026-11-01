import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadJakarta } from '@remotion/google-fonts/PlusJakartaSans';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { secToFrames, VoiceoverMetadata } from '../lib/timing';

const { fontFamily: displayFont } = loadJakarta('normal', {
  weights: ['500', '700', '800'],
  subsets: ['latin'],
});
const { fontFamily: monoFont } = loadMono('normal', {
  weights: ['500', '700'],
  subsets: ['latin'],
});

export interface StudioGuideProps {
  title: string;
  voiceover?: VoiceoverMetadata | null;
}

interface IntroFeature {
  tag: string;
  title: string;
  desc: string;
  module: string;
  accent: string;
}

const INTRO_FEATURES: IntroFeature[] = [
  {
    tag: 'STORYBOARD PIPELINE',
    title: 'Stills + Script → Commercial',
    desc: 'Turn product screenshots, photos, and a script into a 2.5D animated ad with kinetic lower-thirds.',
    module: 'scripts/storyboard.py',
    accent: '#38bdf8',
  },
  {
    tag: '3D & MOTION GRAPHICS',
    title: 'Code-First Agency Ads',
    desc: 'Replace manual keyframing with Remotion v4, React Three Fiber, Drei studio lighting & shutter blur.',
    module: 'CommercialAd & TechExplainer',
    accent: '#c084fc',
  },
  {
    tag: 'BROADCAST AUDIO DSP',
    title: 'Voice Blending & Auto-Ducking',
    desc: 'Blend local Kokoro 82M voices or Edge Neural word timings with -8.5 dB sidechain music & SFX.',
    module: 'scripts/tts.py + sfx.py',
    accent: '#34d399',
  },
  {
    tag: 'MULTI-AGENT & COMFYUI WAN 2.1',
    title: 'Gemini, Claude, Codex + ComfyUI',
    desc: 'Trigger builds via agent skills, or run established ComfyUI Wan 2.1 Text-to-Video & Image-to-Video workflows.',
    module: 'workflows/comfyui/ + SKILL.md',
    accent: '#fb923c',
  },
];

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heroEnter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 130 },
  });

  const pipelineEnter = spring({
    frame: frame - 18,
    fps,
    config: { damping: 15, stiffness: 140 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#060913',
        backgroundImage:
          'radial-gradient(circle at 20% 18%, rgba(56, 189, 248, 0.22) 0%, transparent 50%), radial-gradient(circle at 82% 28%, rgba(192, 132, 252, 0.18) 0%, transparent 48%), radial-gradient(circle at 50% 85%, rgba(52, 211, 153, 0.12) 0%, transparent 55%)',
        fontFamily: displayFont,
        padding: '58px 84px 116px 84px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#f8fafc',
      }}
    >
      {/* Hero Header */}
      <div
        style={{
          opacity: heroEnter,
          transform: `translateY(${interpolate(heroEnter, [0, 1], [24, 0])}px)`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ maxWidth: 1320 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 20px',
              borderRadius: 999,
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              color: '#38bdf8',
              fontFamily: monoFont,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 18,
            }}
          >
            <span>WHAT THIS REPO IS FOR // OPEN-SOURCE AI VIDEO STUDIO</span>
          </div>

          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              margin: 0,
              letterSpacing: -2.4,
              lineHeight: 1.04,
            }}
          >
            Antigravity{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #38bdf8 0%, #c084fc 55%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Motion Studio
            </span>
          </h1>

          <p
            style={{
              fontSize: 26,
              color: '#cbd5e1',
              margin: '16px 0 0 0',
              lineHeight: 1.42,
              maxWidth: 1240,
            }}
          >
            An AI-native video engine that gives{' '}
            <strong style={{ color: '#38bdf8' }}>Gemini</strong>,{' '}
            <strong style={{ color: '#c084fc' }}>Claude Code</strong>, and{' '}
            <strong style={{ color: '#34d399' }}>OpenAI Codex</strong> the ability to turn
            prompts, still images, and scripts into broadcast-ready 1080p commercials,
            3D product launches, and technical explainers.
          </p>
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderRadius: 18,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            fontFamily: monoFont,
            fontSize: 20,
            fontWeight: 700,
            color: '#38bdf8',
            textAlign: 'right',
          }}
        >
          <div>OVERVIEW</div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
            REMOTION V4 · R3F · COMFYUI
          </div>
        </div>
      </div>

      {/* 4 Core Pillars Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 22,
        }}
      >
        {INTRO_FEATURES.map((feat, idx) => {
          const cardPop = spring({
            frame: frame - (idx * 6 + 6),
            fps,
            config: { damping: 14, stiffness: 150 },
          });
          return (
            <div
              key={feat.title}
              style={{
                opacity: cardPop,
                transform: `translateY(${interpolate(cardPop, [0, 1], [20, 0])}px)`,
                backgroundColor: 'rgba(11, 16, 30, 0.9)',
                borderRadius: 22,
                border: `1px solid ${feat.accent}44`,
                borderLeft: `5px solid ${feat.accent}`,
                padding: '24px 30px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: monoFont,
                    fontSize: 15,
                    fontWeight: 700,
                    color: feat.accent,
                    letterSpacing: 1.5,
                  }}
                >
                  {feat.tag}
                </span>
                <span
                  style={{
                    fontFamily: monoFont,
                    fontSize: 14,
                    color: '#94a3b8',
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                >
                  {feat.module}
                </span>
              </div>

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: '#f8fafc',
                  letterSpacing: -0.6,
                }}
              >
                {feat.title}
              </div>

              <div
                style={{
                  fontSize: 19,
                  color: '#94a3b8',
                  lineHeight: 1.38,
                }}
              >
                {feat.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom End-to-End Pipeline Strip */}
      <div
        style={{
          opacity: pipelineEnter,
          transform: `translateY(${interpolate(pipelineEnter, [0, 1], [14, 0])}px)`,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderRadius: 18,
          border: '1px solid rgba(148, 163, 184, 0.22)',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: monoFont,
          fontSize: 17,
          fontWeight: 700,
        }}
      >
        <span style={{ color: '#38bdf8' }}>1. PROMPT / STILLS + SCRIPT</span>
        <span style={{ color: '#475569' }}>───►</span>
        <span style={{ color: '#c084fc' }}>2. AI AGENT (GEMINI · CLAUDE · CODEX)</span>
        <span style={{ color: '#475569' }}>───►</span>
        <span style={{ color: '#34d399' }}>3. COMFYUI WAN 2.1 + KOKORO TTS</span>
        <span style={{ color: '#475569' }}>───►</span>
        <span style={{ color: '#fb923c' }}>4. REMOTION 3D / 1080P MP4</span>
      </div>
    </AbsoluteFill>
  );
};

interface GuideStep {
  stepNumber: string;
  badge: string;
  title: string;
  subtitle: string;
  accent: string;
  terminalTitle: string;
  commands: { cmd: string; comment: string }[];
  highlights: { label: string; value: string }[];
}

const GUIDE_STEPS: GuideStep[] = [
  {
    stepNumber: '01',
    badge: 'STEP 1 // PREREQUISITES & SETUP',
    title: 'Clone & Install in 60 Seconds',
    subtitle:
      'One unified TypeScript + Python studio powered by Remotion v4, React Three Fiber, Kokoro 82M, and ComfyUI.',
    accent: '#38bdf8',
    terminalTitle: 'bash — setup studio & comfyui',
    commands: [
      {
        cmd: 'git clone https://github.com/tencentgolf/antigravity-motion-studio.git',
        comment: '# Clone the studio repository',
      },
      {
        cmd: 'npm install --legacy-peer-deps && pip install -r requirements.txt',
        comment: '# Install Remotion, Three.js, Drei & Audio DSP packages',
      },
      {
        cmd: 'npm run models:kokoro && npm run comfy:setup',
        comment: '# Download Kokoro 82M voices + install local ComfyUI & VideoHelperSuite',
      },
    ],
    highlights: [
      { label: 'Node.js', value: 'v20+ & Remotion v4' },
      { label: 'ComfyUI + Wan', value: 'T2V & I2V API Workflows' },
      { label: 'WebGL / NVENC', value: 'Hardware GPU Acceleration' },
    ],
  },
  {
    stepNumber: '02',
    badge: 'STEP 2 // MULTI-AGENT SKILL INTEGRATION',
    title: 'Works With Gemini, Claude & Codex',
    subtitle:
      'Auto-discovered inside this repo via GEMINI.md, CLAUDE.md, and AGENTS.md—or install globally across all your projects.',
    accent: '#c084fc',
    terminalTitle: 'bash — install global skill',
    commands: [
      {
        cmd: 'python scripts/install_skill.py --target antigravity',
        comment: '# Install to ~/.gemini/config/skills/motion-video/',
      },
      {
        cmd: 'python scripts/install_skill.py --target claude',
        comment: '# Install to ~/.claude/skills/ + /motion-video command',
      },
      {
        cmd: 'python scripts/install_skill.py --target codex',
        comment: '# Install to ~/.codex/skills/motion-video/',
      },
    ],
    highlights: [
      { label: 'Antigravity', value: 'GEMINI.md + .agents/skills' },
      { label: 'Claude Code', value: 'CLAUDE.md + /motion-video' },
      { label: 'OpenAI Codex', value: 'AGENTS.md + .agents/skills' },
    ],
  },
  {
    stepNumber: '03',
    badge: 'STEP 3 // VOICEOVER & SOUND DESIGN',
    title: 'Human Voice Blending & Sidechain SFX',
    subtitle:
      'Blend Kokoro 82M voices or stream Edge Neural WordBoundary timestamps, then auto-duck music by -8.5 dB with transition SFX.',
    accent: '#34d399',
    terminalTitle: 'bash — voice & sound design',
    commands: [
      {
        cmd: 'python scripts/tts.py --engine kokoro --voice "am_michael:0.7,am_fenrir:0.3" --out vo',
        comment: '# 80Hz HPF + 180Hz Warmth EQ + 3.6kHz Presence + Compressor',
      },
      {
        cmd: 'python scripts/sfx.py --voiceover public/audio/vo.wav --cues "0.05:impact,3.5:whoosh" --out master',
        comment: '# 120 BPM backing track + -8.5 dB vocal sidechain ducking',
      },
    ],
    highlights: [
      { label: 'Kokoro 82M', value: 'Custom Voice Vector Blending' },
      { label: 'Edge Neural', value: 'Millisecond Word Boundaries' },
      { label: 'Master Mix', value: '-8.5 dB Sidechain + SFX Cues' },
    ],
  },
  {
    stepNumber: '04',
    badge: 'STEP 4 // STORYBOARD, 3D ADS & COMFYUI WAN 2.1',
    title: 'Stills, Scripts & ComfyUI Workflows to MP4',
    subtitle:
      'Turn screenshots and a script into a commercial, or animate still images with ComfyUI Wan 2.1 Image-to-Video workflows.',
    accent: '#fb923c',
    terminalTitle: 'bash — storyboard, comfyui wan 2.1 & render',
    commands: [
      {
        cmd: 'python scripts/storyboard.py --images "shot1.png,shot2.png" --headlines "Hook|Launch" --script "..." --out promo',
        comment: '# Auto-builds slides, voiceover, sidechain SFX & timing props',
      },
      {
        cmd: 'python scripts/generate_video.py --backend comfyui --image shot1.png --prompt "3D camera push-in" --out broll',
        comment: '# Run established ComfyUI Wan 2.1 T2V or Image-to-Video (I2V) API workflow',
      },
      {
        cmd: 'npx remotion render src/index.ts StoryboardAd out/promo.mp4 --props=./public/audio/promo-storyboard-props.json',
        comment: '# Render final 1080p H.264 MP4 with GPU hardware acceleration',
      },
    ],
    highlights: [
      { label: 'StoryboardAd', value: 'Stills + Script → 2.5D Video' },
      { label: 'ComfyUI API', value: 'Wan 2.1 T2V & I2V Workflows' },
      { label: 'CommercialAd', value: 'Drei 3D + Shutter Motion Blur' },
    ],
  },
];

const StepScene: React.FC<{ step: GuideStep }> = ({ step }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerEnter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 140 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#060913',
        backgroundImage: `radial-gradient(circle at 18% 20%, ${step.accent}24 0%, transparent 50%), radial-gradient(circle at 85% 80%, rgba(56, 189, 248, 0.12) 0%, transparent 55%)`,
        fontFamily: displayFont,
        padding: '64px 84px 116px 84px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#f8fafc',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          opacity: headerEnter,
          transform: `translateY(${interpolate(headerEnter, [0, 1], [20, 0])}px)`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ maxWidth: 1280 }}>
          <div
            style={{
              display: 'inline-block',
              padding: '7px 18px',
              borderRadius: 999,
              backgroundColor: `${step.accent}1f`,
              border: `1px solid ${step.accent}66`,
              color: step.accent,
              fontFamily: monoFont,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 16,
            }}
          >
            {step.badge}
          </div>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 900,
              margin: 0,
              letterSpacing: -2,
              lineHeight: 1.06,
            }}
          >
            {step.title}
          </h1>
          <p
            style={{
              fontSize: 25,
              color: '#94a3b8',
              margin: '12px 0 0 0',
              lineHeight: 1.4,
            }}
          >
            {step.subtitle}
          </p>
        </div>

        <div
          style={{
            padding: '14px 26px',
            borderRadius: 18,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: `1px solid ${step.accent}55`,
            fontFamily: monoFont,
            fontSize: 24,
            fontWeight: 700,
            color: step.accent,
          }}
        >
          STEP {step.stepNumber} / 04
        </div>
      </div>

      {/* Center Terminal Window */}
      <div
        style={{
          backgroundColor: '#0b101e',
          borderRadius: 24,
          border: `1px solid ${step.accent}44`,
          boxShadow: '0 28px 65px rgba(0, 0, 0, 0.7)',
          padding: '28px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
            paddingBottom: 16,
          }}
        >
          <div style={{ width: 13, height: 13, borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ width: 13, height: 13, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <div style={{ width: 13, height: 13, borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span
            style={{
              marginLeft: 12,
              fontFamily: monoFont,
              fontSize: 17,
              color: '#64748b',
            }}
          >
            {step.terminalTitle}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {step.commands.map((c, idx) => {
            const p = spring({
              frame: frame - (idx * 10 + 6),
              fps,
              config: { damping: 14, stiffness: 150 },
            });
            return (
              <div
                key={idx}
                style={{
                  opacity: p,
                  transform: `translateX(${interpolate(p, [0, 1], [24, 0])}px)`,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  borderLeft: `4px solid ${step.accent}`,
                  borderRadius: 12,
                  padding: '14px 20px',
                  fontFamily: monoFont,
                }}
              >
                <div style={{ fontSize: 16, color: '#64748b', marginBottom: 6 }}>
                  {c.comment}
                </div>
                <div style={{ fontSize: 21, color: '#f8fafc', fontWeight: 700 }}>
                  <span style={{ color: step.accent, marginRight: 12 }}>$</span>
                  {c.cmd}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 3 Pill Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {step.highlights.map((h, i) => {
          const cardPop = spring({
            frame: frame - (i * 6 + 14),
            fps,
            config: { damping: 14, stiffness: 150 },
          });
          return (
            <div
              key={h.label}
              style={{
                opacity: cardPop,
                transform: `translateY(${interpolate(cardPop, [0, 1], [16, 0])}px)`,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                borderRadius: 18,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                padding: '18px 26px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: monoFont,
                  fontSize: 16,
                  color: step.accent,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                }}
              >
                {h.label}
              </span>
              <span style={{ fontSize: 21, fontWeight: 700, color: '#e2e8f0' }}>
                {h.value}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const StudioGuide: React.FC<StudioGuideProps> = ({ voiceover }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  const transitionFrames = 12;
  const totalScenes = 1 + GUIDE_STEPS.length;

  const sceneDurations = Array.from({ length: totalScenes }, (_, idx) => {
    const seg = voiceover?.segments[idx];
    if (seg) {
      const nextSeg = voiceover?.segments[idx + 1];
      const endBound = nextSeg
        ? nextSeg.startSec
        : (voiceover?.durationSec ?? seg.endSec + 0.8);
      const durSec = Math.max(3.5, endBound - seg.startSec);
      return (
        secToFrames(durSec, fps) +
        (idx < totalScenes - 1 ? transitionFrames : 0)
      );
    }
    return (
      secToFrames(idx === 0 ? 6.0 : 5.0, fps) +
      (idx < totalScenes - 1 ? transitionFrames : 0)
    );
  });

  const activeSegment = voiceover?.segments.find(
    (s) => timeSec >= s.startSec && timeSec <= s.endSec + 0.25
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#060913' }}>
      {voiceover?.audioFile ? (
        <Audio src={staticFile(voiceover.audioFile)} />
      ) : null}

      <TransitionSeries>
        {/* Opener / Intro Scene */}
        <TransitionSeries.Sequence durationInFrames={sceneDurations[0]}>
          <IntroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* 4 Instructional Steps */}
        {GUIDE_STEPS.map((step, idx) => {
          const dur = sceneDurations[idx + 1];
          const isLast = idx === GUIDE_STEPS.length - 1;
          return (
            <React.Fragment key={step.stepNumber}>
              <TransitionSeries.Sequence durationInFrames={dur}>
                <StepScene step={step} />
              </TransitionSeries.Sequence>
              {!isLast ? (
                <TransitionSeries.Transition
                  presentation={
                    idx % 2 === 0
                      ? slide({ direction: 'from-right' })
                      : fade()
                  }
                  timing={linearTiming({ durationInFrames: transitionFrames })}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* Bottom Word-Synced Narration Subtitle Bar */}
      {activeSegment ? (
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 84,
            right: 84,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '10px 26px',
              borderRadius: 999,
              backgroundColor: 'rgba(11, 16, 30, 0.92)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              backdropFilter: 'blur(12px)',
              fontFamily: displayFont,
              fontSize: 22,
              fontWeight: 600,
              color: '#f8fafc',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '5px 8px',
            }}
          >
            {activeSegment.words.map((w, idx) => {
              const isCurrent = timeSec >= w.startSec && timeSec <= w.endSec;
              return (
                <span
                  key={idx}
                  style={{
                    color: isCurrent ? '#38bdf8' : '#e2e8f0',
                    fontWeight: isCurrent ? 800 : 500,
                  }}
                >
                  {w.word}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
