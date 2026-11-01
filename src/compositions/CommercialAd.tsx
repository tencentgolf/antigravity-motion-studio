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
import { CameraMotionBlur } from '@remotion/motion-blur';
import { evolvePath } from '@remotion/paths';
import { noise2D } from '@remotion/noise';
import { loadFont as loadJakarta } from '@remotion/google-fonts/PlusJakartaSans';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { ThreeCanvas } from '@remotion/three';
import { Float, RoundedBox, Sparkles } from '@react-three/drei';
import { getProceduralSpectrum, secToFrames, VoiceoverMetadata } from '../lib/timing';

const { fontFamily: displayFont } = loadJakarta('normal', {
  weights: ['500', '700', '800'],
  subsets: ['latin'],
});
const { fontFamily: monoFont } = loadMono('normal', {
  weights: ['500', '700'],
  subsets: ['latin'],
});

export interface CommercialAdProps {
  brandName: string;
  tagline: string;
  ctaUrl: string;
  voiceover?: VoiceoverMetadata | null;
}

/**
 * Scene 1: High-Impact Kinetic Typography Hook + Shutter Motion Blur
 */
const HookScene: React.FC<{ brandName: string }> = ({ brandName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const punch = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.7 },
  });
  const subReveal = spring({
    frame: frame - 14,
    fps,
    config: { damping: 15, stiffness: 140 },
  });

  const driftX = noise2D('hook-x', frame * 0.015, 0) * 10;
  const driftY = noise2D('hook-y', 0, frame * 0.015) * 10;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#05070e',
        backgroundImage:
          'radial-gradient(circle at 50% 40%, rgba(56, 189, 248, 0.25) 0%, rgba(168, 85, 247, 0.12) 45%, transparent 75%)',
        fontFamily: displayFont,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <CameraMotionBlur shutterAngle={180} samples={6}>
        <div
          style={{
            transform: `translate(${driftX}px, ${driftY}px) scale(${interpolate(
              punch,
              [0, 1],
              [0.65, 1]
            )})`,
            textAlign: 'center',
            padding: '0 96px',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '10px 28px',
              borderRadius: 999,
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.55)',
              color: '#38bdf8',
              fontFamily: monoFont,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 32,
            }}
          >
            {brandName} • STUDIO ENGINE
          </div>
          <div
            style={{
              fontSize: 112,
              fontWeight: 900,
              lineHeight: 0.98,
              letterSpacing: -4,
              color: '#ffffff',
            }}
          >
            STOP EDITING.
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #38bdf8 0%, #c084fc 55%, #f472b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              START COMPILING.
            </span>
          </div>
          <div
            style={{
              opacity: subReveal,
              transform: `translateY(${interpolate(subReveal, [0, 1], [28, 0])}px)`,
              fontSize: 34,
              color: '#94a3b8',
              marginTop: 32,
              fontWeight: 500,
            }}
          >
            Agency-grade motion ads driven by TypeScript, Three.js & AI.
          </div>
        </div>
      </CameraMotionBlur>
    </AbsoluteFill>
  );
};

/**
 * Scene 2: 3D Hero Product Showcase powered by `@react-three/drei`
 */
const Hero3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const timeSec = frame / fps;

  const cardEnter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const rotY = interpolate(frame, [0, 110], [-0.55, 0.45]);
  const rotX = Math.sin(timeSec * 2.0) * 0.12;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#060913',
        backgroundImage:
          'radial-gradient(circle at 70% 50%, rgba(56, 189, 248, 0.22) 0%, transparent 60%)',
        fontFamily: displayFont,
      }}
    >
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0.2, 6.2], fov: 42 }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[5, 8, 5]} intensity={2.6} color="#38bdf8" />
        <directionalLight position={[-6, -4, 3]} intensity={1.8} color="#c084fc" />
        <pointLight position={[0, 3, 4]} intensity={1.5} color="#ffffff" />

        <Sparkles count={60} scale={8} size={3} speed={0.4} color="#38bdf8" />

        <Float speed={2} rotationIntensity={0.25} floatIntensity={0.4}>
          <group
            position={[1.45, 0, 0]}
            rotation={[rotX, rotY, 0]}
            scale={interpolate(cardEnter, [0, 1], [0.3, 1.05])}
          >
            {/* Outer Sleek Anodized Slab */}
            <RoundedBox args={[3.4, 2.15, 0.22]} radius={0.14} smoothness={6}>
              <meshPhysicalMaterial
                color="#0f172a"
                metalness={0.85}
                roughness={0.15}
                clearcoat={1}
                clearcoatRoughness={0.1}
              />
            </RoundedBox>

            {/* Glowing Cyan Accent Bezel */}
            <RoundedBox
              args={[3.15, 1.9, 0.25]}
              radius={0.1}
              smoothness={4}
            >
              <meshStandardMaterial
                color="#1e293b"
                emissive="#0284c7"
                emissiveIntensity={0.45}
                metalness={0.6}
                roughness={0.25}
              />
            </RoundedBox>

            {/* Floating 3D Core Emblem */}
            <mesh position={[0, 0, 0.32]} rotation={[timeSec * 1.2, timeSec * 1.6, 0]}>
              <octahedronGeometry args={[0.52, 0]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#38bdf8"
                emissiveIntensity={0.7}
                wireframe
              />
            </mesh>
          </group>
        </Float>
      </ThreeCanvas>

      {/* Left Copy Overlay */}
      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 0,
          bottom: 0,
          width: 760,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: monoFont,
            color: '#38bdf8',
            fontSize: 20,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          01 // PHYSICALLY BASED 3D
        </div>
        <h2
          style={{
            fontSize: 74,
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: -2.5,
          }}
        >
          Studio 3D Lighting.
          <br />
          Zero Render Farm.
        </h2>
        <p
          style={{
            fontSize: 28,
            color: '#94a3b8',
            marginTop: 24,
            lineHeight: 1.45,
          }}
        >
          React Three Fiber + Drei primitives locked deterministically to every
          frame on your local RTX GPU.
        </p>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Scene 3: Bento Metrics + `@remotion/paths` Vector Stroke Evolution
 */
const BentoMetricsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pathProgress = interpolate(frame, [5, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const curvePath = 'M 40 220 C 160 210, 220 140, 340 130 C 460 120, 520 45, 680 28';
  const evolved = evolvePath(pathProgress, curvePath);

  const cards = [
    { label: 'RENDER PIPELINE', value: '60 FPS', sub: 'Deterministic WebGL + Shutter Blur', color: '#38bdf8' },
    { label: 'AUDIO & SFX', value: '-8.5 dB', sub: 'Auto Sidechain Ducking + EQ', color: '#c084fc' },
    { label: 'LOCAL AI VIDEO', value: 'Wan 2.1', sub: 'Photorealistic B-Roll on RTX 4080', color: '#34d399' },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#070a14',
        padding: '84px 96px',
        fontFamily: displayFont,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: monoFont,
            fontSize: 20,
            color: '#c084fc',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          02 // TELEMETRY & PRECISION
        </div>
        <h2 style={{ fontSize: 64, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: -2 }}>
          Built Like Software. Graded Like Cinema.
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 36, alignItems: 'stretch' }}>
        {/* Left: Animated SVG Growth Chart using `@remotion/paths` */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            borderRadius: 28,
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: 40,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>
              Production Velocity
            </span>
            <span
              style={{
                fontFamily: monoFont,
                fontSize: 22,
                color: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.14)',
                padding: '6px 16px',
                borderRadius: 999,
              }}
            >
              +10x Faster
            </span>
          </div>

          <svg width="720" height="250" viewBox="0 0 720 250" style={{ overflow: 'visible' }}>
            <path
              d={curvePath}
              fill="none"
              stroke="rgba(148, 163, 184, 0.15)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <path
              d={curvePath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={evolved.strokeDasharray}
              strokeDashoffset={evolved.strokeDashoffset}
            />
          </svg>

          <div style={{ fontFamily: monoFont, fontSize: 19, color: '#64748b' }}>
            evolvePath() • Deterministic Vector Stroke Choreography
          </div>
        </div>

        {/* Right: 3 Feature Bento Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {cards.map((c, idx) => {
            const p = spring({
              frame: frame - idx * 8,
              fps,
              config: { damping: 14, stiffness: 150 },
            });
            return (
              <div
                key={c.label}
                style={{
                  opacity: p,
                  transform: `translateX(${interpolate(p, [0, 1], [40, 0])}px)`,
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderRadius: 22,
                  border: `1px solid ${c.color}55`,
                  padding: '24px 32px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontFamily: monoFont, fontSize: 16, color: c.color, letterSpacing: 1.5 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 22, color: '#cbd5e1', marginTop: 6 }}>{c.sub}</div>
                </div>
                <div style={{ fontSize: 44, fontWeight: 900, color: '#ffffff', letterSpacing: -1 }}>
                  {c.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Scene 4: Final Call-To-Action Lockup
 */
const CtaOutroScene: React.FC<{
  brandName: string;
  tagline: string;
  ctaUrl: string;
}> = ({ brandName, tagline, ctaUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleIn = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 150 },
  });
  const spectrum = getProceduralSpectrum(frame, fps, 32, 122);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#05070e',
        backgroundImage:
          'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.28) 0%, rgba(168, 85, 247, 0.16) 50%, transparent 80%)',
        fontFamily: displayFont,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(scaleIn, [0, 1], [0.8, 1])})`,
          opacity: scaleIn,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: -3.5,
            marginBottom: 16,
          }}
        >
          {brandName}
        </div>
        <div style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 48 }}>
          {tagline}
        </div>
        <div
          style={{
            display: 'inline-block',
            padding: '22px 56px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #38bdf8 0%, #a855f7 100%)',
            color: '#05070e',
            fontFamily: monoFont,
            fontSize: 30,
            fontWeight: 800,
            boxShadow: '0 0 50px rgba(56, 189, 248, 0.5)',
          }}
        >
          {ctaUrl}
        </div>
      </div>

      {/* Bottom Audio Spectrum */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          height: 64,
        }}
      >
        {spectrum.map((v, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: `${Math.round(v * 58)}px`,
              borderRadius: 999,
              backgroundColor: '#38bdf8',
              opacity: 0.7,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const CommercialAd: React.FC<CommercialAdProps> = ({
  brandName,
  tagline,
  ctaUrl,
  voiceover,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  const activeSegment = voiceover?.segments.find(
    (s) => timeSec >= s.startSec && timeSec <= s.endSec + 0.2
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#05070e' }}>
      {voiceover?.audioFile ? (
        <Audio src={staticFile(voiceover.audioFile)} />
      ) : null}

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={secToFrames(3.6, fps)}>
          <HookScene brandName={brandName} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: 14 })}
        />

        <TransitionSeries.Sequence durationInFrames={secToFrames(3.8, fps)}>
          <Hero3DScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: 14 })}
        />

        <TransitionSeries.Sequence durationInFrames={secToFrames(3.8, fps)}>
          <BentoMetricsScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />

        <TransitionSeries.Sequence durationInFrames={secToFrames(3.8, fps)}>
          <CtaOutroScene
            brandName={brandName}
            tagline={tagline}
            ctaUrl={ctaUrl}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Subtle Word-Synced Commercial Subtitle Pill */}
      {activeSegment ? (
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '10px 26px',
              borderRadius: 999,
              backgroundColor: 'rgba(5, 7, 14, 0.82)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              backdropFilter: 'blur(10px)',
              fontFamily: displayFont,
              fontSize: 24,
              fontWeight: 600,
              color: '#f8fafc',
              display: 'flex',
              gap: 8,
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
