# n8n Workflows

This directory contains JSON exports of the n8n workflows that orchestrate the horror TikTok video generation pipeline.

## Overview

The pipeline is divided into three main workflows:

### Workflow 1 (WF1): Story Generation & Quality Control
**Purpose:** Generate horror story concepts, scripts, and scene breakdowns

**Steps:**
1. Receive trigger (manual, webhook, or scheduled)
2. Generate story idea using LLM
3. Expand into detailed script with scenes
4. Generate visual prompts for each scene
5. Run content safety checks
6. Quality control validation
7. Store approved story/scenes in database
8. Trigger WF2 if approved

**Outputs:**
- Story metadata (title, description)
- Scene-by-scene breakdown
- Visual prompts for each scene
- Narration text for each scene

### Workflow 2 (WF2): Asset Generation & Video Rendering
**Purpose:** Generate audio, visuals, and render final video

**Steps:**
1. Receive story data from WF1
2. Generate TTS audio for each scene narration
3. Generate AI images for each scene
4. Download and prepare assets
5. Call backend API to render video (ffmpeg)
6. Generate and add captions
7. Add background music (optional)
8. Upload final video to storage
9. Trigger WF3 for notifications

**Outputs:**
- Audio files for each scene
- Image files for each scene
- Final rendered video file
- Video metadata (duration, resolution, file size)

### Workflow 3 (WF3): Notification & Logging
**Purpose:** Handle post-production notifications and cleanup

**Steps:**
1. Receive completion data from WF2
2. Log job completion metrics
3. Send notifications (webhook, email, etc.)
4. Clean up temporary files
5. Update job status in database
6. (Optional) Post to TikTok API

**Outputs:**
- Job completion logs
- Notification confirmations
- Storage cleanup reports

## File Structure

Once workflows are created in n8n, export them as JSON files:

```
n8n-workflows/
├── wf1-story-generation.json
├── wf2-asset-rendering.json
└── wf3-notification-logging.json
```

## Usage

1. Import JSON files into your n8n instance
2. Configure credentials (API keys, storage, etc.)
3. Set environment-specific URLs (backend API endpoint)
4. Test each workflow individually
5. Enable workflows for production use

## Integration with Backend

The workflows communicate with the backend service via REST API:

- `POST /jobs` - Create a new video generation job
- `GET /jobs/:id` - Check job status
- (Future) `POST /render` - Trigger video rendering
- (Future) `POST /upload` - Upload completed video

## Future Enhancements

- Add retry logic for failed API calls
- Implement parallel processing for multiple videos
- Add monitoring and alerting
- Create admin workflow for content moderation review
- Add analytics tracking
