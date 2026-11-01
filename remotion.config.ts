import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Enable WebGL angle backend for headless Three.js rendering on GPU
Config.setChromiumOpenGlRenderer('angle');
// Use hardware-accelerated encoding/decoding (NVENC / VideoToolbox / AMF) when available, falling back to CPU automatically
Config.setHardwareAcceleration('if-possible');
