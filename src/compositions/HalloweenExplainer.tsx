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
import { useStepSpring, VoiceoverMetadata } from '../lib/timing';

export interface HalloweenExplainerProps {
  title: string;
  subtitle: string;
  voiceover?: VoiceoverMetadata | null;
}

interface EraStep {
  era: string;
  title: string;
  detail: string;
  accent: string;
  icon: string;
  defaultStartSec: number;
}

const ERAS: EraStep[] = [
  {
    era: '2,000+ Years Ago • Celtic Origins',
    title: '1. Festival of Samhain',
    detail: 'Marked the end of harvest & the boundary between the living and spirit worlds.',
    accent: '#f97316',
    icon: '🔥',
    defaultStartSec: 0.2,
  },
  {
    era: '8th Century • Christian Influence',
    title: "2. All Hallows' Eve",
    detail: 'The evening before All Saints’ Day (Nov 1) blended sacred vigils with autumn folklore.',
    accent: '#a855f7',
    icon: '🕯️',
    defaultStartSec: 5.5,
  },
  {
    era: '19th Century • Transatlantic Shift',
    title: "3. Jack-o'-Lanterns & Guising",
    detail: 'Irish immigrants brought carved lanterns and costumed door-to-door traditions to America.',
    accent: '#eab308',
    icon: '🎃',
    defaultStartSec: 11.0,
  },
  {
    era: 'Modern Era • Cultural Phenomenon',
    title: '4. Modern Halloween',
    detail: 'Evolved into a global celebration of costumes, spooky storytelling, and neighborhood trick-or-treating.',
    accent: '#38bdf8',
    icon: '🍬',
    defaultStartSec: 16.5,
  },
];

export const HalloweenExplainer: React.FC<HalloweenExplainerProps> = ({
  title,
  subtitle,
  voiceover,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  const headerSpring = useStepSpring(frame, fps, 0);

  // Sync step timings dynamically to voiceover segments when available
  const stepTimings = ERAS.map((step, idx) => {
    const seg = voiceover?.segments[idx];
    const startSec = seg ? seg.startSec : step.defaultStartSec;
    const endSec = seg ? seg.endSec : (ERAS[idx + 1]?.defaultStartSec ?? 22);
    return { ...step, startSec, endSec };
  });

  const activeStepIndex = stepTimings.reduce((acc, s, idx) => {
    if (timeSec >= s.startSec) return idx;
    return acc;
  }, 0);
  const currentStep = stepTimings[activeStepIndex] ?? stepTimings[0];

  const activeSegment = voiceover?.segments.find(
    (s) => timeSec >= s.startSec && timeSec <= s.endSec + 0.25
  );

  // Floating animation for the centerpiece illustration
  const floatY = Math.sin(timeSec * 2.2) * 10;
  const glowPulse = 0.85 + Math.sin(timeSec * 4.0) * 0.15;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#090612',
        backgroundImage:
          'radial-gradient(circle at 18% 20%, rgba(249, 115, 22, 0.16) 0%, transparent 48%), radial-gradient(circle at 82% 75%, rgba(168, 85, 247, 0.18) 0%, transparent 52%)',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '60px 72px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {voiceover?.audioFile ? (
        <Audio src={staticFile(voiceover.audioFile)} />
      ) : null}

      {/* Top Header */}
      <div
        style={{
          opacity: headerSpring,
          transform: `translateY(${interpolate(headerSpring, [0, 1], [24, 0])}px)`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: 999,
              backgroundColor: 'rgba(249, 115, 22, 0.16)',
              border: '1px solid rgba(249, 115, 22, 0.5)',
              color: '#fb923c',
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            History & Cultural Explainer • Oct 31
          </div>
          <h1
            style={{
              fontSize: 60,
              fontWeight: 900,
              margin: 0,
              letterSpacing: -1.5,
              background: 'linear-gradient(90deg, #ffffff 0%, #fdba74 60%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 25, color: '#cbd5e1', margin: '8px 0 0 0' }}>
            {subtitle}
          </p>
        </div>

        {/* Era Progress Pill */}
        <div
          style={{
            padding: '12px 22px',
            borderRadius: 16,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${currentStep.accent}66`,
            fontFamily: 'monospace',
            fontSize: 20,
            color: currentStep.accent,
          }}
        >
          Chapter 0{activeStepIndex + 1} / 0{ERAS.length}
        </div>
      </div>

      {/* Main Split Grid: Timeline Steps + Animated Visual Spotlight */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.25fr 0.95fr',
          gap: 44,
          alignItems: 'center',
          margin: 'auto 0',
        }}
      >
        {/* Left Column: 4 Historical Milestones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {stepTimings.map((item, idx) => {
            const p = useStepSpring(frame, fps, item.startSec);
            const isActive = idx === activeStepIndex;
            const isReached = timeSec >= item.startSec;

            return (
              <div
                key={item.title}
                style={{
                  opacity: isReached ? p : 0.28,
                  transform: `translateX(${interpolate(p, [0, 1], [-36, 0])}px) scale(${
                    isActive ? 1.02 : 1
                  })`,
                  padding: '20px 28px',
                  borderRadius: 20,
                  backgroundColor: isActive
                    ? 'rgba(24, 19, 42, 0.96)'
                    : 'rgba(15, 13, 28, 0.75)',
                  border: `2px solid ${
                    isActive ? item.accent : 'rgba(148, 163, 184, 0.14)'
                  }`,
                  boxShadow: isActive ? `0 0 34px ${item.accent}33` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    backgroundColor: `${item.accent}22`,
                    border: `1px solid ${item.accent}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 34,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                      color: item.accent,
                      marginBottom: 4,
                    }}
                  >
                    {item.era}
                  </div>
                  <div style={{ fontSize: 27, fontWeight: 800, color: '#ffffff' }}>
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 19,
                      color: '#cbd5e1',
                      marginTop: 4,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Animated Visual Stage */}
        <div
          style={{
            height: 520,
            borderRadius: 28,
            backgroundColor: 'rgba(15, 12, 29, 0.9)',
            border: `2px solid ${currentStep.accent}55`,
            boxShadow: `0 25px 60px rgba(0,0,0,0.7), inset 0 0 60px ${currentStep.accent}18`,
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Harvest Moon + Stylized SVG Jack-o'-Lantern Emblem */}
          <div
            style={{
              transform: `translateY(${floatY}px)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 12,
            }}
          >
            <svg width="240" height="240" viewBox="0 0 240 240">
              <defs>
                <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={currentStep.accent} stopOpacity={0.45 * glowPulse} />
                  <stop offset="100%" stopColor={currentStep.accent} stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* Outer aura */}
              <circle cx="120" cy="125" r="110" fill="url(#moonGlow)" />
              {/* Stem */}
              <path
                d="M112 42 C115 24, 132 24, 136 36 C128 38, 125 45, 126 55 Z"
                fill="#15803d"
              />
              {/* Pumpkin Body */}
              <ellipse cx="90" cy="132" rx="48" ry="62" fill="#ea580c" />
              <ellipse cx="150" cy="132" rx="48" ry="62" fill="#ea580c" />
              <ellipse cx="120" cy="132" rx="54" ry="66" fill="#f97316" />
              {/* Glowing Carved Eyes */}
              <polygon
                points="88,105 106,122 82,124"
                fill="#fef08a"
                opacity={glowPulse}
              />
              <polygon
                points="152,105 158,124 134,122"
                fill="#fef08a"
                opacity={glowPulse}
              />
              {/* Nose */}
              <polygon points="120,124 128,138 112,138" fill="#fef08a" opacity={glowPulse} />
              {/* Carved Grin */}
              <path
                d="M78 150 L96 162 L108 152 L120 164 L132 152 L144 162 L162 150 L152 172 L132 166 L120 176 L108 166 L88 172 Z"
                fill="#fef08a"
                opacity={glowPulse}
              />
            </svg>
          </div>

          {/* Active Era Spotlight Callout */}
          <div style={{ textAlign: 'center', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: 999,
                backgroundColor: `${currentStep.accent}25`,
                color: currentStep.accent,
                fontSize: 17,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              {currentStep.era}
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 8 }}>
              {currentStep.title}
            </div>
            <div style={{ fontSize: 20, color: '#94a3b8', maxWidth: 520 }}>
              {currentStep.detail}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Word-Synced Narration Bar */}
      <div
        style={{
          minHeight: 74,
          padding: '14px 28px',
          borderRadius: 18,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(249, 115, 22, 0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 10px',
            alignItems: 'center',
            flex: 1,
          }}
        >
          {activeSegment ? (
            activeSegment.words.map((w, i) => {
              const isCurrent = timeSec >= w.startSec && timeSec <= w.endSec;
              const isPast = timeSec > w.endSec;
              const pop = spring({
                frame: frame - Math.round(w.startSec * fps),
                fps,
                config: { damping: 14, stiffness: 220 },
              });
              return (
                <span
                  key={i}
                  style={{
                    fontSize: 25,
                    fontWeight: isCurrent ? 800 : 600,
                    color: isCurrent
                      ? '#090612'
                      : isPast
                      ? '#f8fafc'
                      : 'rgba(148, 163, 184, 0.5)',
                    backgroundColor: isCurrent ? '#fb923c' : 'transparent',
                    padding: '2px 10px',
                    borderRadius: 8,
                    transform: `scale(${isCurrent ? interpolate(pop, [0, 1], [0.92, 1.06]) : 1})`,
                  }}
                >
                  {w.word}
                </span>
              );
            })
          ) : (
            <span style={{ fontSize: 22, color: '#94a3b8' }}>
              Origin of Halloween • Interactive Timeline
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 19,
            color: '#fb923c',
            flexShrink: 0,
          }}
        >
          {timeSec.toFixed(1)}s
        </div>
      </div>
    </AbsoluteFill>
  );
};
