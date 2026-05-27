import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import type { Server as SocketServer } from "socket.io";
import { config } from "./config.js";
import { AssignmentModel } from "./models.js";
import type { AssignmentRequest } from "./types.js";
import { generateQuestionPaper } from "./ai.js";

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 5_000,
  commandTimeout: 5_000,
  retryStrategy: (times) => Math.min(times * 500, 5_000),
});

redis.on("error", (error) => {
  console.error("Redis connection error", error.message);
});

export const generationQueue = new Queue<AssignmentRequest>("question-generation", {
  connection: redis as unknown as any,
});

let fallbackIo: SocketServer | null = null;

export async function enqueueGeneration(assignmentId: string, request: AssignmentRequest) {
  try {
    return await withTimeout(
      generationQueue.add(
        "generate-paper" as any,
        request,
        {
          jobId: `${assignmentId}-${Date.now()}`,
          attempts: 2,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      ),
      6_000,
    );
  } catch (error) {
    console.error("Queue enqueue failed; running generation in API process", error);
    const io = fallbackIo;
    if (!io) throw error;
    void processAssignment(io, assignmentId, request).catch((generationError) =>
      markFailed(io, assignmentId, generationError),
    );
    return { id: `inline-${assignmentId}-${Date.now()}` };
  }
}

export async function cacheGet(key: string) {
  try {
    return await withTimeout(redis.get(key), 3_000);
  } catch (error) {
    console.error("Redis cache get failed", error);
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number) {
  try {
    await withTimeout(redis.set(key, value, "EX", ttlSeconds), 3_000);
  } catch (error) {
    console.error("Redis cache set failed", error);
  }
}

export async function cacheDel(key: string) {
  try {
    await withTimeout(redis.del(key), 3_000);
  } catch (error) {
    console.error("Redis cache delete failed", error);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Redis operation timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function emitProgress(io: SocketServer, assignmentId: string, progress: number, message: string) {
  io.to(assignmentId).emit("assignment:progress", { assignmentId, progress, message });
}

async function processAssignment(io: SocketServer, assignmentId: string, request: AssignmentRequest) {
  await AssignmentModel.findByIdAndUpdate(assignmentId, {
    $set: {
      status: "generating",
      progress: 15,
    },
    $unset: { error: "" },
  });
  emitProgress(io, assignmentId, 15, "Building structured prompt");

  emitProgress(io, assignmentId, 45, "Generating paper");
  const paper = await generateQuestionPaper(request);

  emitProgress(io, assignmentId, 80, "Saving result");
  const updated = await AssignmentModel.findByIdAndUpdate(
    assignmentId,
    {
      $set: { paper, status: "completed", progress: 100 },
      $unset: { error: "" },
    },
    { new: true },
  );
  await cacheSet(`assignment:${assignmentId}:paper`, JSON.stringify(paper), 60 * 30);

  io.to(assignmentId).emit("assignment:complete", {
    assignmentId,
    progress: 100,
    assignment: updated?.toJSON(),
  });
  return paper;
}

async function markFailed(io: SocketServer, assignmentId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Generation failed";
  await AssignmentModel.findByIdAndUpdate(assignmentId, {
    status: "failed",
    progress: 100,
    error: message,
  });
  io.to(assignmentId).emit("assignment:error", { assignmentId, message });
}

export function startGenerationWorker(io: SocketServer) {
  fallbackIo = io;
  const worker = new Worker<AssignmentRequest>(
    "question-generation",
    async (job: Job<AssignmentRequest>) => {
      const assignmentId = String(job.id).split('-')[0];
      await job.updateProgress(15);
      await job.updateProgress(45);
      const paper = await processAssignment(io, assignmentId, job.data);
      await job.updateProgress(80);
      return paper;
    },
    { connection: redis as unknown as any },
  );

  worker.on("failed", async (job, error) => {
    const assignmentId = String(job?.id).split('-')[0];
    await markFailed(io, assignmentId, error);
  });

  worker.on("error", (error) => {
    console.error("Generation worker error", error.message);
  });

  return worker;
}
