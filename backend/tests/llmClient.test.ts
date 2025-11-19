// Mock the env config before importing
jest.mock('../src/config/env', () => ({
  envConfig: {
    openai: {
      apiKey: 'test-api-key',
      model: 'gpt-4o-mini',
      imageModel: 'dall-e-3',
      imageQuality: 'standard',
    },
  },
}));

// Mock OpenAI client
const mockCreate = jest.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: JSON.stringify({
          title: 'Test Horror Story',
          hook: 'Something terrifying happened...',
          scenes: [
            {
              description: 'Opening scene',
              narration: 'This is the opening narration that sets the tone.',
              imagePrompt: 'dark, eerie hallway, horror lighting',
              sfxHint: 'creaking door',
            },
            {
              description: 'Build-up scene',
              narration: 'The tension builds as something moves in the shadows.',
              imagePrompt: 'shadowy figure, mysterious, horror aesthetic',
            },
            {
              description: 'Twist scene',
              narration: 'Then everything changed in an instant.',
              imagePrompt: 'shocking reveal, dramatic lighting',
            },
            {
              description: 'Ending scene',
              narration: 'And nothing was ever the same again.',
              imagePrompt: 'ominous ending, fade to black',
            },
          ],
          description: 'A chilling short horror story',
          hashtags: ['#horror', '#scary', '#creepy', '#fyp'],
        }),
      },
    },
  ],
});

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

import { LLMClient } from '../src/clients/llmClient';
import { horrorProfile } from '../src/config/niches';

describe('LLM Client', () => {
  let llmClient: LLMClient;

  beforeEach(() => {
    llmClient = new LLMClient();
  });

  it('initializes when API key is present', () => {
    expect(llmClient.isAvailable()).toBe(true);
  });

  it('generates structured story', async () => {
    const story = await llmClient.generateStructuredStory({
      prompt: 'A haunted house',
      nicheProfile: horrorProfile,
    });

    expect(story.title).toBeDefined();
    expect(story.hook).toBeDefined();
    expect(story.scenes).toHaveLength(4);
    expect(story.description).toBeDefined();
    expect(story.hashtags.length).toBeGreaterThan(0);
  });

  it('generates scenes with required fields', async () => {
    const story = await llmClient.generateStructuredStory({
      prompt: 'A mysterious sound',
      nicheProfile: horrorProfile,
    });

    story.scenes.forEach(scene => {
      expect(scene.description).toBeDefined();
      expect(scene.narration).toBeDefined();
      expect(scene.imagePrompt).toBeDefined();
    });
  });

  it('retries on failure', async () => {
    const story = await llmClient.generateWithRetry(
      {
        prompt: 'Test prompt',
        nicheProfile: horrorProfile,
      },
      2
    );

    expect(story).toBeDefined();
    expect(story.scenes.length).toBeGreaterThan(0);
  });
});
