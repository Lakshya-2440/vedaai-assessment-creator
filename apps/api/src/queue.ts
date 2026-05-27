import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import type { Server as SocketServer } from "socket.io";
import { config } from "./config.js";
import { AssignmentModel } from "./models.js";
import type { AssignmentRequest } from "./types.js";
import { generateQuestionPaper } from "./ai.js";

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const generationQueue = new Queue<AssignmentRequest>("question-generation", {
  connection: redis as unknown as any,
});

export async function enqueueGeneration(assignmentId: string, request: AssignmentRequest) {
  return generationQueue.add(
    "generate-paper" as any,
    request,
    {
      jobId: `${assignmentId}-${Date.now()}`,
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );
}

function emitProgress(io: SocketServer, assignmentId: string, progress: number, message: string) {
  io.to(assignmentId).emit("assignment:progress", { assignmentId, progress, message });
}

export function startGenerationWorker(io: SocketServer) {
  const worker = new Worker<AssignmentRequest>(
    "question-generation",
    async (job: Job<AssignmentRequest>) => {
      const assignmentId = String(job.id).split('-')[0];
      await AssignmentModel.findByIdAndUpdate(assignmentId, {
        status: "generating",
        progress: 15,
        error: undefined,
      });
      emitProgress(io, assignmentId, 15, "Building structured prompt");
      await job.updateProgress(15);

      emitProgress(io, assignmentId, 45, "Generating paper with Hugging Face");
      await job.updateProgress(45);
      const paper = await generateQuestionPaper(job.data);

      emitProgress(io, assignmentId, 80, "Saving result");
      await job.updateProgress(80);
      const updated = await AssignmentModel.findByIdAndUpdate(
        assignmentId,
        { paper, status: "completed", progress: 100, error: undefined },
        { new: true },
      );
      await redis.set(`assignment:${assignmentId}:paper`, JSON.stringify(paper), "EX", 60 * 30);

      io.to(assignmentId).emit("assignment:complete", {
        assignmentId,
        progress: 100,
        assignment: updated?.toJSON(),
      });
      return paper;
    },
    { connection: redis as unknown as any },
  );

  worker.on("failed", async (job, error) => {
    const assignmentId = String(job?.id).split('-')[0];
    await AssignmentModel.findByIdAndUpdate(assignmentId, {
      status: "failed",
      progress: 100,
      error: error.message,
    });
    io.to(assignmentId).emit("assignment:error", { assignmentId, message: error.message });
  });

  return worker;
}
