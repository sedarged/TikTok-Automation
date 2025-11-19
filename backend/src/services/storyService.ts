import { randomUUID } from 'crypto';
import config from '../config/config';
import { Scene, StoryInput, StoryResult } from '../types';
import logger from '../utils/logger';

export interface StoryGenerationOptions {
  prompt?: string;
  maxScenes?: number;
  targetDurationSeconds?: number;
  genre?: string;
}

const HOOKS = [
  'I hit record the moment the hallway lights started clicking off one by one',
  'The livestream counter wouldn\'t move past zero even though thousands kept typing my name',
  'Something was breathing over my shoulder, but my apartment security feed showed me alone',
  'The old tape kept rewinding itself to the exact second I whispered, "Is anyone here?"',
];

const BUILDERS = [
  'Every reflective surface in the room lagged by a heartbeat, like reality buffering just for me',
  'The house groaned in a language made of static, and the air smelled like wet copper',
  'Floorboards tilted toward the basement door as if the whole place inhaled',
  'My phone compass spun in slow circles, pointing everywhere but north',
];

const TWISTS = [
  'When the whisper finally answered, it used the exact voice from the voicemail I left myself years ago',
  'The figure waving from the window wore tonight\'s outfit even though I was still in the hallway',
  'My livestream chat flooded with timestamps that hadn\'t happened yet',
  'The door creaked open to reveal a room arranged exactly like my childhood bedroom, dust and all',
];

const ENDINGS = [
  'I unplugged every camera, but the feed kept streaming a version of me that never blinks',
  'I moved out the next day, yet the nightly knock followed, always three taps and a final breath',
  'I leave a bowl of salt at the threshold now; it clumps into handprints before sunrise',
  'Every time I tell this story, another light bulb in my house burns out at the final line',
];

const IMAGE_MOODS = [
  'cinematic horror lighting, cold moonlight, volumetric fog, 35mm grain',
  'spooky ambience, neon scarlet highlights, analogue texture, horror film still',
  'moody chiaroscuro, desaturated tones, long shadows, unsettling still frame',
  'surreal horror concept art, teal and orange split lighting, mist in the air',
];

const wordCount = (text: string): number => {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

const paragraphForTarget = (lines: string[], targetWords: number): string => {
  const sentences: string[] = [];
  while (wordCount(sentences.join(' ')) < targetWords) {
    const next = lines[Math.floor(Math.random() * lines.length)];
    sentences.push(next);
  }
  return sentences.join(' ');
};

const buildScene = (
  basePrompt: string,
  order: number,
  targetWords: number,
  stage: 'hook' | 'build' | 'twist' | 'ending'
): Scene => {
  const banks = {
    hook: HOOKS,
    build: BUILDERS,
    twist: TWISTS,
    ending: ENDINGS,
  };
  const descriptions = {
    hook: `Hook: ${basePrompt} glitch`,
    build: `Exploration of ${basePrompt}`,
    twist: `Twist about ${basePrompt}`,
    ending: `Unsettling ending near ${basePrompt}`,
  };

  const narration = paragraphForTarget(banks[stage], targetWords);
  const promptDetail = IMAGE_MOODS[order % IMAGE_MOODS.length];

  return {
    id: `scene_${order}`,
    order,
    description: descriptions[stage],
    narration,
    imagePrompt: `${basePrompt}, ${stage} moment, ${promptDetail}`,
  };
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const buildStoryFromInput = (input: StoryInput): StoryResult => {
  const scenes: Scene[] = input.scenes.map((scene, index) => ({
    id: `scene_${index + 1}`,
    order: index + 1,
    description: scene.description,
    narration: scene.narration,
    imagePrompt: scene.imagePrompt || scene.description,
    duration: scene.duration,
  }));

  const totalWords = scenes.reduce((total, scene) => total + wordCount(scene.narration), 0);
  const estimatedDuration = clamp((totalWords / 155) * 60, 45, config.maxVideoDurationSeconds);

  return {
    id: `story_${randomUUID()}`,
    title: input.title || 'Listener-Submitted Nightmare',
    description:
      input.description ||
      'User supplied script. Ensure you have the rights to every piece of this narration before sharing.',
    scenes,
    totalDuration: estimatedDuration,
    createdAt: new Date(),
    wordCount: totalWords,
  };
};

export const generateStory = async (
  options: StoryGenerationOptions = {}
): Promise<StoryResult> => {
  const targetWordCount = clamp(
    options.targetDurationSeconds
      ? Math.round((options.targetDurationSeconds / 60) * 155)
      : Math.floor(
          Math.random() *
            (config.maxStoryWordCount - config.minStoryWordCount) +
            config.minStoryWordCount
        ),
    config.minStoryWordCount,
    config.maxStoryWordCount
  );

  const basePrompt = options.prompt?.trim() || 'abandoned lighthouse on a fog-soaked cliff';
  logger.info('Generating structured story', { targetWordCount, basePrompt });

  const weightMap = [0.2, 0.3, 0.28, 0.22];
  const scenes: Scene[] = ['hook', 'build', 'twist', 'ending'].map((stage, index) =>
    buildScene(
      basePrompt,
      index,
      Math.max(25, Math.round(targetWordCount * weightMap[index])),
      stage as 'hook' | 'build' | 'twist' | 'ending'
    )
  );

  const actualWordCount = scenes.reduce((total, scene) => total + wordCount(scene.narration), 0);
  const estimatedDuration = clamp((actualWordCount / 155) * 60, 50, config.maxVideoDurationSeconds);

  return {
    id: `story_${randomUUID()}`,
    title: `The ${basePrompt.split(' ')[0] || 'Midnight'} Echo`,
    description:
      'Short-form horror narrative crafted for TikTok. Fictional content meant for entertainment only.',
    scenes,
    totalDuration: estimatedDuration,
    createdAt: new Date(),
    wordCount: actualWordCount,
  };
};

export const validateStory = (story: StoryResult): boolean => {
  if (story.scenes.length === 0) return false;
  if (story.scenes.length > config.maxScenes) return false;
  if (story.wordCount < config.minStoryWordCount) return false;
  if (story.wordCount > config.maxStoryWordCount) return false;
  return true;
};
