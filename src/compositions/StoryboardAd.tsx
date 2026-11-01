import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
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

export type SlideMotionStyle = 'zoom-in' | 'zoom-out' | 'pan-right' | 'tilt-3d';

export interface StoryboardSlide {
  image: string;
  headline: string;
  tag?: string;
  motion?: SlideMotionStyle;
}

export interface StoryboardAdProps {
  brandName: string;
  ctaText?: string;
  slides: StoryboardSlide[];
  voiceover?: VoiceoverMetadata | null;
}

const SlideScene: React.FC<{
  slideItem: StoryboardSlide;
  index: number;
  total: number;
  brandName: string;
  durationInFrames: number;
}> = ({ slideItem, index, total, brandName, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textEnter = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, stiffness: 140 },
  });

  const motion = slideItem.motion ?? (['zoom-in', 'pan-right', 'tilt-3d', 'zoom-out'][index % 4] as SlideMotionStyle);

  let imgTransform = '';
  if (motion === 'zoom-in') {
    const scale = interpolate(progress, [0, 1], [1.02, 1.16]);
    imgTransform = `scale(${scale})`;
  } else if (motion === 'zoom-out') {
    const scale = interpolate(progress, [0, 1], [1.18, 1.02]);
    imgTransform = `scale(${scale})`;
  } else if (motion === 'pan-right') {
    const tx = interpolate(progress, [0, 1], [-35, 35]);
    imgTransform = `scale(1.12) translateX(${tx}px)`;
  } else {
    const rotY = interpolate(progress, [0, 1], [-6, 6]);
    const scale = interpolate(progress, [0, 1], [1.06, 1.14]);
    imgTransform = `perspective(1400px) rotateY(${rotY}deg) scale(${scale})`;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#05070e',
        fontFamily: displayFont,
        overflow: 'hidden',
      }}
    >
      {/* Blurred Ambient Backdrop Fill */}
      <AbsoluteFill style={{ opacity: 0.35, filter: 'blur(45px)', transform: 'scale(1.2)' }}>
        <Img
          src={staticFile(slideItem.image)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Main Framed Still Image with 2.5D Camera Motion */}
      <AbsoluteFill
        style={{
          padding: '64px 88px 136px 88px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 28,
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.75)',
          }}
        >
          <Img
            src={staticFile(slideItem.image)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: imgTransform,
            }}
          />

          {/* Cinematic Bottom-Left Gradient Overlay for Headline Legibility */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(5,7,14,0.25) 0%, rgba(5,7,14,0.0) 40%, rgba(5,7,14,0.88) 100%)',
            }}
          />

          {/* Top Bar: Brand + Slide Counter */}
          <div
            style={{
              position: 'absolute',
              top: 32,
              left: 40,
              right: 40,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: '8px 20px',
                borderRadius: 999,
                backgroundColor: 'rgba(5, 7, 14, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                color: '#38bdf8',
                fontFamily: monoFont,
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {slideItem.tag || brandName}
            </div>
            <div
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                backgroundColor: 'rgba(5, 7, 14, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                fontFamily: monoFont,
                fontSize: 17,
              }}
            >
              0{index + 1} / 0{total}
            </div>
          </div>

          {/* Lower-Third Kinetic Headline */}
          <div
            style={{
              position: 'absolute',
              bottom: 38,
              left: 44,
              right: 44,
              opacity: textEnter,
              transform: `translateY(${interpolate(textEnter, [0, 1], [24, 0])}px)`,
            }}
          >
            <h2
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                letterSpacing: -1.5,
                lineHeight: 1.1,
                textShadow: '0 4px 24px rgba(0,0,0,0.8)',
              }}
            >
              {slideItem.headline}
            </h2>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const StoryboardAd: React.FC<StoryboardAdProps> = ({
  brandName,
  slides,
  voiceover,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  const transitionFrames = 12;
  const activeSlides: StoryboardSlide[] =
    slides && slides.length > 0
      ? slides
      : [
          {
            image: 'storyboard/slide-1.png',
            headline: '1. Drop Your Stills & Script',
            tag: 'STORYBOARD ENGINE',
            motion: 'zoom-in',
          },
        ];

  // Calculate per-slide duration locked to voiceover segments (compensating for transition overlap)
  const slideDurations = activeSlides.map((_, idx) => {
    const seg = voiceover?.segments[idx];
    if (seg) {
      const nextSeg = voiceover?.segments[idx + 1];
      const endBound = nextSeg ? nextSeg.startSec : (voiceover?.durationSec ?? seg.endSec + 0.8);
      const durSec = Math.max(2.0, endBound - seg.startSec);
      return secToFrames(durSec, fps) + (idx < activeSlides.length - 1 ? transitionFrames : 0);
    }
    return secToFrames(3.5, fps) + (idx < activeSlides.length - 1 ? transitionFrames : 0);
  });

  const activeSegment = voiceover?.segments.find(
    (s) => timeSec >= s.startSec && timeSec <= s.endSec + 0.25
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#05070e' }}>
      {voiceover?.audioFile ? (
        <Audio src={staticFile(voiceover.audioFile)} />
      ) : null}

      <TransitionSeries>
        {activeSlides.map((slideItem, idx) => {
          const dur = slideDurations[idx];
          const isLast = idx === activeSlides.length - 1;
          return (
            <React.Fragment key={idx}>
              <TransitionSeries.Sequence durationInFrames={dur}>
                <SlideScene
                  slideItem={slideItem}
                  index={idx}
                  total={activeSlides.length}
                  brandName={brandName}
                  durationInFrames={dur}
                />
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
            bottom: 34,
            left: 88,
            right: 88,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '12px 28px',
              borderRadius: 999,
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              backdropFilter: 'blur(12px)',
              fontFamily: displayFont,
              fontSize: 24,
              fontWeight: 600,
              color: '#f8fafc',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '6px 9px',
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
