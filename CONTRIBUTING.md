# Contributing

## Prerequisites
- Node.js 20+
- ffmpeg & ffprobe on `PATH`
- Optional: Redis/S3 when swapping providers

## Setup
```bash
cd backend
npm install
cd ..
cd web
npm install
```

## Development
```bash
# Backend
npm run dev --prefix backend

# Frontend
npm run dev --prefix web
```

## Quality gates
```bash
# Backend
npm run lint --prefix backend
npm run test --prefix backend
npm run build --prefix backend

# Frontend
npm run lint --prefix web
npm run test --prefix web
npm run test:e2e --prefix web  # starts dev server + Playwright (mocked API routes)
```

## Security & a11y checks
- Run `npm run lint` for static analysis (includes React hooks + testing-library rules).
- Component a11y smoke tests use `jest-axe` in `web` unit tests.
- Before releasing, scan dependencies with `npm audit --audit-level=moderate` in both `backend` and `web`.
