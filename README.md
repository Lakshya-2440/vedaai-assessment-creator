# VedaAI Assessment Creator

Full-stack internship assignment implementation for AI question paper generation.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, Zustand, Socket.IO client
- Backend: Node.js, Express, TypeScript
- Database: MongoDB
- Queue/cache: Redis, BullMQ
- Realtime: Socket.IO websocket events
- AI: Hugging Face Inference API with structured prompt and JSON validation
- Bonus: PDF export, regenerate action, difficulty badges

## Architecture

1. Teacher fills assignment form in Next.js.
2. Frontend validates required fields and sends multipart request to Express.
3. Express validates with Zod, stores assignment in MongoDB, and adds BullMQ job.
4. Worker builds structured prompt, calls Hugging Face, parses JSON, validates question paper shape.
5. Result is stored in MongoDB, cached in Redis, and pushed over websocket.
6. Output page renders exam-paper layout with student info lines, sections, marks, and difficulty tags.
7. PDF endpoint renders clean PDF with PDFKit.

If `HF_TOKEN` is missing, backend uses a structured fallback generator so local demo still works. With token, generation uses Hugging Face first.

## Run Locally

```bash
npm install
npm --prefix apps/api install
npm --prefix apps/web install
npm run services
npm run dev
```

Open:

- Frontend: http://localhost:3000
- API health: http://localhost:4000/health

## Environment

Copy examples:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Put your Hugging Face token here:

```bash
apps/api/.env
HF_TOKEN=hf_your_real_token_here
```

Useful env vars:

```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/vedaai
REDIS_URL=redis://localhost:6379
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.3
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

## Scripts

```bash
npm run dev          # API + web
npm run build        # TypeScript API + Next production build
npm run lint         # API typecheck + web ESLint
npm run services     # MongoDB + Redis with Docker Compose
npm run services:down
```

## API

- `POST /api/assignments` create assignment and enqueue generation
- `GET /api/assignments/:id` fetch assignment/result
- `GET /api/assignments/:id/result` fetch cached paper result
- `POST /api/assignments/:id/regenerate` enqueue new generation
- `GET /api/assignments/:id/pdf` download formatted PDF
- `GET /health` health check

## Deploy Notes

Deploy frontend on Vercel/Netlify and backend on Render/Railway/Fly. Use managed MongoDB Atlas and managed Redis in production. Set:

- Web: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
- API: `CLIENT_ORIGIN`, `MONGODB_URI`, `REDIS_URL`, `HF_TOKEN`, `HF_MODEL`
