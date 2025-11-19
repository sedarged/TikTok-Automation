import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface RenderDefaults {
  width: number;
  height: number;
  fps: number;
  includeCaptions: boolean;
  includeMusic: boolean;
  darkGrade: boolean;
  vignette: boolean;
  glitchTransitions: boolean;
  musicVolume: number;
}

export interface Config {
  port: number;
  version: string;
  outputDir: string;
  assetsDir: string;
  storageBaseUrl: string;
  maxScenes: number;
  maxVideoDurationSeconds: number;
  minStoryWordCount: number;
  maxStoryWordCount: number;
  logLevel: string;
  tts: {
    apiUrl: string;
    apiKey: string;
    voiceId: string;
    mockVoice: string;
  };
  image: {
    apiUrl: string;
    apiKey: string;
  };
  render: RenderDefaults;
}

const resolvePath = (relativePath: string): string => {
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(process.cwd(), relativePath);
};

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  version: process.env.APP_VERSION || '0.2.0',
  outputDir: resolvePath(process.env.OUTPUT_DIR || './output'),
  assetsDir: resolvePath(process.env.ASSETS_DIR || './assets'),
  storageBaseUrl: process.env.STORAGE_BASE_URL || 'http://localhost:3000',
  maxScenes: parseInt(process.env.MAX_SCENES || '6', 10),
  maxVideoDurationSeconds: parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || '70', 10),
  minStoryWordCount: parseInt(process.env.MIN_STORY_WORD_COUNT || '140', 10),
  maxStoryWordCount: parseInt(process.env.MAX_STORY_WORD_COUNT || '185', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  tts: {
    apiUrl: process.env.TTS_API_URL || '',
    apiKey: process.env.TTS_API_KEY || '',
    voiceId: process.env.TTS_VOICE_ID || 'horror-narrator',
    mockVoice: process.env.TTS_MOCK_VOICE || 'synth-tone',
  },
  image: {
    apiUrl: process.env.IMAGE_API_URL || '',
    apiKey: process.env.IMAGE_API_KEY || '',
  },
  render: {
    width: parseInt(process.env.RENDER_WIDTH || '1080', 10),
    height: parseInt(process.env.RENDER_HEIGHT || '1920', 10),
    fps: parseInt(process.env.RENDER_FPS || '30', 10),
    includeCaptions: process.env.RENDER_INCLUDE_CAPTIONS !== 'false',
    includeMusic: process.env.RENDER_INCLUDE_MUSIC !== 'false',
    darkGrade: process.env.RENDER_DARK_GRADE !== 'false',
    vignette: process.env.RENDER_VIGNETTE !== 'false',
    glitchTransitions: process.env.RENDER_GLITCH_TRANSITIONS !== 'false',
    musicVolume: parseFloat(process.env.RENDER_MUSIC_VOLUME || '0.18'),
  },
};

export default config;
