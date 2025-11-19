# Horror TikTok Backend

Backend service for the automated horror TikTok video generation pipeline.

## Overview

This is a Node.js + TypeScript HTTP API that orchestrates the video generation process:
- Accepts job requests via REST API
- Generates horror story scripts using AI
- Converts scripts to speech (TTS)
- Generates visual assets with AI image generation
- Renders final video with ffmpeg
- Applies content safety filters
- Manages storage and delivery

**Current Status:** This is a scaffold with stub implementations. Full video pipeline logic will be added in future iterations.

## Prerequisites

- Node.js 20.x or later
- npm or yarn
- ffmpeg (required for video rendering - will be used later)

## Installation

Install dependencies:

```bash
npm install
```

## Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` to add your API keys and configuration:
- `PORT`: Server port (default: 3000)
- `OUTPUT_DIR`: Directory for generated videos
- `ASSETS_DIR`: Directory for temporary assets
- `TTS_API_URL`, `TTS_API_KEY`, `TTS_VOICE_ID`: Text-to-speech provider credentials
- `IMAGE_API_URL`, `IMAGE_API_KEY`: Image generation provider credentials
- `MAX_SCENES`: Maximum scenes per video (default: 8)
- `MAX_VIDEO_DURATION_SECONDS`: Maximum video length (default: 70)

## Development

Run the server in development mode with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

This creates a `dist/` folder with compiled files.

## Production

Run the compiled server:

```bash
npm start
```

## Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm test:watch
```

## API Endpoints

### Health Check
```
GET /health
```

Returns server status and version.

### Job Management

#### Create Job
```
POST /jobs
Content-Type: application/json

{
  "type": "horror_video",
  "prompt": "A scary story about..."
}
```

Returns a job ID for tracking.

#### Get Job Status
```
GET /jobs/:id
```

Returns the current status and progress of a job.

## Project Structure

```
src/
├── index.ts              # Server entry point
├── config/
│   └── config.ts         # Configuration loader
├── routes/
│   ├── healthRoutes.ts   # Health check routes
│   └── jobRoutes.ts      # Job management routes
├── controllers/
│   └── jobController.ts  # Job request handlers
├── services/
│   ├── jobQueue.ts       # Job queue management
│   ├── storyService.ts   # Story generation (stub)
│   ├── ttsService.ts     # Text-to-speech (stub)
│   ├── visualService.ts  # Image generation (stub)
│   ├── renderService.ts  # Video rendering (stub)
│   ├── captionService.ts # Caption generation (stub)
│   ├── contentFilter.ts  # Content moderation (stub)
│   └── storageService.ts # Storage management (stub)
├── types/
│   └── index.ts          # TypeScript type definitions
└── utils/
    ├── logger.ts         # Logging utility
    ├── errorHandler.ts   # Error handling
    └── fileUtils.ts      # File utilities
```

## Future Enhancements

The following features will be implemented in future iterations:

- **Story Generation**: Integration with LLM APIs (OpenAI, Anthropic, etc.) for horror story creation
- **Text-to-Speech**: Integration with TTS providers (ElevenLabs, Google TTS, etc.)
- **Image Generation**: Integration with AI image generators (DALL-E, Midjourney, Stable Diffusion)
- **Video Rendering**: ffmpeg pipeline for combining audio, images, and effects
- **Caption Overlay**: Automated caption generation and video overlay
- **Background Music**: Audio mixing with royalty-free horror music
- **Job Queue**: Persistent queue with Redis or BullMQ
- **Storage**: S3-compatible storage for video hosting
- **Content Safety**: AI-powered content moderation
- **Rate Limiting**: API rate limiting and authentication
- **Webhooks**: Callback notifications when jobs complete

## Development Notes

- Currently all service methods return stub/mock data
- Real implementations will be added after the scaffold is validated
- Tests are minimal smoke tests to verify the API structure
