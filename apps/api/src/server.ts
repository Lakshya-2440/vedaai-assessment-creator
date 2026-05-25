import cors from "cors";
import express from "express";
import http from "node:http";
import multer from "multer";
import { Server as SocketServer } from "socket.io";
import { config } from "./config.js";
import { connectMongo } from "./db.js";
import { AssignmentModel } from "./models.js";
import { enqueueGeneration, redis, startGenerationWorker } from "./queue.js";
import { createPaperPdf } from "./pdf.js";
import { createAssignmentSchema } from "./validation.js";

const app = express();
const server = http.createServer(app);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const io = new SocketServer(server, {
  cors: {
    origin: config.clientOrigin,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: "2mb" }));

io.on("connection", (socket) => {
  socket.on("assignment:join", (assignmentId: string) => {
    socket.join(assignmentId);
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "vedaai-api" });
});

app.post("/api/assignments", upload.single("file"), async (req, res, next) => {
  try {
    const sourceText = mergeSourceText(req.body.sourceText, req.file);
    const parsed = createAssignmentSchema.parse({ ...req.body, sourceText });
    const assignment = await AssignmentModel.create({
      ...parsed,
      status: "queued",
      progress: 5,
    });
    const job = await enqueueGeneration(assignment._id.toString(), parsed);

    res.status(202).json({
      assignment: assignment.toJSON(),
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/assignments/:id", async (req, res, next) => {
  try {
    const assignment = await AssignmentModel.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json({ assignment: assignment.toJSON() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/assignments/:id/result", async (req, res, next) => {
  try {
    const cached = await redis.get(`assignment:${req.params.id}:paper`);
    if (cached) return res.json({ paper: JSON.parse(cached), cached: true });

    const assignment = await AssignmentModel.findById(req.params.id);
    if (!assignment?.paper) return res.status(404).json({ message: "Result not ready" });
    await redis.set(`assignment:${req.params.id}:paper`, JSON.stringify(assignment.paper), "EX", 60 * 30);
    res.json({ paper: assignment.paper, cached: false });
  } catch (error) {
    next(error);
  }
});

app.post("/api/assignments/:id/regenerate", async (req, res, next) => {
  try {
    const assignment = await AssignmentModel.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    assignment.status = "queued";
    assignment.progress = 5;
    assignment.error = undefined;
    await assignment.save();
    const request = assignment.toJSON();
    const job = await enqueueGeneration(assignment._id.toString(), request);
    res.status(202).json({ assignment: assignment.toJSON(), jobId: job.id });
  } catch (error) {
    next(error);
  }
});

app.get("/api/assignments/:id/pdf", async (req, res, next) => {
  try {
    const assignment = await AssignmentModel.findById(req.params.id);
    if (!assignment?.paper) return res.status(404).json({ message: "Result not ready" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${slug(assignment.title)}.pdf"`);
    createPaperPdf(assignment.paper).pipe(res);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(400).json({ message });
});

function mergeSourceText(sourceText?: string, file?: Express.Multer.File) {
  const typed = sourceText?.trim();
  if (typed) return typed.slice(0, 8000);
  if (!file) return undefined;
  if (file.mimetype.includes("text") || file.originalname.endsWith(".txt")) {
    return file.buffer.toString("utf8").slice(0, 8000);
  }
  return `Uploaded file: ${file.originalname}. Use this as teacher-provided source context if readable.`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "question-paper";
}

await connectMongo();
startGenerationWorker(io);

server.listen(config.port, () => {
  console.log(`VedaAI API listening on http://localhost:${config.port}`);
});
