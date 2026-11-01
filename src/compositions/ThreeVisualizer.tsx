import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { getProceduralSpectrum } from '../lib/timing';

export interface ThreeVisualizerProps {
  title: string;
  bpm: number;
}

const RingOfBars: React.FC<{ spectrum: number[]; timeSec: number }> = ({
  spectrum,
  timeSec,
}) => {
  const radius = 3.2;
  const count = spectrum.length;

  const materials = useMemo(
    () =>
      spectrum.map((_, i) => {
        const hue = (i / count) * 0.55 + 0.5;
        const color = new THREE.Color().setHSL(hue % 1, 0.85, 0.58);
        return new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.45,
          roughness: 0.25,
          metalness: 0.7,
        });
      }),
    [count]
  );

  return (
    <group rotation={[0.35, timeSec * 0.45, 0]}>
      {/* Central reactive icosahedron core */}
      <mesh
        rotation={[timeSec * 0.8, timeSec * 1.1, 0]}
        scale={1 + (spectrum[0] ?? 0.3) * 0.45}
      >
        <icosahedronGeometry args={[1.25, 1]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.6}
          wireframe
        />
      </mesh>

      {/* Circular 3D audio frequency bars */}
      {spectrum.map((val, i) => {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const barHeight = 0.4 + val * 3.2;

        return (
          <mesh
            key={i}
            position={[x, 0, z]}
            rotation={[0, -angle, 0]}
            material={materials[i]}
          >
            <boxGeometry args={[0.18, barHeight, 0.18]} />
          </mesh>
        );
      })}
    </group>
  );
};

export const ThreeVisualizer: React.FC<ThreeVisualizerProps> = ({
  title,
  bpm,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const timeSec = frame / fps;

  const spectrum = getProceduralSpectrum(frame, fps, 36, bpm);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05070d' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 2.4, 7.5], fov: 45 }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[6, 8, 6]} intensity={2.2} color="#38bdf8" />
        <pointLight position={[-6, -4, -4]} intensity={1.6} color="#ec4899" />
        <RingOfBars spectrum={spectrum} timeSec={timeSec} />
      </ThreeCanvas>

      {/* HUD Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          left: 64,
          right: 64,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#f8fafc',
          pointerEvents: 'none',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontFamily: 'monospace',
              color: '#38bdf8',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            @remotion/three • Deterministic WebGL
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
            {title}
          </div>
        </div>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 20,
            color: '#94a3b8',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            padding: '10px 18px',
            borderRadius: 12,
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          {bpm} BPM | FRAME {frame}
        </div>
      </div>
    </AbsoluteFill>
  );
};
