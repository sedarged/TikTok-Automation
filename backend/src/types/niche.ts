import { z } from 'zod';

/**
 * Niche Profile Configuration Schema
 * Defines the complete configuration for a specific content niche
 */

export const StoryStyleSchema = z.object({
  defaultLengthSeconds: z.number().min(30).max(180).default(60),
  tone: z.string().describe('e.g., "tense", "casual", "educational", "inspiring"'),
  structureTemplate: z.array(z.string()).describe('e.g., ["hook", "build", "twist", "cta"]'),
  targetWordCount: z.object({
    min: z.number().min(100).default(140),
    max: z.number().min(150).default(185),
  }),
});

export const VisualsSchema = z.object({
  baseStylePrompt: z.string().describe('Base visual style for AI image generation'),
  preferredVisualMode: z.enum(['ai_images', 'broll_only', 'mixed']).default('ai_images'),
  numScenes: z.number().min(3).max(6).default(4),
  imageSize: z.enum(['1024x1792', '1024x1024']).default('1024x1792'),
});

export const VoiceSchema = z.object({
  provider: z.enum(['openai_tts', 'elevenlabs', 'mock']).default('mock'),
  voiceId: z.string().describe('Voice ID or preset name for the TTS provider'),
  speed: z.number().min(0.25).max(4.0).default(1.0),
  model: z.string().optional().describe('TTS model, e.g., "tts-1" or "tts-1-hd"'),
});

export const MusicAndSfxSchema = z.object({
  addMusic: z.boolean().default(true),
  mood: z.string().describe('e.g., "eerie", "uplifting", "lofi", "corporate"'),
  sfxDensity: z.enum(['none', 'light', 'heavy']).default('light'),
  musicVolume: z.number().min(0).max(1).default(0.18),
});

export const CaptionsSchema = z.object({
  fontFamily: z.string().default('DejaVuSans-Bold'),
  fontSize: z.number().min(20).max(100).default(46),
  fontColor: z.string().default('white'),
  placement: z.enum(['top', 'center', 'bottom']).default('bottom'),
  highlightStyle: z.enum(['none', 'keyword_highlight', 'word_by_word']).default('none'),
  highlightColor: z.string().default('yellow'),
});

export const HashtagsAndMetadataSchema = z.object({
  defaultHashtags: z.array(z.string()),
  ctaPhrases: z.array(z.string()).optional(),
});

export const NicheProfileSchema = z.object({
  id: z.string().describe('Unique identifier for the niche, e.g., "horror", "reddit_stories"'),
  name: z.string().describe('Human-readable name'),
  description: z.string().optional(),
  storyStyle: StoryStyleSchema,
  visuals: VisualsSchema,
  voice: VoiceSchema,
  musicAndSfx: MusicAndSfxSchema,
  captions: CaptionsSchema,
  hashtagsAndMetadata: HashtagsAndMetadataSchema,
});

export type NicheProfile = z.infer<typeof NicheProfileSchema>;
export type StoryStyle = z.infer<typeof StoryStyleSchema>;
export type Visuals = z.infer<typeof VisualsSchema>;
export type Voice = z.infer<typeof VoiceSchema>;
export type MusicAndSfx = z.infer<typeof MusicAndSfxSchema>;
export type Captions = z.infer<typeof CaptionsSchema>;
export type HashtagsAndMetadata = z.infer<typeof HashtagsAndMetadataSchema>;
