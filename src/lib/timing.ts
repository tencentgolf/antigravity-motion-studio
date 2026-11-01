import { interpolate, spring } from 'remotion';

export interface WordTiming {
  word: string;
  startSec: number;
  endSec: number;
}

export interface SegmentTiming {
  id: string;
  text: string;
  startSec: number;
  endSec: number;
  words: WordTiming[];
}

export interface VoiceoverMetadata {
  audioFile: string;
  durationSec: number;
  segments: SegmentTiming[];
}

/**
 * Convert seconds to frames at a given FPS.
 */
export const secToFrames = (seconds: number, fps: number): number =>
  Math.round(seconds * fps);

/**
 * Declarative step helper for technical explainers (solves manual frame offset math).
 * Returns a 0 -> 1 spring progress starting when `stepStartSec` is reached.
 */
export const useStepSpring = (
  frame: number,
  fps: number,
  stepStartSec: number,
  config = { damping: 16, stiffness: 140, mass: 0.8 }
): number => {
  const startFrame = secToFrames(stepStartSec, fps);
  return spring({
    frame: frame - startFrame,
    fps,
    config,
  });
};

/**
 * Smooth entrance + exit envelope for temporary callouts or steps.
 */
export const getEnvelope = (
  frame: number,
  fps: number,
  startSec: number,
  endSec: number,
  fadeSec = 0.25
): number => {
  const start = secToFrames(startSec, fps);
  const end = secToFrames(endSec, fps);
  const fade = Math.max(1, secToFrames(fadeSec, fps));
  return interpolate(
    frame,
    [start, start + fade, end - fade, end],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
};

/**
 * Synthetic audio spectrum generator for visual/music-driven mode when no external audio file is loaded,
 * or can be blended with real `@remotion/media-utils` `visualizeAudio` data.
 */
export const getProceduralSpectrum = (
  frame: number,
  fps: number,
  barCount: number,
  bpm = 124
): number[] => {
  const timeSec = frame / fps;
  const beatPhase = (timeSec * (bpm / 60)) * Math.PI * 2;
  const kick = Math.pow(Math.max(0, Math.sin(beatPhase)), 4);

  return Array.from({ length: barCount }, (_, i) => {
    const norm = i / barCount;
    const lowEndBoost = Math.exp(-norm * 2.5) * kick * 0.55;
    const wave1 = Math.sin(timeSec * 4.5 + i * 0.45) * 0.25 + 0.25;
    const wave2 = Math.cos(timeSec * 7.2 - i * 0.3) * 0.15 + 0.15;
    return Math.min(1, Math.max(0.06, lowEndBoost + wave1 + wave2));
  });
};
