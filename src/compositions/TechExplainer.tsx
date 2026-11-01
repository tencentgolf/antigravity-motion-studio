import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { useStepSpring, VoiceoverMetadata } from '../lib/timing';

export interface TechExplainerProps {
  title: string;
  subtitle: string;
  voiceover?: VoiceoverMetadata | null;
}

interface PipelineNode {
  id: string;
  label: string;
  tech: string;
  color: string;
  appearSec: number;
}

const NODES: PipelineNode[] = [
  { id: 'script', label: '1. Script & Specs', tech: 'TypeScript / JSON', color: '#38bdf8', appearSec: 0.4 },
  { id: 'tts', label: '2. Voice Synthesis', tech: 'Kokoro 82M ONNX', color: '#a855f7', appearSec: 1.4 },
  { id: 'scene', label: '3. Scene Graph', tech: 'Remotion + Three.js', color: '#34d399', appearSec: 2.4 },
  { id: 'render', label: '4. GPU Render', tech: 'Headless Angle / MP4', color: '#fb923c', appearSec: 3.4 },
];

const CODE_LINES = [
  { text: 'const frame = useCurrentFrame();', highlightAtSec: 0.6 },
  { text: 'const progress = useStepSpring(frame, fps, step.startSec);', highlightAtSec: 1.6 },
  { text: '<ThreeCanvas width={width} height={height}>', highlightAtSec: 2.6 },
  { text: '  <AudioReactiveMesh spectrum={spectrum} />', highlightAtSec: 3.4 },
  { text: '</ThreeCanvas>', highlightAtSec: 3.4 },
];

export const TechExplainer: React.FC<TechExplainerProps> = ({
  title,
  subtitle,
  voiceover,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  const headerSpring = useStepSpring(frame, fps, 0);
  const codePanelSpring = useStepSpring(frame, fps, 0.5);

  const activeCaption = voiceover?.segments.find(
    (s) => timeSec >= s.startSec && timeSec <= s.endSec
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#090d16',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.12) 0%, transparent 50%)',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: 72,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {voiceover?.audioFile ? (
        <Audio src={staticFile(voiceover.audioFile)} />
      ) : null}

      {/* Header */}
      <div
        style={{
          opacity: headerSpring,
          transform: `translateY(${interpolate(headerSpring, [0, 1], [24, 0])}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: 999,
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Architecture Explainer
        </div>
        <h1 style={{ fontSize: 64, fontWeight: 800, margin: 0, letterSpacing: -1.5 }}>
          {title}
        </h1>
        <p style={{ fontSize: 28, color: '#94a3b8', margin: '10px 0 0 0' }}>
          {subtitle}
        </p>
      </div>

      {/* Main Content: Architecture Nodes + Live Code Walkthrough */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          gap: 48,
          alignItems: 'center',
          margin: 'auto 0',
        }}
      >
        {/* Left: Step-by-step Architecture Pipeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {NODES.map((node, index) => {
            const p = useStepSpring(frame, fps, node.appearSec);
            const isActive = timeSec >= node.appearSec && timeSec < node.appearSec + 1.2;
            return (
              <div
                key={node.id}
                style={{
                  opacity: p,
                  transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px) scale(${
                    isActive ? 1.02 : 1
                  })`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '24px 32px',
                  borderRadius: 20,
                  backgroundColor: isActive
                    ? 'rgba(30, 41, 59, 0.95)'
                    : 'rgba(15, 23, 42, 0.8)',
                  border: `2px solid ${isActive ? node.color : 'rgba(148, 163, 184, 0.18)'}`,
                  boxShadow: isActive ? `0 0 32px ${node.color}33` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: node.color,
                      boxShadow: `0 0 12px ${node.color}`,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{node.label}</div>
                    <div style={{ fontSize: 20, color: '#94a3b8', marginTop: 4 }}>
                      {node.tech}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontFamily: 'monospace',
                    color: node.color,
                    backgroundColor: `${node.color}1a`,
                    padding: '6px 14px',
                    borderRadius: 10,
                  }}
                >
                  step 0{index + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Synchronized Code Card */}
        <div
          style={{
            opacity: codePanelSpring,
            transform: `translateY(${interpolate(codePanelSpring, [0, 1], [30, 0])}px)`,
            backgroundColor: '#0f172a',
            borderRadius: 24,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            padding: 36,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span style={{ marginLeft: 12, color: '#64748b', fontSize: 18, fontFamily: 'monospace' }}>
              pipeline.tsx
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Consolas, monospace', fontSize: 23 }}>
            {CODE_LINES.map((line, i) => {
              const lineSpring = useStepSpring(frame, fps, line.highlightAtSec);
              const active = timeSec >= line.highlightAtSec;
              return (
                <div
                  key={i}
                  style={{
                    opacity: interpolate(lineSpring, [0, 1], [0.25, 1]),
                    transform: `translateX(${interpolate(lineSpring, [0, 1], [12, 0])}px)`,
                    padding: '10px 16px',
                    borderRadius: 10,
                    backgroundColor: active ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                    borderLeft: active ? '4px solid #38bdf8' : '4px solid transparent',
                    color: active ? '#e2e8f0' : '#64748b',
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer / Optional Voiceover Subtitle Bar */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(148, 163, 184, 0.15)',
          paddingTop: 20,
          color: '#94a3b8',
          fontSize: 22,
        }}
      >
        <div>
          {activeCaption ? (
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{activeCaption.text}</span>
          ) : (
            <span>Mode: Deterministic Frame Clock ({fps} FPS)</span>
          )}
        </div>
        <div style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
          t = {timeSec.toFixed(2)}s | frame #{frame}
        </div>
      </div>
    </AbsoluteFill>
  );
};
