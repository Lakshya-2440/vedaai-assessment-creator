# VedaAI Assessment Creator

VedaAI is a full-stack app for teachers who want to turn a quick assignment setup into a polished question paper, without spending an afternoon formatting one by hand.

It lets you create an assignment, generate a paper with AI, watch progress in real time, regenerate when needed, and download the final paper as a PDF.

## What’s inside

- Frontend: Next.js, TypeScript, Tailwind CSS, Zustand, Socket.IO client
- Backend: Node.js, Express, TypeScript
- Database: MongoDB
- Queue and cache: Redis, BullMQ
- Realtime updates: Socket.IO websocket events
- AI generation: Hugging Face Inference API with structured prompt handling and JSON validation
- Output extras: PDF export, regenerate action, difficulty badges, and a printable paper layout

## Setup

### Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop, if you want the local MongoDB and Redis services
- A Hugging Face token, if you want AI generation from the live model

### 1) Install dependencies

Run this from the repo root:

```bash
npm install
npm --prefix apps/api install
npm --prefix apps/web install
```

### 2) Create environment files

Copy the sample env files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Then fill in the API env file. A typical local setup looks like this:

```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/vedaai
REDIS_URL=redis://localhost:6379
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.3
HF_TOKEN=hf_your_real_token_here
```

And for the web app:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

If `HF_TOKEN` is missing, the backend falls back to a structured local generator, so you can still test the flow without a live model.

### 3) Start MongoDB and Redis

If you are using Docker, this is the easiest path:

```bash
npm run services
```

To stop them later:

```bash
npm run services:down
```

### 4) Run the app

Start both API and web together:

```bash
npm run dev
```

Or run them separately if you prefer:

```bash
npm run dev:api
npm run dev:web
```

Open these URLs:

- Frontend: http://localhost:3000
- API health: http://localhost:4000/health

## Scripts

Root scripts:

```bash
npm run dev          # API + web together
npm run dev:api      # API only
npm run dev:web      # Web only
npm run build        # Build web (Vercel-friendly)
npm run build:all    # Build API and web
npm run lint         # Typecheck API + lint web
npm run services     # Start MongoDB and Redis
npm run services:down
```

Web app scripts in `apps/web`:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

API scripts in `apps/api`:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## How it works

The flow is simple on purpose:

1. A teacher fills out the assignment form in the Next.js frontend.
2. The frontend validates the basic fields and sends the form data to the Express API.
3. The API stores the assignment in MongoDB and places a generation job into BullMQ.
4. A worker picks up that job, builds a structured prompt, and asks Hugging Face to generate the paper.
5. The response is validated, normalized, and stored back in MongoDB.
6. Redis is used to cache the result and keep the experience snappy.
7. Socket.IO pushes progress updates to the UI so the user does not need to refresh.
8. The output page renders the final exam paper layout and the PDF endpoint turns it into a download.

## Architecture overview

Here is the short version of the system:

- `apps/web` handles the UI, assignment creation, assignment list, and generated paper screens.
- `apps/api` handles validation, persistence, job creation, and PDF generation.
- MongoDB stores assignments and generated results.
- Redis keeps job state and cached output fast.
- BullMQ runs generation work in the background instead of blocking the request.
- Socket.IO keeps the frontend updated while generation is happening.
- Hugging Face is used for the actual question-paper generation when a token is available.

The pieces are kept fairly small on purpose. The UI only knows enough to send and render data, while the API owns the heavy lifting. That makes the app easier to reason about, easier to debug, and a lot less fragile when the generation workflow changes.

## Approach

The approach here was to keep the product practical instead of overly clever.

- Start with a clean assignment form that feels quick to use.
- Keep generation asynchronous so the UI stays responsive.
- Validate AI output before trusting it, because raw model output is rarely production-ready on the first try.
- Cache the final result so repeat reads are fast.
- Show progress live, because users should not have to guess what the backend is doing.
- Provide a PDF export path so the generated work can be used outside the app.

In other words, the goal was not just to generate text. The goal was to make the whole workflow feel dependable from the teacher’s point of view.

## API endpoints

- `POST /api/assignments` create an assignment and enqueue generation
- `GET /api/assignments/:id` fetch assignment metadata and generated result
- `GET /api/assignments/:id/result` fetch the cached generated paper
- `POST /api/assignments/:id/regenerate` request a new generation pass
- `GET /api/assignments/:id/pdf` download the formatted PDF
- `GET /health` health check

## Deployment notes

Repository:

```text
https://github.com/Lakshya-2440/vedaai-assessment-creator
```

The backend includes a Render Blueprint in `render.yaml`. It provisions the API and Redis. After deploying, add these secrets in the Render dashboard:

- `CLIENT_ORIGIN`: your deployed frontend URL
- `MONGODB_URI`: your MongoDB Atlas connection string
- `REDIS_URL`: your Redis connection string
- `HF_TOKEN`: your Hugging Face token

Render Blueprint link:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/Lakshya-2440/vedaai-assessment-creator
```

Deploy the frontend from `apps/web` on Vercel or any other Next.js host. Set:

- Web env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
- API env vars: `CLIENT_ORIGIN`, `MONGODB_URI`, `REDIS_URL`, `HF_TOKEN`, `HF_MODEL`

## Project structure

```text
apps/
	api/   # Express API, worker logic, MongoDB, Redis, PDF generation
	web/   # Next.js frontend and assignment UI
```

## A small note

This repo was built as an internship-style full-stack assignment, but the code tries to behave like a real product. That means predictable setup, clear data flow, and enough guardrails that the AI part does not become the only thing holding the app together.
