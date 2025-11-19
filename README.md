# Horror TikTok Backend

Backend service for the automated horror TikTok video generation pipeline.

## Overview

This Node.js + TypeScript service turns a short horror prompt (or a fully provided script) into a ready-to-upload 9:16 MP4 complete with captions and publishing metadata.

Pipeline stages:

1. **Story crafting** – generate or validate a 140–180 word horror script with hook, build-up, twist and chilling ending.
2. **Content safety** – soften risky terms and reject scripts that violate policy (self-harm, minors, sexual violence, real crimes, etc.).
3. **Narration** – synthesize a placeholder vocal track (swap with your preferred TTS provider later).
4. **Visuals** – create eerie scene cards (mocked via ffmpeg drawtext; pluggable for Stable Diffusion, Midjourney, etc.).
5. **Captions** – auto-split narration into time-coded SRT subtitles and optionally burn them into the video.
6. **Rendering** – stitch visuals, subtle glitch transitions, narration, ambient bed and captions into a 1080x1920 MP4 using ffmpeg.
7. **Delivery** – save video + SRT into `/output`, return TikTok-ready description/hashtags and metadata via the jobs API.

## Setup

Requirements:

- Node.js 20+
- ffmpeg & ffprobe available on `PATH`

Install dependencies:

```bash
npm install
```

Copy env template:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
| --- | --- |
| `PORT` | Express server port |
| `OUTPUT_DIR` | Folder for ready videos/subtitles |
| `ASSETS_DIR` | Temp working directory for audio/images/intermediate files |
| `MIN_STORY_WORD_COUNT` / `MAX_STORY_WORD_COUNT` | Safety rails for generated copy |
| `TTS_*` | Plug your favourite text-to-speech API (mock tone out of the box) |
| `IMAGE_*` | Placeholder for Stable Diffusion / Midjourney credentials |
| `RENDER_*` | 9:16 output options, caption/music toggles, glitch transitions |

> The repo ships with mock TTS + visuals powered purely by ffmpeg so you can run the entire stack locally. Swap the implementations in `src/services/ttsService.ts` and `src/services/visualService.ts` when you connect real providers.

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

Returns JSON with service version, ffmpeg availability, and live job stats.

### `POST /jobs`

```json
{
  "type": "horror_video",
  "prompt": "Whispered coordinates that keep appearing in my stream chat"
}
```

Fields:

| Field | Required | Description |
| --- | --- | --- |
| `type` | yes | Currently only `horror_video` |
| `prompt` | yes* | Short seed idea for internal story generator |
| `story` | optional | Provide `{ title?, description?, scenes: [{ description, narration, imagePrompt?, duration? }] }` to bypass AI story creation |
| `options` | optional | Override render defaults (fps, captions, music, glitch toggles, etc.) |

Either `prompt` or `story` must be supplied.

### `GET /jobs/:id`

Returns `{ status: "pending" | "running" | "failed" | "completed", progress, result? }`.

Successful payload excerpt:

```json
{
  "success": true,
  "data": {
    "id": "job_...",
    "status": "completed",
    "result": {
      "videoUrl": "file:///workspace/TikTok-Automation/backend/output/job_...mp4",
      "subtitlePath": ".../job_....srt",
      "description": "The Midnight Echo — I hit record the moment...",
      "hashtags": ["#horrortok", "#scarystory", "#aivideo", "#nightshift"],
      "metadata": {
        "durationSeconds": 60,
        "numberOfScenes": 4,
        "outputPath": "/workspace/.../output/job_....mp4"
      }
    }
  }
}
```

## Project structure

```
src/
├── config/            # Env + defaults
├── controllers/       # HTTP handlers
├── routes/            # Express routers
├── services/
│   ├── pipelineService.ts   # Orchestrates full job workflow
│   ├── jobQueue.ts          # In-memory queue/worker
│   ├── storyService.ts      # Deterministic story generator
│   ├── contentFilter.ts     # Safety + sanitiser
│   ├── ttsService.ts        # Mock TTS (swap with real provider)
│   ├── visualService.ts     # Placeholder cards via ffmpeg drawtext
│   ├── renderService.ts     # ffmpeg slideshow + audio mixing
│   ├── captionService.ts    # Sentence-based caption timing
│   └── storageService.ts    # Local persistence (swap with S3/R2)
├── types/             # Shared interfaces
└── utils/             # Logger, command runner, file helpers
```

## Customisation guide

| Layer | File | Notes |
| --- | --- | --- |
| Story | `src/services/storyService.ts` | Replace deterministic generator with GPT/Claude. Keep `StoryResult` shape. |
| TTS | `src/services/ttsService.ts` | Call ElevenLabs/OpenAI Speech, save WAV/MP3 locally, return path. |
| Visuals | `src/services/visualService.ts` | Call Stable Diffusion/SDXL/text-to-video provider; store returned file path. |
| Moderation | `src/services/contentFilter.ts` | Integrate OpenAI Moderation, AWS Comprehend, or bespoke rules. |
| Storage | `src/services/storageService.ts` | Upload to S3/R2/Supabase and update `getPublicUrl`. |
| Queue | `src/services/jobQueue.ts` | Swap the in-memory queue for BullMQ/Redis for persistence + concurrency. |

## Known limitations

- Mock TTS + visuals are tonal placeholders; replace before publishing widely.
- Job queue is in-memory; restart wipes active jobs.
- Background ambience uses ffmpeg-generated noise. Bring your own licensed stems if preferred.

## Output

- MP4 files: `backend/output/job_<timestamp>.mp4`
- Captions: `backend/output/job_<timestamp>.srt`
- API returns TikTok-ready description + hashtag bundle for quick manual posting.
