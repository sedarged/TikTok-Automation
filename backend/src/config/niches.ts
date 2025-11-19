import { NicheProfile } from '../types/niche';

/**
 * Horror/Creepy Niche Profile
 * Short-form horror narratives with suspenseful pacing and eerie visuals
 */
export const horrorProfile: NicheProfile = {
  id: 'horror',
  name: 'Horror & Creepy Stories',
  description: 'Short-form horror narratives crafted for TikTok with strong hooks and unsettling endings',
  storyStyle: {
    defaultLengthSeconds: 60,
    tone: 'tense, suspenseful, eerie',
    structureTemplate: ['hook', 'build', 'twist', 'ending'],
    targetWordCount: {
      min: 140,
      max: 185,
    },
  },
  visuals: {
    baseStylePrompt: 'dark cinematic horror lighting, cold moonlight, volumetric fog, 35mm film grain, moody atmosphere',
    preferredVisualMode: 'ai_images',
    numScenes: 4,
    imageSize: '1024x1792',
  },
  voice: {
    provider: 'openai_tts',
    voiceId: 'onyx',
    speed: 1.0,
    model: 'tts-1',
  },
  musicAndSfx: {
    addMusic: true,
    mood: 'eerie, unsettling, dark ambient',
    sfxDensity: 'light',
    musicVolume: 0.18,
  },
  captions: {
    fontFamily: 'DejaVuSans-Bold',
    fontSize: 52,
    fontColor: 'white',
    placement: 'bottom',
    highlightStyle: 'none',
    highlightColor: 'red',
  },
  hashtagsAndMetadata: {
    defaultHashtags: [
      '#horrortok',
      '#scarystory',
      '#creepypasta',
      '#aivideo',
      '#nightshift',
      '#spooky',
      '#fyp',
    ],
    ctaPhrases: [
      'Stay unsettled',
      'Turn on the lights',
      'Sweet nightmares',
      'Part 2?',
    ],
  },
};

/**
 * Reddit Stories Niche Profile
 * Engaging storytelling from Reddit posts with conversational narration
 */
export const redditStoriesProfile: NicheProfile = {
  id: 'reddit_stories',
  name: 'Reddit Stories',
  description: 'Engaging true stories from Reddit with conversational narration',
  storyStyle: {
    defaultLengthSeconds: 60,
    tone: 'conversational, engaging, relatable',
    structureTemplate: ['setup', 'conflict', 'climax', 'resolution'],
    targetWordCount: {
      min: 150,
      max: 200,
    },
  },
  visuals: {
    baseStylePrompt: 'modern minimalist aesthetic, clean typography, vibrant gradients, professional look',
    preferredVisualMode: 'ai_images',
    numScenes: 4,
    imageSize: '1024x1792',
  },
  voice: {
    provider: 'openai_tts',
    voiceId: 'nova',
    speed: 1.05,
    model: 'tts-1',
  },
  musicAndSfx: {
    addMusic: true,
    mood: 'upbeat, casual, lofi background',
    sfxDensity: 'none',
    musicVolume: 0.15,
  },
  captions: {
    fontFamily: 'DejaVuSans-Bold',
    fontSize: 48,
    fontColor: 'white',
    placement: 'center',
    highlightStyle: 'keyword_highlight',
    highlightColor: 'yellow',
  },
  hashtagsAndMetadata: {
    defaultHashtags: [
      '#reddit',
      '#redditstories',
      '#storytime',
      '#aita',
      '#relationship',
      '#drama',
      '#fyp',
    ],
    ctaPhrases: [
      'What would you do?',
      'Part 2 coming soon',
      'Drop your thoughts below',
      'Follow for more stories',
    ],
  },
};
