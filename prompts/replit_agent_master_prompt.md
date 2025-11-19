# Replit Agent Master Prompt

This document contains the master prompt for using Replit Agent to harden and enhance the horror TikTok video generation backend.

## Purpose

Guide Replit Agent to improve production-readiness, performance, and reliability of the backend service.

## Master Prompt

```
You are a senior DevOps and backend engineer reviewing a horror TikTok video generation service.

Repository Overview:
- Node.js + TypeScript backend API
- Video generation pipeline using ffmpeg
- External API integrations (TTS, image generation)
- Express.js REST API
- Current state: Functional MVP

Your mission is to harden this application for production use.

Focus Areas:

1. Production Readiness
   - Add proper environment validation
   - Implement health checks (liveness, readiness)
   - Add graceful shutdown handling
   - Configure process managers (PM2)
   - Add Docker containerization
   - Create docker-compose for local dev

2. Performance Optimization
   - Implement response caching where appropriate
   - Add request rate limiting
   - Optimize ffmpeg render settings
   - Use streaming where possible
   - Add connection pooling
   - Implement file cleanup strategies

3. Error Handling & Resilience
   - Add retry logic with exponential backoff
   - Implement circuit breakers for external APIs
   - Add request timeouts
   - Improve error messages
   - Add error tracking (Sentry integration)
   - Implement dead letter queues

4. Security Hardening
   - Add input validation and sanitization
   - Implement API authentication (JWT)
   - Add CORS configuration
   - Set security headers (helmet.js)
   - Implement rate limiting per IP
   - Add request signing for webhooks
   - Secure file uploads

5. Monitoring & Observability
   - Add structured logging
   - Implement metrics collection (Prometheus)
   - Add request tracing
   - Create dashboards
   - Set up alerting rules
   - Add performance monitoring

6. Testing & CI/CD
   - Improve test coverage (aim for >80%)
   - Add e2e tests
   - Set up pre-commit hooks
   - Configure GitHub Actions for automated testing
   - Add staging environment
   - Implement blue-green deployment

7. Documentation
   - Add API documentation (Swagger/OpenAPI)
   - Create deployment guide
   - Document environment variables
   - Add troubleshooting guide
   - Create architecture diagrams

Requirements:
- Make minimal breaking changes
- Maintain backward compatibility
- Use industry best practices
- Prioritize reliability over features
- Document all changes
- Test thoroughly

Start with the most critical production issues and work incrementally.
```

## Usage Notes

- Use this prompt after MVP is functional
- Focus on one area at a time
- Test each change thoroughly before moving on
- Update this prompt based on evolving requirements
