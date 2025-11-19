import config from '../config/config';
import { generateStory, buildStoryFromInput, StoryGenerationOptions, validateStory } from './storyService';
import { ensureStoryIsSafe } from './contentFilter';
import { generateSceneImage } from './visualService';
import { synthesizeSpeech, getAudioDuration } from './ttsService';
import { generateCaptions, saveCaptionsToFile } from './captionService';
import { renderVideo } from './renderService';
import { getPublicUrl, saveToOutput } from './storageService';
import jobQueue, { JobPayload } from './jobQueue';
import { CreateJobRequest, JobResultData, Scene, StoryResult } from '../types';
import logger from '../utils/logger';
import { ensureDirectory } from '../utils/fileUtils';

const wordCount = (text: string): number => {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
};

const allocateDurations = (scenes: Scene[], targetDuration: number): number[] => {
  const weights = scenes.map(scene => Math.max(wordCount(scene.narration), 1));
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map(weight => parseFloat(((weight / total) * targetDuration).toFixed(2)));
};

const buildDescription = (story: StoryResult): string => {
  const hook = story.scenes[0]?.narration.split('.').slice(0, 1).join('.');
  return `${story.title} — ${hook} #StayUnsettled`;
};

const buildHashtags = (): string[] => {
  return ['#horrortok', '#scarystory', '#aivideo', '#nightshift', '#spooky', '#fyp'];
};

const prepareStory = async (request: CreateJobRequest): Promise<StoryResult> => {
  if (request.story) {
    return buildStoryFromInput(request.story);
  }
  const storyOptions: StoryGenerationOptions = {
    prompt: request.prompt,
    maxScenes: config.maxScenes,
    targetDurationSeconds: config.maxVideoDurationSeconds,
  };
  return generateStory(storyOptions);
};

const ensureSafeStory = async (story: StoryResult, allowRetry: boolean): Promise<StoryResult> => {
  let current = story;
  for (let attempt = 0; attempt < (allowRetry ? 2 : 1); attempt += 1) {
    const { safe, story: sanitized, flagged } = ensureStoryIsSafe(current);
    if (safe && validateStory(sanitized)) {
      return sanitized;
    }
    if (!allowRetry) break;
    current = await generateStory({ prompt: sanitized.title, maxScenes: config.maxScenes });
    logger.warn('Regenerating story due to moderation flags', { flagged });
  }
  throw new Error('Story failed moderation or validation checks');
};

const attachVisuals = async (story: StoryResult): Promise<StoryResult> => {
  const scenes = [...story.scenes];
  for (let i = 0; i < scenes.length; i += 1) {
    const prompt = scenes[i].imagePrompt || scenes[i].description;
    // eslint-disable-next-line no-await-in-loop
    const imagePath = await generateSceneImage(prompt, i);
    scenes[i] = { ...scenes[i], assetPath: imagePath };
  }
  return { ...story, scenes };
};

const buildRenderScenes = (scenes: Scene[]): { imagePath: string; duration: number; caption: string }[] => {
  return scenes.map(scene => ({
    imagePath: scene.assetPath || scene.imageUrl || '',
    duration: scene.duration || 6,
    caption: scene.narration,
  }));
};

const processJob = async (jobId: string, payload: JobPayload): Promise<JobResultData> => {
  const request = payload.request;
  if (request.type !== 'horror_video') {
    throw new Error(`Unsupported job type: ${request.type}`);
  }

  await ensureDirectory(config.assetsDir);

  logger.info('Starting job pipeline', { jobId, stage: 'INIT' });
  jobQueue.registerProgress(jobId, 5, 'INIT');

  const storyDraft = await prepareStory(request);
  const story = await ensureSafeStory(storyDraft, !request.story);

  logger.info('Story ready', { jobId, stage: 'STORY', scenes: story.scenes.length });
  jobQueue.registerProgress(jobId, 20, 'STORY_READY');

  const narrationText = story.scenes.map(scene => scene.narration).join(' ');
  const narrationPath = await synthesizeSpeech(narrationText, config.tts.voiceId);
  const narrationDuration = await getAudioDuration(narrationPath);
  jobQueue.registerProgress(jobId, 35, 'TTS_READY');

  const durations = allocateDurations(story.scenes, narrationDuration);
  const scenesWithDurations = story.scenes.map((scene, index) => ({
    ...scene,
    duration: durations[index],
  }));
  const storyWithDurations: StoryResult = { ...story, scenes: scenesWithDurations };

  const storyWithVisuals = await attachVisuals(storyWithDurations);
  jobQueue.registerProgress(jobId, 55, 'VISUALS_READY');

  const captions = generateCaptions(storyWithVisuals.scenes);
  const subtitlesPath = await saveCaptionsToFile(captions, jobId);
  jobQueue.registerProgress(jobId, 65, 'CAPTIONS_READY');

  const renderResult = await renderVideo({
    jobId,
    scenes: buildRenderScenes(storyWithVisuals.scenes),
    narrationAudioPath: narrationPath,
    narrationDuration,
    subtitlesPath,
    options: request.options,
  });
  jobQueue.registerProgress(jobId, 95, 'RENDER_COMPLETE');

  const savedVideoPath = await saveToOutput(renderResult.videoPath);
  const videoUrl = getPublicUrl(savedVideoPath);

  return {
    videoPath: savedVideoPath,
    videoUrl,
    subtitlePath: subtitlesPath,
    description: buildDescription(storyWithVisuals),
    hashtags: buildHashtags(),
    metadata: {
      durationSeconds: renderResult.duration,
      numberOfScenes: storyWithVisuals.scenes.length,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      outputPath: savedVideoPath,
    },
    story: storyWithVisuals,
    assets: {
      narrationAudio: narrationPath,
      sceneImages: storyWithVisuals.scenes.map(scene => scene.assetPath || ''),
      captionsFile: subtitlesPath,
    },
  };
};

let initialized = false;

export const initializeJobPipeline = (): void => {
  if (initialized) return;
  jobQueue.registerProcessor(async (job, payload) => processJob(job.id, payload));
  initialized = true;
};

export { processJob };
