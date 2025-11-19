import { StoryResult } from '../types';
import logger from '../utils/logger';

export interface ContentModerationResult {
  safe: boolean;
  flagged: string[];
  sanitizedText: string;
}

const HARD_BANS: { pattern: RegExp; label: string }[] = [
  { pattern: /suicide/i, label: 'self-harm' },
  { pattern: /self-?harm/i, label: 'self-harm' },
  { pattern: /sexual assault/i, label: 'sexual-content' },
  { pattern: /child\s*(abuse|endangerment|victim)/i, label: 'minors' },
  { pattern: /explicit sexual/i, label: 'sexual-content' },
  { pattern: /real murder case/i, label: 'real-world-violence' },
];

const SOFT_REPLACEMENTS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /blood/gi, replacement: 'shadows' },
  { pattern: /gore/gi, replacement: 'dread' },
  { pattern: /corpse/gi, replacement: 'figure' },
  { pattern: /kill(ed|s|ing)?/gi, replacement: 'silenced' },
];

export const moderateText = (text: string): ContentModerationResult => {
  const flagged: string[] = [];
  HARD_BANS.forEach(entry => {
    if (entry.pattern.test(text)) {
      flagged.push(entry.label);
    }
  });

  let sanitizedText = text;
  SOFT_REPLACEMENTS.forEach(replacement => {
    sanitizedText = sanitizedText.replace(replacement.pattern, replacement.replacement);
  });

  return {
    safe: flagged.length === 0,
    flagged,
    sanitizedText,
  };
};

export const sanitizeStory = (story: StoryResult): { story: StoryResult; flagged: string[] } => {
  const flagged: Set<string> = new Set();
  const sanitizedScenes = story.scenes.map(scene => {
    const moderation = moderateText(scene.narration);
    moderation.flagged.forEach(flag => flagged.add(flag));
    return {
      ...scene,
      narration: moderation.sanitizedText,
    };
  });

  return {
    story: {
      ...story,
      scenes: sanitizedScenes,
    },
    flagged: Array.from(flagged),
  };
};

export const ensureStoryIsSafe = (story: StoryResult): { safe: boolean; story: StoryResult; flagged: string[] } => {
  const { story: sanitizedStory, flagged } = sanitizeStory(story);
  const safe = flagged.length === 0;
  if (!safe) {
    logger.warn('Story flagged by moderation', {
      storyId: story.id,
      flagged,
    });
  }
  return { safe, story: sanitizedStory, flagged };
};
