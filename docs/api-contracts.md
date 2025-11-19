# API Contracts

This document defines the REST API contracts for the horror TikTok video generation backend.

## Base URL

```
Production: https://api.horror-tiktok.example.com
Development: http://localhost:3000
```

## Authentication

*Note: Authentication will be added in future versions*

Currently, the API is open. Future versions will require:
- API key in header: `X-API-Key: your-api-key`
- Or JWT token: `Authorization: Bearer <token>`

## Endpoints

### Health Check

**GET** `/health`

Check server health and status.

**Response 200 OK**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Create Job

**POST** `/jobs`

Create a new video generation job.

**Request Body**
```json
{
  "type": "horror_video",
  "prompt": "A scary story about an abandoned mansion",
  "options": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "format": "mp4",
    "quality": "high",
    "includeCaptions": true,
    "includeMusic": true
  }
}
```

**Fields:**
- `type` (required): Job type, currently only `"horror_video"`
- `prompt` (optional): Story generation prompt or theme
- `options` (optional): Rendering options
  - `width`: Video width in pixels (default: 1080)
  - `height`: Video height in pixels (default: 1920)
  - `fps`: Frames per second (default: 30)
  - `format`: Output format (default: "mp4")
  - `quality`: Encoding quality: "low", "medium", "high" (default: "high")
  - `includeCaptions`: Add captions overlay (default: true)
  - `includeMusic`: Add background music (default: true)

**Response 201 Created**
```json
{
  "success": true,
  "data": {
    "jobId": "job_1705315800000_abc123",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**

400 Bad Request
```json
{
  "status": "error",
  "message": "Job type is required"
}
```

500 Internal Server Error
```json
{
  "status": "error",
  "message": "Failed to create job"
}
```

---

### Get Job Status

**GET** `/jobs/:id`

Get the status and details of a job.

**Path Parameters:**
- `id`: Job ID returned from create job endpoint

**Response 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "job_1705315800000_abc123",
    "type": "horror_video",
    "status": "processing",
    "progress": 45,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:31:30.000Z"
  }
}
```

**Status Values:**
- `pending`: Job created, waiting to start
- `processing`: Job is being processed
- `completed`: Job finished successfully
- `failed`: Job failed with error

**Response when completed:**
```json
{
  "success": true,
  "data": {
    "id": "job_1705315800000_abc123",
    "type": "horror_video",
    "status": "completed",
    "progress": 100,
    "result": {
      "id": "story_1705315800000",
      "title": "The Abandoned Mansion",
      "description": "A horror story about...",
      "scenes": [
        {
          "id": "scene_1",
          "order": 1,
          "description": "Dark mansion exterior",
          "narration": "The mansion stood abandoned...",
          "imageUrl": "https://storage.example.com/images/scene_1.png",
          "audioUrl": "https://storage.example.com/audio/scene_1.mp3",
          "duration": 8
        }
      ],
      "totalDuration": 65,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z",
    "completedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Response when failed:**
```json
{
  "success": true,
  "data": {
    "id": "job_1705315800000_abc123",
    "type": "horror_video",
    "status": "failed",
    "progress": 30,
    "error": "Content moderation failed: prohibited content detected",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:31:00.000Z",
    "completedAt": "2024-01-15T10:31:00.000Z"
  }
}
```

**Error Responses**

404 Not Found
```json
{
  "status": "error",
  "message": "Job not found"
}
```

---

## Future Endpoints

The following endpoints will be added in future versions:

### Render Video
**POST** `/render`
Trigger rendering of an approved story.

### Upload Asset
**POST** `/upload`
Upload custom assets (background music, logos, etc.)

### List Jobs
**GET** `/jobs?status=completed&limit=10&offset=0`
List all jobs with filtering and pagination.

### Cancel Job
**DELETE** `/jobs/:id`
Cancel a pending or processing job.

### Get Video
**GET** `/videos/:id`
Retrieve final video file or signed URL.

---

## Webhooks (Future)

Clients can register webhook URLs to receive notifications:

**Job Status Update**
```json
{
  "event": "job.status_updated",
  "jobId": "job_1705315800000_abc123",
  "status": "completed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

**Job Completed**
```json
{
  "event": "job.completed",
  "jobId": "job_1705315800000_abc123",
  "videoUrl": "https://storage.example.com/videos/horror_1705315800000.mp4",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

**Job Failed**
```json
{
  "event": "job.failed",
  "jobId": "job_1705315800000_abc123",
  "error": "Content moderation failed",
  "timestamp": "2024-01-15T10:31:00.000Z"
}
```
