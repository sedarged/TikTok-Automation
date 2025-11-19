# Roadmap

## Quick Wins (0–2 days)
- Enforce request validation for `/jobs` and `/niches` using Zod/celebrate with size caps.
- Add auth token + rate limiter middleware and tighten CORS origins.
- Wire `envConfig` into runtime, fail fast on missing ffmpeg/binaries, and add preflight health checks.
- Add CI workflow: lint, type-check, backend tests, frontend unit + Playwright with mocks.

## Near-Term (1–2 sprints)
- Replace in-memory queue with BullMQ/Redis; persist job/output metadata and expose job listing endpoint.
- Implement durable storage (S3/R2) and signed URLs; add content moderation calls to external provider.
- Expand web console with job history, download links, and retry/cancel actions; add role-based access.
- Observability: request IDs, metrics (Prometheus), structured logs, and alerting on queue depth/failures.

## Strategic (quarter+)
- Containerize services with IaC (Terraform/K8s), add CD with canary/rollback strategy.
- Performance: move ffmpeg workloads to worker pool or serverless transcoding; cache image/tts outputs per prompt.
- Privacy & compliance: DSR/retention policies for prompts and generated assets; SBOM + license checks in CI.
