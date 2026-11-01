import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { getProceduralSpectrum, useStepSpring, VoiceoverMetadata } from '../lib/timing';

export interface AiVideoShowcaseProps {
  title: string;
  subtitle: string;
  videoFile?: string | null;
  durationSec?: number;
  prompt?: string;
  voiceover?: VoiceoverMetadata | null;
}

export const AiVideoShowcase: React.FC<AiVideoShowcaseProps> = ({
  title,
  subtitle,
  videoFile,
  voiceover,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const introSpring = useStepSpring(frame, fps, 0.1);
  const spectrum = getProceduralSpectrum(frame, fps, 28, 120);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05070d', overflow: 'hidden' }}>
      {/* Full-bleed AI Generated Video Layer */}
      {videoFile ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile(videoFile)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      ) : null}

      {voiceover?.audioFile ? (
        <Audio src={staticFile(voiceover.audioFile)} />
      ) : null}

      {/* Subtle Cinematic Vignette & Bottom Gradient for Readability */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(5,7,13,0.35) 0%, rgba(5,7,13,0.0) 35%, rgba(5,7,13,0.0) 60%, rgba(5,7,13,0.82) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Bottom HUD: Title + Audio-Reactive Waveform */}
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 52,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          color: '#ffffff',
          opacity: introSpring,
          transform: `translateY(${interpolate(introSpring, [0, 1], [24, 0])}px)`,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-block',
              padding: '5px 14px',
              borderRadius: 999,
              backgroundColor: 'rgba(251, 146, 60, 0.22)',
              border: '1px solid rgba(251, 146, 60, 0.6)',
              color: '#fdba74',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Wan 2.1 Local AI Video • RTX 4080
          </div>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 900,
              margin: 0,
              letterSpacing: -1,
              textShadow: '0 4px 24px rgba(0,0,0,0.65)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 24,
              color: '#e2e8f0',
              margin: '6px 0 0 0',
              textShadow: '0 2px 12px rgba(0,0,0,0.65)',
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Audio-Reactive Tropical Sunset Bars */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 7,
            height: 76,
            padding: '12px 18px',
            borderRadius: 18,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          {spectrum.map((v, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: `${Math.round(v * 52)}px`,
                borderRadius: 999,
                background: 'linear-gradient(180deg, #fb923c 0%, #f43f5e 100%)',
              }}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
