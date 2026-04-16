# Boxmag Backend (Node.js + TypeScript)

## Run locally

1. Copy env file:

```bash
cp .env.example .env
```

2. Start dev server:

```bash
npm run dev
```

Backend default URL: `http://localhost:4000`

## Scripts

- `npm run dev` - run in watch mode
- `npm run build` - compile TypeScript to `dist/`
- `npm run start` - start compiled server
- `npm run check` - TypeScript type-check

## Endpoints

- `GET /` basic service info
- `GET /api/health` health payload + db config preview
