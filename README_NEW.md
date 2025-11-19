# Multi-Niche TikTok Automation Engine

A production-ready, multi-niche automation engine for creating faceless TikTok videos using AI. Generate engaging short-form content for horror, Reddit stories, motivational content, and more.

## 🚀 Features

- **Multi-Niche Support**: Easily configure different content niches (horror, reddit stories, etc.)
- **AI-Powered Story Generation**: OpenAI GPT integration for dynamic content creation
- **Professional Text-to-Speech**: OpenAI TTS with multiple voice options
- **AI Image Generation**: DALL-E integration for scene visuals
- **9:16 Vertical Videos**: Optimized for TikTok with captions and music
- **Pluggable Architecture**: Swap providers (TTS, images, storage) via configuration
- **Type-Safe**: Built with TypeScript in strict mode
- **Observable**: Comprehensive logging and error handling

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Niche Profiles](#niche-profiles)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

## 🏗 Architecture

The system follows a modular pipeline architecture:

```
Job Request → Story Generation → Content Safety → TTS → Visual Generation → Rendering → Storage → Output
```

### Core Services

- **storyService** - Generates structured stories using LLM or deterministic templates
- **ttsService** - Synthesizes narration audio using OpenAI TTS or mock
- **visualService** - Creates scene visuals using DALL-E or placeholders
- **renderService** - Assembles final video with ffmpeg (9:16, captions, transitions)
- **captionService** - Generates and burns SRT subtitles
- **jobQueue** - Manages async job processing (in-memory or Redis)
- **storageService** - Handles file persistence (local or S3/R2)

### Niche Profile System

Each niche profile configures:
- Story style (tone, structure, length)
- Visual aesthetic (prompts, style)
- Voice settings (provider, voice ID, speed)
- Music and SFX preferences
- Caption styling
- Hashtags and metadata

## 📦 Prerequisites

- **Node.js** 20+
- **ffmpeg** and **ffprobe** installed and available on PATH
- **OpenAI API Key** (for AI features)

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/sedarged/TikTok-Automation.git
cd TikTok-Automation/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your environment (see Configuration section)
nano .env
```

## ⚙️ Configuration

### Environment Variables

Edit `.env` file with your configuration:

```bash
# OpenAI API Key (required for AI features)
OPENAI_API_KEY=sk-...

# Choose providers
TTS_PROVIDER=openai        # or "mock"
IMAGE_PROVIDER=openai      # or "mock"

# Optional: Advanced OpenAI settings
OPENAI_MODEL=gpt-4o-mini   # or gpt-4o for better quality
OPENAI_IMAGE_QUALITY=standard  # or "hd"
TTS_MODEL=tts-1            # or tts-1-hd
```

See `.env.example` for complete configuration options.

### Niche Profiles

Built-in niches:
- **horror** - Creepy short-form horror narratives
- **reddit_stories** - Engaging storytelling from Reddit posts

Add custom niches in `src/config/niches.ts`.

## 🎬 Usage

### Start the Server

```bash
# Development mode (hot reload)
npm run dev

# Production mode
npm run build
npm start
```

Server runs on `http://localhost:3000` by default.

### Create a Video

#### Using the Horror Niche

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "nicheId": "horror",
    "prompt": "A mysterious package that arrives at midnight"
  }'
```

#### Using Reddit Stories Niche

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "nicheId": "reddit_stories",
    "prompt": "AITA for refusing to attend my sisters wedding"
  }'
```

#### Response

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

### Check Job Status

```bash
curl http://localhost:3000/jobs/job_1234567890_abc123
```

#### Completed Job Response

```json
{
  "success": true,
  "data": {
    "id": "job_1234567890_abc123",
    "status": "completed",
    "progress": 100,
    "result": {
      "videoPath": "/path/to/output/job_1234567890_abc123.mp4",
      "videoUrl": "http://localhost:3000/output/job_1234567890_abc123.mp4",
      "subtitlePath": "/path/to/output/job_1234567890_abc123.srt",
      "description": "The Midnight Package — A mysterious package arrives...",
      "hashtags": ["#horrortok", "#scarystory", "#creepypasta", "#fyp"],
      "metadata": {
        "durationSeconds": 58,
        "numberOfScenes": 4
      }
    }
  }
}
```

## 📚 API Reference

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "0.3.0",
  "timestamp": "2025-11-19T17:00:00.000Z",
  "ffmpeg": {
    "available": true,
    "version": "4.4.2"
  }
}
```

### `GET /niches`

List available niche profiles.

**Response:**
```json
{
  "success": true,
  "data": {
    "niches": [
      {
        "id": "horror",
        "name": "Horror & Creepy Stories",
        "description": "Short-form horror narratives..."
      },
      {
        "id": "reddit_stories",
        "name": "Reddit Stories",
        "description": "Engaging true stories from Reddit..."
      }
    ]
  }
}
```

### `POST /jobs`

Create a new video generation job.

**Request Body:**
```json
{
  "nicheId": "horror",           // Required: niche profile ID
  "prompt": "Your story idea",   // Required if no story provided
  "story": {                     // Optional: provide full story
    "title": "My Title",
    "description": "Description",
    "scenes": [
      {
        "description": "Scene description",
        "narration": "Narration text",
        "imagePrompt": "Image prompt",
        "duration": 12
      }
    ]
  },
  "options": {                   // Optional: override render settings
    "includeCaptions": true,
    "includeMusic": true
  }
}
```

**Response:** See [Create a Video](#create-a-video) section

### `GET /jobs/:id`

Get job status and results.

**Response:** See [Check Job Status](#check-job-status) section

## 🎨 Niche Profiles

### Creating a Custom Niche

Add to `src/config/niches.ts`:

```typescript
export const myCustomNiche: NicheProfile = {
  id: 'my_niche',
  name: 'My Custom Niche',
  description: 'Description of my niche',
  storyStyle: {
    defaultLengthSeconds: 60,
    tone: 'inspirational, uplifting',
    structureTemplate: ['hook', 'story', 'lesson', 'cta'],
    targetWordCount: { min: 150, max: 200 },
  },
  visuals: {
    baseStylePrompt: 'high energy, motivational, gym aesthetic',
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
    mood: 'energetic, upbeat',
    sfxDensity: 'light',
    musicVolume: 0.2,
  },
  captions: {
    fontFamily: 'DejaVuSans-Bold',
    fontSize: 54,
    fontColor: 'white',
    placement: 'center',
    highlightStyle: 'keyword_highlight',
    highlightColor: 'yellow',
  },
  hashtagsAndMetadata: {
    defaultHashtags: ['#motivation', '#inspiration', '#fyp'],
    ctaPhrases: ['Keep pushing!', 'Follow for more'],
  },
};
```

Register in `src/config/nicheLoader.ts`:

```typescript
const profiles = [horrorProfile, redditStoriesProfile, myCustomNiche];
```

## 🛠 Development

### Project Structure

```
backend/
├── src/
│   ├── clients/          # External service clients (OpenAI, etc.)
│   ├── config/           # Configuration and niche profiles
│   ├── controllers/      # HTTP request handlers
│   ├── routes/           # Express routes
│   ├── services/         # Core business logic
│   │   ├── storyService.ts
│   │   ├── ttsService.ts
│   │   ├── visualService.ts
│   │   ├── renderService.ts
│   │   ├── captionService.ts
│   │   └── pipelineService.ts
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utilities (logger, file helpers)
│   └── index.ts          # Application entry point
├── tests/
│   └── integration.test.ts
├── .env.example
├── package.json
└── tsconfig.json
```

### Build

```bash
npm run build
```

Output in `dist/` directory.

### Lint

```bash
npm run lint
```

Note: ESLint not currently configured. Use TypeScript strict mode for type safety.

## 🧪 Testing

Run tests:

```bash
npm test
```

The test suite uses mocked services by default (no API calls).

### Test Coverage

- API endpoint tests
- End-to-end pipeline integration
- Story generation (mocked LLM)
- TTS synthesis (mocked audio)
- Image generation (mocked visuals)
- Video rendering

## 🚀 Deployment

### Environment Setup

1. Set required environment variables
2. Ensure ffmpeg is installed
3. Configure storage (S3/R2) for production
4. Set up Redis for persistent job queue (optional)

### Production Considerations

- Use `TTS_PROVIDER=openai` and `IMAGE_PROVIDER=openai` for quality
- Consider using `OPENAI_MODEL=gpt-4o` for better stories
- Set up S3/R2 for video storage
- Implement Redis for job queue persistence
- Add rate limiting and authentication
- Monitor costs (OpenAI API usage)

### Docker (Coming Soon)

Docker support planned for easier deployment.

## 📝 Cost Considerations

Typical costs per video (using OpenAI):

- **Story Generation**: ~$0.01-0.02 (gpt-4o-mini)
- **TTS**: ~$0.015 per 1k characters
- **Image Generation**: ~$0.04 per DALL-E 3 standard image

For 4-scene video (~60s): **~$0.20-0.30 per video**

Use mock providers for development to avoid costs.

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Additional niche profiles
- ElevenLabs TTS integration
- B-roll video support
- Automated posting to TikTok
- Trend discovery integration
- Advanced caption animations
- Music library integration

## 📄 License

ISC

## 🙏 Acknowledgments

Built with:
- Node.js + TypeScript
- Express
- OpenAI (GPT, TTS, DALL-E)
- ffmpeg
- Zod for validation

---

**Need Help?** Open an issue on GitHub or check the documentation in `/docs`.
