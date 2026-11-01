import React from 'react';
import { Composition } from 'remotion';
import { TechExplainer, TechExplainerProps } from './compositions/TechExplainer';
import { SocialShort, SocialShortProps } from './compositions/SocialShort';
import { ThreeVisualizer, ThreeVisualizerProps } from './compositions/ThreeVisualizer';
import {
  HalloweenExplainer,
  HalloweenExplainerProps,
} from './compositions/HalloweenExplainer';
import {
  AiVideoShowcase,
  AiVideoShowcaseProps,
} from './compositions/AiVideoShowcase';
import {
  CommercialAd,
  CommercialAdProps,
} from './compositions/CommercialAd';
import {
  StoryboardAd,
  StoryboardAdProps,
} from './compositions/StoryboardAd';
import {
  StudioGuide,
  StudioGuideProps,
} from './compositions/StudioGuide';
import { secToFrames } from './lib/timing';

export const RemotionRoot: React.FC = () => {
  const fps = 30;

  return (
    <>
      {/* 1. 16:9 Technical Explainer */}
      <Composition<any, TechExplainerProps & Record<string, unknown>>
        id="TechExplainer"
        component={TechExplainer}
        durationInFrames={secToFrames(5, fps)}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Code-First Motion Pipeline',
          subtitle: 'TypeScript + React Three Fiber + Local Kokoro TTS',
          voiceover: null,
        }}
        calculateMetadata={async ({ props }) => {
          const durationSec = props.voiceover?.durationSec ?? 5;
          return {
            durationInFrames: secToFrames(durationSec, fps),
          };
        }}
      />

      {/* 2. 9:16 Vertical Social Media Short */}
      <Composition<any, SocialShortProps & Record<string, unknown>>
        id="SocialShort"
        component={SocialShort}
        durationInFrames={secToFrames(5, fps)}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{
          hookTitle: 'Code > Keyframes',
          topicTag: 'Motion Engineering',
          voiceover: null,
        }}
        calculateMetadata={async ({ props }) => {
          const durationSec = props.voiceover?.durationSec ?? 5;
          return {
            durationInFrames: secToFrames(durationSec, fps),
          };
        }}
      />

      {/* 3. 16:9 3D Audio-Reactive Visualizer */}
      <Composition<any, ThreeVisualizerProps & Record<string, unknown>>
        id="ThreeVisualizer"
        component={ThreeVisualizer}
        durationInFrames={secToFrames(5, fps)}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          title: '3D Harmonic Spectrum',
          bpm: 124,
        }}
      />

      {/* 4. 16:9 Halloween History & Cultural Explainer */}
      <Composition<any, HalloweenExplainerProps & Record<string, unknown>>
        id="HalloweenExplainer"
        component={HalloweenExplainer}
        durationInFrames={secToFrames(22, fps)}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'The Origins of Halloween',
          subtitle: 'From Ancient Celtic Samhain to Modern Global Tradition',
          voiceover: null,
        }}
        calculateMetadata={async ({ props }) => {
          const durationSec = props.voiceover?.durationSec ?? 22;
          return {
            durationInFrames: secToFrames(durationSec + 0.5, fps),
          };
        }}
      />

      {/* 5. Local AI Video Showcase (Wan 2.1 + Remotion Compositing) */}
      <Composition<any, AiVideoShowcaseProps & Record<string, unknown>>
        id="AiVideoShowcase"
        component={AiVideoShowcase}
        durationInFrames={secToFrames(3, fps)}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Tropical Golden Hour',
          subtitle: 'Generated Locally with Wan 2.1 + Composited in Remotion',
          videoFile: null,
          durationSec: 3,
          voiceover: null,
        }}
        calculateMetadata={async ({ props }) => {
          const durationSec =
            props.durationSec ?? props.voiceover?.durationSec ?? 3;
          return {
            durationInFrames: Math.max(15, secToFrames(durationSec, fps)),
          };
        }}
      />

      {/* 6. Flagship Multi-Scene Commercial Motion Ad */}
      <Composition<any, CommercialAdProps & Record<string, unknown>>
        id="CommercialAd"
        component={CommercialAd}
        durationInFrames={secToFrames(13.5, fps)}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          brandName: 'HYPERION',
          tagline: 'Ship Cinema-Grade Product Launch Videos From Code.',
          ctaUrl: 'hyperion.studio →',
          voiceover: null,
        }}
        calculateMetadata={async ({ props }) => {
          const durationSec = props.voiceover?.durationSec ?? 13.5;
          return {
            durationInFrames: Math.max(secToFrames(13.5, fps), secToFrames(durationSec, fps)),
          };
        }}
      />

      {/* 7. Still Images + Script/Storyline -> Animated Video (`StoryboardAd`) */}
      <Composition<any, StoryboardAdProps & Record<string, unknown>>
        id="StoryboardAd"
        component={StoryboardAd}
        durationInFrames={secToFrames(10, fps)}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          brandName: 'HYPERION',
          slides: [
            {
              image: 'storyboard/demo-storyboard-slide-1.png',
              headline: '1. Drop Your Stills & Script',
              tag: 'STORYBOARD ENGINE',
              motion: 'zoom-in',
            },
          ],
          voiceover: null,
        }}
        calculateMetadata={async ({ props }) => {
          const durationSec =
            props.voiceover?.durationSec ?? Math.max(4, (props.slides?.length ?? 1) * 3.5);
          return {
            durationInFrames: secToFrames(durationSec, fps),
          };
        }}
      />

      {/* 8. Official Repository Instructional Onboarding Video (`StudioGuide`) */}
      <Composition<any, StudioGuideProps & Record<string, unknown>>
        id="StudioGuide"
        component={StudioGuide}
        durationInFrames={secToFrames(20, fps)}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Antigravity Motion Studio Guide',
          voiceover: null,
        }}
        calculateMetadata={async ({ props }) => {
          const durationSec = props.voiceover?.durationSec ?? 20;
          return {
            durationInFrames: secToFrames(durationSec, fps),
          };
        }}
      />
    </>
  );
};
