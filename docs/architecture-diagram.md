# High-Level Architecture

This document describes the architecture of the horror TikTok video generation pipeline.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         External Clients                         │
│                    (Webhooks, Manual Triggers)                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         n8n Workflows                            │
│  ┌──────────┐      ┌──────────┐      ┌────────────────────┐   │
│  │   WF1    │─────▶│   WF2    │─────▶│       WF3          │   │
│  │  Story   │      │  Render  │      │  Notify & Cleanup  │   │
│  └──────────┘      └──────────┘      └────────────────────┘   │
└──────────┬─────────────────┬─────────────────────────────────────┘
           │                 │
           │                 │
           ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API Service                           │
│                    (Node.js + TypeScript)                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  REST API (Express.js)                                  │    │
│  │  - POST /jobs (create job)                              │    │
│  │  - GET /jobs/:id (status)                               │    │
│  │  - GET /health                                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐     │
│  │  Story   │   TTS    │  Visual  │  Render  │ Content  │     │
│  │ Service  │ Service  │ Service  │ Service  │  Filter  │     │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Job Queue & State Management                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────┬───────────────────┬───────────────────┬─────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────┐   ┌──────────────────┐
│  External APIs   │  │    ffmpeg    │   │  Storage (S3)    │
│  - OpenAI/Claude │  │  Video       │   │  - Videos        │
│  - ElevenLabs    │  │  Rendering   │   │  - Assets        │
│  - DALL-E/SD     │  │              │   │  - Temp Files    │
└──────────────────┘  └──────────────┘   └──────────────────┘
```

## Components

### 1. n8n Workflows
Orchestration layer that coordinates the entire pipeline:
- **WF1**: Story generation and quality control
- **WF2**: Asset generation and video rendering
- **WF3**: Notifications, logging, and cleanup

### 2. Backend API Service
Node.js/TypeScript service that handles:
- RESTful API endpoints
- Business logic for video generation
- Integration with external services
- Job queue management
- Content safety filtering

### 3. External Services
- **LLM APIs**: OpenAI, Anthropic for story generation
- **TTS Providers**: ElevenLabs, Google TTS for narration
- **Image Generation**: DALL-E, Stable Diffusion for visuals
- **ffmpeg**: Video rendering and processing
- **Storage**: S3-compatible storage for assets and videos

## Data Flow

### Story Generation Flow (WF1)
1. Trigger received (webhook, schedule, manual)
2. n8n calls LLM API to generate story idea
3. Story expanded into scenes with narration
4. Image prompts generated for each scene
5. Content safety check performed
6. Approved story stored and passed to WF2

### Asset & Render Flow (WF2)
1. Receive story data from WF1
2. Generate TTS audio for each scene (parallel)
3. Generate AI images for each scene (parallel)
4. Download all assets to temp storage
5. Call backend render service
6. Backend uses ffmpeg to create video segments
7. Segments combined with transitions
8. Captions and music added
9. Final video uploaded to storage
10. Trigger WF3 for notifications

### Notification Flow (WF3)
1. Receive completion data from WF2
2. Log metrics and completion status
3. Send notifications (webhooks, email)
4. Clean up temporary files
5. Update final job status
6. (Optional) Post to TikTok API

## Scalability Considerations

- **Horizontal Scaling**: Backend API can run multiple instances behind load balancer
- **Queue-Based Processing**: Decouple job creation from processing
- **Async Operations**: All heavy operations (TTS, image gen, render) are async
- **Storage**: Cloud storage for unlimited capacity
- **Caching**: Cache generated assets to avoid regeneration

## Security Measures

- **Content Moderation**: All content filtered before rendering
- **API Authentication**: Secure API endpoints with JWT
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Sanitize all inputs
- **Secure Storage**: Signed URLs for asset access

## Future Architecture

- **Kubernetes**: Container orchestration for scaling
- **Redis**: Distributed job queue and caching
- **CDN**: Content delivery for videos
- **Database**: PostgreSQL for job/video metadata
- **Monitoring**: Prometheus + Grafana for observability
