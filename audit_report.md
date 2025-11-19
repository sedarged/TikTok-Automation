# Audit Report

## Executive Summary
- **Key risks:** Public APIs lack authentication/rate limiting, in-memory queue loses work on restart, and environment validation is partially bypassed in runtime config. Video pipeline depends on local ffmpeg without readiness checks beyond boot, risking silent failures. Frontend absent; operators lack visibility.
- **Top wins:** Harden request validation/auth, persist jobs to Redis/BullMQ, align runtime config with Zod validation, and ship lightweight web console for observability + job submission.
- **Effort & impact:**
  - High impact / Medium effort: add auth + rate limiting; migrate queue to durable backend.
  - Medium impact / Low effort: apply env validation, input schemas, and safer error handling.
  - Medium impact / Medium effort: observability (structured logs, metrics) and CI additions.
- **Do Now:** protect endpoints, validate inputs, wire Zod env config, and capture ffmpeg prerequisites.
- **Do Next:** durable queue + storage, content moderation enforcement, SLOs/alerts.
- **Do Later:** move to managed infra (container image, IaC) and add privacy reviews for generated assets.

## One-page: What to change and why
1. **Secure the surface**: add authn/z (tokens or signed webhooks) and rate limits to `/jobs` and `/niches` to prevent abuse and resource exhaustion. Harden request schemas to reject oversize prompts/stories.
2. **Make jobs durable**: replace in-memory queue with Redis/BullMQ and store job/output metadata in a database; current design loses all state on restart and processes only one job at a time.
3. **Validate configuration**: use `envConfig` everywhere instead of `config`, fail fast when API keys/paths are missing, and avoid defaulting secrets to empty strings.
4. **Improve resilience**: add ffmpeg/ffprobe preflight and structured error responses; provide retries/backoff for external providers.
5. **Observability & DX**: add request IDs, metrics, and CI gates (lint, tests, security scans). Publish a web console for health, niches, and job submission.
6. **Frontend plan**: ship a Vite+React console (in `/web`) with route guard, React Query data layer, and mocked Playwright test to demonstrate API usage and guardrails.

## Findings

| ID | Severity | Impact | Likelihood | Effort | Evidence | Recommended change |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | **S1** | Public unauthenticated APIs allow arbitrary job creation and info access; no rate limiting. | High | 2 | `backend/src/index.ts` enables CORS + routes without auth or throttling.【F:backend/src/index.ts†L14-L51】 | Add auth middleware (token-based) and rate limiting (e.g., express-rate-limit), restrict CORS origins, and require signed requests for `/jobs`.
| F2 | **S1** | In-memory queue loses jobs on restart and processes serially; no concurrency/backpressure metrics. | Medium | 3 | Job queue keeps state in memory and only processes one at a time.【F:backend/src/services/jobQueue.ts†L17-L139】 | Swap to BullMQ/Redis with persistence, visibility into retries, and configurable concurrency; expose queue metrics.
| F3 | **S2** | Runtime config bypasses validated `envConfig`; secrets default to empty strings, risk misconfiguration. | Medium | 2 | `config.ts` reads dotenv without validation; keys default to ''.【F:backend/src/config/config.ts†L6-L53】【F:backend/src/config/config.ts†L60-L84】 | Replace usages with `envConfig`, require non-empty secrets for providers, and fail fast when missing.
| F4 | **S2** | Input validation for `/jobs` minimal; accepts arbitrary payload sizes/types, potential crashes or long runs. | Medium | 2 | Controller only checks presence of prompt/story and niche ID.【F:backend/src/controllers/jobController.ts†L40-L85】 | Add Zod/celebrate schemas with length caps, sanitize strings, and enforce allowed `type` values.
| F5 | **S2** | Pipeline assumes ffmpeg availability and external calls succeed; failures handled only at process time. | Medium | 3 | Health route checks ffmpeg lazily; pipeline uses ffmpeg without readiness or retries.【F:backend/src/routes/healthRoutes.ts†L9-L26】【F:backend/src/services/pipelineService.ts†L86-L160】 | Add startup preflight for ffmpeg/ffprobe, wrap subprocess calls with retries/timeouts, and surface detailed status in health.
| F6 | **S3** | Logging lacks request IDs and structured error context; debugging multi-job runs is difficult. | Medium | 2 | Request logger only logs method/path; errors handled globally without correlation IDs.【F:backend/src/index.ts†L28-L51】 | Inject per-request IDs, include jobId in logs, and emit metrics for durations and failures.
| F7 | **S3** | Testing limited to Jest integration; no lint/type checks enforced in CI. | Medium | 2 | Only `npm test` script present; no CI workflow. | Add lint/type/security jobs, coverage thresholds, and frontend test runs.

## Architecture Review
- **Boundaries**: Express controllers → job queue → pipeline service orchestrating story, TTS, visuals, render, storage. No persistence layer; everything uses filesystem + in-memory maps.【F:backend/src/services/pipelineService.ts†L86-L160】【F:backend/src/services/jobQueue.ts†L17-L139】
- **Data flow**: HTTP request → enqueue job → pipeline executes sequential stages (story→TTS→images→captions→render→save) producing file paths and metadata.【F:backend/src/services/pipelineService.ts†L86-L160】
- **Coupling/cohesion**: Pipeline tightly couples to ffmpeg and specific niche profiles; config uses mix of `config` and `envConfig`. No abstraction for queue/storage providers despite config placeholders.
- **Anti-patterns**: In-memory queue, synchronous initialization, lack of retries, and empty-string secrets. Rendering blocks event loop during long ffmpeg runs (no worker threads), limiting scalability.

## Code Quality
- Deterministic story generator is isolated; good separation. However, lack of types on request body leads to `any` flow. No lint/type enforcement in CI; `config.ts` ignores validation from `env.ts`.
- Error handling centralized but only after routes; missing validation middleware and specific error codes. No concurrency or cancellation around long-running ffmpeg commands.

## Security & Privacy
- No authentication/authorization; open CORS invites cross-origin abuse.【F:backend/src/index.ts†L23-L41】
- Secrets default to empty strings; may lead to unexpected provider calls when misconfigured.【F:backend/src/config/config.ts†L60-L84】
- No request size limits or sanitization; potential resource exhaustion on `/jobs`.【F:backend/src/controllers/jobController.ts†L40-L85】
- No audit logging or PII handling guidelines; generated media could contain sensitive prompts without filtering beyond `ensureStoryIsSafe` (local only).

## Performance & Cost
- Serial queue limits throughput; ffmpeg render blocks Node event loop, preventing scaling. No caching of generated assets; repeated prompts re-render fully. No GPU/worker separation.

## Testing
- Integration test covers mocked pipeline; lacks unit coverage for controllers and error cases. No property/fuzz testing on story generator. Frontend tests absent before this change.

## DevEx
- README documents pipeline; however no CONTRIBUTING or setup automation for both backend/frontend. Env validation split between files causing confusion.

## CI/CD
- No GitHub Actions or other CI definitions; builds/tests not automated, no lint/security scans.

## Infra & Ops
- No containerization or IaC present. Storage/queue providers configurable but unimplemented; no observability (metrics/traces) or runbooks.

## Licensing & Compliance
- Package.json declares ISC; third-party notices absent. Recommend generating SBOM via `npm ls`/`pip-licenses` in CI.
