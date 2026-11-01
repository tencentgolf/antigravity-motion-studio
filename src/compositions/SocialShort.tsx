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
import { getProceduralSpectrum, VoiceoverMetadata, WordTiming } from '../lib/timing';

export interface SocialShortProps {
  hookTitle: string;
  topicTag: string;
  voiceover?: VoiceoverMetadata | null;
}

const DEFAULT_WORDS: WordTiming[] = [
  { word: 'Stop', startSec: 0.0, endSec: 0.35 },
  { word: 'keyframing', startSec: 0.35, endSec: 0.85 },
  { word: 'by', startSec: 0.85, endSec: 1.05 },
  { word: 'hand.', startSec: 1.05, endSec: 1.5 },
  { word: 'Write', startSec: 1.6, endSec: 1.95 },
  { word: 'TypeScript,', startSec: 1.95, endSec: 2.55 },
  { word: 'sync', startSec: 2.55, endSec: 2.9 },
  { word: 'local', startSec: 2.9, endSec: 3.3 },
  { word: 'AI', startSec: 3.3, endSec: 3.65 },
  { word: 'voice,', startSec: 3.65, endSec: 4.1 },
  { word: 'and', startSec: 4.1, endSec: 4.35 },
  { word: 'render', startSec: 4.35, endSec: 4.7 },
  { word: 'at', startSec: 4.7, endSec: 4.85 },
  { word: '60fps.', startSec: 4.85, endSec: 5.0 },
];

export const SocialShort: React.FC<SocialShortProps> = ({
  hookTitle,
  topicTag,
  voiceover,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  const words: WordTiming[] =
    voiceover && voiceover.segments.length > 0
      ? voiceover.segments.flatMap((s) => s.words)
      : DEFAULT_WORDS;

  const spectrum = getProceduralSpectrum(frame, fps, 24, 128);
  const badgePop = spring({ frame, fps, config: { damping: 12, stiffness: 160 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#07090e',
        backgroundImage:
          'radial-gradient(circle at 50% 25%, rgba(56, 189, 248, 0.22) 0%, transparent 55%), radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.18) 0%, transparent 50%)',
        color: '#ffffff',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '110px 64px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {voiceover?.audioFile ? (
        <Audio src={staticFile(voiceover.audioFile)} />
      ) : null}

      {/* Top Topic Pill */}
      <div
        style={{
          transform: `scale(${badgePop})`,
          padding: '14px 32px',
          borderRadius: 999,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          border: '2px solid rgba(56, 189, 248, 0.5)',
          color: '#38bdf8',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {topicTag}
      </div>

      {/* Center Kinetic Typography + Dynamic Highlight */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <h1
          style={{
            fontSize: 78,
            fontWeight: 900,
            lineHeight: 1.08,
            marginBottom: 56,
            letterSpacing: -2,
            background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {hookTitle}
        </h1>

        {/* Word-by-word animated captions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '18px 20px',
            padding: '44px 36px',
            borderRadius: 36,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
          }}
        >
          {words.map((w, idx) => {
            const isCurrent = timeSec >= w.startSec && timeSec <= w.endSec;
            const isPast = timeSec > w.endSec;
            const wordSpring = spring({
              frame: frame - Math.round(w.startSec * fps),
              fps,
              config: { damping: 11, stiffness: 200 },
            });
            const scale = isCurrent
              ? interpolate(wordSpring, [0, 1], [0.85, 1.14])
              : 1;

            return (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  fontSize: 52,
                  fontWeight: 800,
                  transform: `scale(${scale})`,
                  color: isCurrent
                    ? '#090d16'
                    : isPast
                    ? '#f8fafc'
                    : 'rgba(148, 163, 184, 0.35)',
                  backgroundColor: isCurrent ? '#38bdf8' : 'transparent',
                  padding: '6px 18px',
                  borderRadius: 16,
                  boxShadow: isCurrent ? '0 0 28px rgba(56, 189, 248, 0.6)' : 'none',
                }}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      </div>

      {/* Bottom Audio-Reactive Waveform Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 12,
          height: 140,
          width: '100%',
        }}
      >
        {spectrum.map((val, i) => (
          <div
            key={i}
            style={{
              width: 22,
              height: `${Math.round(val * 130)}px`,
              borderRadius: 999,
              background: 'linear-gradient(180deg, #38bdf8 0%, #ec4899 100%)',
              boxShadow: '0 0 14px rgba(56, 189, 248, 0.35)',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
