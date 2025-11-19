# Multi-Niche TikTok Automation Backend

Backend service for automated TikTok video generation across multiple content niches.

## Overview

This Node.js + TypeScript service turns a short prompt into a ready-to-upload 9:16 MP4 complete with AI-generated content, narration, visuals, captions, and TikTok-optimized metadata.

**Multi-Niche Support**: Create content for horror stories, Reddit narratives, motivational content, business facts, and more - all from the same engine with niche-specific configurations.

### Pipeline Stages

1. **Story Generation** – AI-powered (GPT) or deterministic story generation with niche-specific tone and structure
2. **Content Safety** – Filter and sanitize content to meet platform policies
3. **Narration** – Professional TTS using OpenAI voices or mock audio for testing
4. **Visuals** – AI image generation (DALL-E) or placeholder cards
5. **Captions** – Auto-generated SRT subtitles with customizable styling
6. **Rendering** – ffmpeg-based assembly into 1080x1920 MP4 with transitions and music
7. **Delivery** – Local/S3 storage with TikTok-ready metadata

## Key Features

✨ **Multi-Niche Architecture** - Easily configure different content types  
🤖 **AI-Powered** - OpenAI GPT, TTS, and DALL-E integration  
🔌 **Pluggable Services** - Swap providers via environment config  
📐 **Type-Safe** - TypeScript strict mode with Zod validation  
📊 **Observable** - Comprehensive logging and error tracking  
🧪 **Testable** - Mocked services for development without API costs

## Setup

Requirements:

- Node.js 20+
- ffmpeg & ffprobe available on `PATH`
- OpenAI API key (optional, for AI features)

Install dependencies:

```bash
npm install
```

Copy env template:

```bash
cp .env.example .env
```

### Environment Configuration

Key variables:

| Variable | Description | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API key for AI features | - |
| `TTS_PROVIDER` | TTS provider: `openai`, `mock` | `mock` |
| `IMAGE_PROVIDER` | Image provider: `openai`, `mock` | `mock` |
| `OPENAI_MODEL` | GPT model for stories | `gpt-4o-mini` |
| `PORT` | Express server port | `3000` |
| `OUTPUT_DIR` | Folder for output videos/subtitles | `./output` |
| `ASSETS_DIR` | Temp working directory | `./assets` |

> The system ships with mock TTS + visuals powered by ffmpeg, allowing you to run the entire pipeline locally without API costs. Enable AI features by setting providers to `openai` and adding your API key.

## Development & build

```bash
npm run dev       # ts-node-dev with hot reload
npm run build     # compile to dist/
npm start         # run compiled server
```

## Testing

```bash
npm test
```

`tests/integration.test.ts` mocks the creative services, sets `MOCK_FFMPEG=true`, and runs the full pipeline end-to-end, asserting a video + SRT land in `output/`. In real runs make sure ffmpeg/ffprobe are available on your `PATH`.

## API

### `GET /health`

Returns JSON with service version, ffmpeg availability, and job statistics.

### `GET /niches`

List available niche profiles.

```json
{
  "success": true,
  "data": {
    "niches": [
      { "id": "horror", "name": "Horror & Creepy Stories" },
      { "id": "reddit_stories", "name": "Reddit Stories" }
    ]
  }
}
```

### `POST /jobs`

Create a new video generation job.

```json
{
  "nicheId": "horror",
  "prompt": "Whispered coordinates appearing in my stream chat"
}
```

Fields:

| Field | Required | Description |
| --- | --- | --- |
| `nicheId` | yes | Niche profile ID (e.g., "horror", "reddit_stories") |
| `prompt` | yes* | Short seed idea for AI story generation |
| `story` | optional | Full story structure `{ title?, description?, scenes: [...] }` |
| `options` | optional | Override render defaults (fps, captions, music, etc.) |

*Either `prompt` or `story` must be supplied.

**Response:**

```json
{
  "success": true,
  "data": {
    "jobId": "job_1234567890_abc123",
    "status": "pending",
    "nicheId": "horror",
    "createdAt": "2025-11-19T17:00:00.000Z"
  }
}
```

### `GET /jobs/:id`

Get job status and results.

Returns `{ status: "pending" | "running" | "failed" | "completed", progress, result? }`.

**Completed job example:**

```json
{
  "success": true,
  "data": {
    "id": "job_...",
    "status": "completed",
    "result": {
      "videoPath": "/path/to/output/job_....mp4",
      "videoUrl": "http://localhost:3000/output/job_....mp4",
      "subtitlePath": ".../job_....srt",
      "description": "The Midnight Echo — I hit record...",
      "hashtags": ["#horrortok", "#scarystory", "#fyp"],
      "metadata": {
        "durationSeconds": 60,
        "numberOfScenes": 4
      }
    }
  }
}
```

## Project structure

```
src/
├── clients/           # External service clients
│   ├── llmClient.ts       # OpenAI GPT for story generation
│   ├── ttsEngine.ts       # TTS providers (OpenAI, mock)
│   └── imageGenerator.ts  # Image generators (DALL-E, mock)
├── config/            # Configuration & niche profiles
│   ├── env.ts             # Validated environment config
│   ├── niches.ts          # Niche profile definitions
│   └── nicheLoader.ts     # Profile registry
├── controllers/       # HTTP handlers
├── routes/            # Express routers
├── services/
│   ├── pipelineService.ts   # Orchestrates full job workflow
│   ├── jobQueue.ts          # In-memory or Redis queue
│   ├── storyService.ts      # AI or deterministic story generator
│   ├── contentFilter.ts     # Safety & sanitization
│   ├── ttsService.ts        # Text-to-speech orchestration
│   ├── visualService.ts     # Image generation orchestration
│   ├── renderService.ts     # ffmpeg video assembly
│   ├── captionService.ts    # SRT generation
│   └── storageService.ts    # Local/S3 persistence
├── types/             # Shared TypeScript interfaces
│   ├── index.ts           # Core types
│   └── niche.ts           # Niche profile types
└── utils/             # Logger, command runner, file helpers
```

## Customisation guide

### Adding a New Niche

1. **Define the profile** in `src/config/niches.ts`:

```typescript
export const myNiche: NicheProfile = {
  id: 'my_niche',
  name: 'My Niche Name',
  storyStyle: {
    defaultLengthSeconds: 60,
    tone: 'engaging, informative',
    structureTemplate: ['hook', 'content', 'conclusion'],
    targetWordCount: { min: 150, max: 200 },
  },
  visuals: {
    baseStylePrompt: 'modern, clean, professional',
    preferredVisualMode: 'ai_images',
    numScenes: 4,
    imageSize: '1024x1792',
  },
  voice: {
    provider: 'openai_tts',
    voiceId: 'nova',
    speed: 1.0,
    model: 'tts-1',
  },
  // ... other settings
};
```

2. **Register it** in `src/config/nicheLoader.ts`:

```typescript
const profiles = [horrorProfile, redditStoriesProfile, myNiche];
```

### Swapping Providers

Change in `.env`:

```bash
# Use OpenAI for everything
TTS_PROVIDER=openai
IMAGE_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Or use mocks for development
TTS_PROVIDER=mock
IMAGE_PROVIDER=mock
```

### Extending Services

| Layer | How to Extend |
| --- | --- |
| **Story** | Implement new LLM provider in `clients/` |
| **TTS** | Add engine to `clients/ttsEngine.ts` (e.g., ElevenLabs) |
| **Images** | Add generator to `clients/imageGenerator.ts` |
| **Storage** | Implement S3/R2 in `services/storageService.ts` |
| **Queue** | Add Redis/BullMQ support in `services/jobQueue.ts` |

## Known limitations

- Job queue is in-memory (switch to Redis for persistence)
- Background music uses ffmpeg-generated noise (add real audio library)
- S3/R2 storage not yet implemented (files stored locally)
- TikTok auto-posting not implemented (webhook hooks available)

## Niche Profiles

Built-in niches:

- **horror** - Creepy short-form horror with dark visuals, tense narration
- **reddit_stories** - Conversational Reddit storytelling with clean visuals

Add custom niches in `src/config/niches.ts`.

## Output

- MP4 files: `backend/output/job_<timestamp>.mp4`
- Captions: `backend/output/job_<timestamp>.srt`
- API returns TikTok-ready description + hashtag bundle for quick manual posting.
