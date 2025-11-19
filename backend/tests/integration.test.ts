import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { createApp } from '../src/index';
import { processJob } from '../src/services/pipelineService';
import { CreateJobRequest, Scene, StoryResult } from '../src/types';
import { runCommand } from '../src/utils/command';
import { ensureDirectory } from '../src/utils/fileUtils';

jest.setTimeout(120000);
process.env.MOCK_FFMPEG = 'true';

const mockScenes: Scene[] = [
  {
    id: 'scene_1',
    order: 1,
    description: 'Test scene hook',
    narration: 'Test narration hook that lures viewers instantly.',
    imagePrompt: 'dark stage',
  },
  {
    id: 'scene_2',
    order: 2,
    description: 'Test scene twist',
    narration: 'Twist narration keeps the middle tense and eerie.',
    imagePrompt: 'shadow figure',
  },
  {
    id: 'scene_3',
    order: 3,
    description: 'Test scene finale',
    narration: 'Final beat leaves an unsettling echo in the dark.',
    imagePrompt: 'whispering hallway',
  },
];

const mockStory: StoryResult = {
  id: 'story_mock',
  title: 'Mocked Nightmare',
  description: 'Deterministic story for testing.',
  scenes: mockScenes,
  totalDuration: 60,
  createdAt: new Date(),
  wordCount: 160,
};

jest.mock('../src/services/storyService', () => {
  const actual = jest.requireActual('../src/services/storyService');
  return {
    ...actual,
    generateStory: jest.fn(async () => ({
      ...mockStory,
      scenes: mockScenes.map(scene => ({ ...scene })),
    })),
  };
});

jest.mock('../src/services/visualService', () => {
  const actual = jest.requireActual('../src/services/visualService');
  const config = jest.requireActual('../src/config/config').default;
  const testImageDir = path.join(config.assetsDir, 'test-images');
  return {
    ...actual,
    generateSceneImage: jest.fn(async (_prompt: string, index: number) => {
      await ensureDirectory(testImageDir);
      const filePath = path.join(testImageDir, `scene_${index}.png`);
      await runCommand('ffmpeg', [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=0x111111:size=1080x1920:duration=1',
        '-frames:v',
        '1',
        filePath,
      ]);
      return filePath;
    }),
  };
});

jest.mock('../src/services/ttsService', () => {
  const actual = jest.requireActual('../src/services/ttsService');
  const config = jest.requireActual('../src/config/config').default;
  const audioDir = path.join(config.assetsDir, 'test-audio');
  return {
    ...actual,
    synthesizeSpeech: jest.fn(async () => {
      await ensureDirectory(audioDir);
      const audioPath = path.join(audioDir, `mock_${Date.now()}.wav`);
      await runCommand('ffmpeg', [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=220:duration=12',
        audioPath,
      ]);
      return audioPath;
    }),
  };
});

describe('API surface', () => {
  const app = createApp();

  it('returns health payload', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('ffmpeg');
  });

  it('creates a horror video job', async () => {
    const response = await request(app)
      .post('/jobs')
      .send({ type: 'horror_video', prompt: 'test pipeline' })
      .expect(201);

    expect(response.body.data).toHaveProperty('jobId');
    expect(response.body.data).toHaveProperty('status');
  });
});

describe('Pipeline integration', () => {
  it('runs the mocked pipeline end-to-end and writes artifacts', async () => {
    const requestPayload: CreateJobRequest = {
      type: 'horror_video',
      prompt: 'integration prompt',
    };

    const result = await processJob('test_job_pipeline', { request: requestPayload });

    await expect(fs.access(result.videoPath)).resolves.toBeUndefined();
    await expect(fs.access(result.subtitlePath)).resolves.toBeUndefined();
    expect(result.metadata.numberOfScenes).toBe(mockScenes.length);
    expect(result.hashtags.length).toBeGreaterThan(0);
  });
});
