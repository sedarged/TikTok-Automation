# Horror TikTok Automation Pipeline

An automated horror story TikTok video generator powered by AI and n8n orchestration.

## Overview

This repository contains a complete pipeline for generating horror-themed TikTok videos automatically. The system combines:
- AI-generated horror stories
- Text-to-speech narration
- AI-generated visuals
- Automated video rendering with ffmpeg
- Orchestration via n8n workflows

**Current Status:** This is a scaffold/boilerplate repository. The core video generation logic will be implemented in future iterations.

## Repository Structure

```
.
├── backend/           # Node.js + TypeScript backend service
│   ├── src/          # Source code for the API and video pipeline
│   └── tests/        # Integration and unit tests
├── n8n-workflows/    # JSON exports of n8n workflow definitions
├── prompts/          # AI master prompts for various agents
├── docs/             # Architecture docs, API contracts, content safety rules
└── .github/          # CI/CD workflows
```

## Components

### Backend Service
A Node.js/TypeScript HTTP API that handles:
- Job creation and status tracking
- Story generation orchestration
- Text-to-speech processing
- Visual asset generation
- Video rendering with ffmpeg
- Content safety filtering
- Storage management

See [`backend/README.md`](backend/README.md) for details.

### n8n Workflows
Three main workflows will orchestrate the pipeline:
- **WF1**: Idea generation → script → scenes → quality control
- **WF2**: Audio generation → visual assets → video rendering
- **WF3**: Notifications → logging → cleanup

See [`n8n-workflows/README.md`](n8n-workflows/README.md) for details.

### Prompts
Master prompts for AI agents (ChatGPT, Replit Agent) that guide development and enhancement of this system.

### Documentation
Architecture diagrams, API contracts, content moderation rules, and roadmap.

## Getting Started

### Prerequisites
- Node.js 20.x or later
- npm or yarn
- ffmpeg (will be required for video rendering)

### Quick Start

1. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

## Development Status

This is currently a **scaffold repository**. The following features are planned but not yet implemented:
- [ ] Story generation with LLM integration
- [ ] Text-to-speech integration
- [ ] AI image generation integration
- [ ] Video rendering with ffmpeg
- [ ] Caption generation and overlay
- [ ] Background music integration
- [ ] Multi-language support
- [ ] Advanced visual styles

## Contributing

This is an automated pipeline project. Contributions will be accepted once the core implementation is complete.

## License

[To be determined]