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
import { PDFParse } from "pdf-parse";

const app = express();
const server = http.createServer(app);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});
const PDF_TEXT_PARSE_LIMIT_BYTES = 10 * 1024 * 1024;

const io = new SocketServer(server, {
  cors: {
    origin: isAllowedOrigin,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: isAllowedOrigin }));
app.use(express.json({ limit: "50mb" }));

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
    const sourceText = await mergeSourceText(req.body.sourceText, req.file);
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

app.get("/api/assignments", async (_req, res, next) => {
  try {
    const assignments = await AssignmentModel.find().sort({ createdAt: -1 });
    res.json({ assignments: assignments.map((assignment) => assignment.toJSON()) });
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
    await AssignmentModel.updateOne(
      { _id: assignment._id },
      {
        $unset: { paper: "", error: "" },
        $set: { status: "queued", progress: 5 }
      }
    );
    await redis.del(`assignment:${req.params.id}:paper`);
    const request = assignment.toJSON();
    request.status = "queued";
    request.progress = 5;
    delete request.paper;
    delete request.error;
    const job = await enqueueGeneration(assignment._id.toString(), request);
    res.status(202).json({ assignment: request, jobId: job.id });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/assignments/:id", async (req, res, next) => {
  try {
    const assignment = await AssignmentModel.findByIdAndDelete(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    await redis.del(`assignment:${req.params.id}:paper`);
    res.json({ ok: true });
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
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Please upload a file smaller than 50 MB." });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(400).json({ message });
});

async function mergeSourceText(sourceText?: string, file?: Express.Multer.File) {
  const typed = sourceText?.trim();
  if (typed) return typed.slice(0, 8000);
  if (!file) return undefined;
  if (file.mimetype.includes("text") || file.originalname.endsWith(".txt")) {
    return file.buffer.toString("utf8").slice(0, 8000);
  }
  if (file.mimetype.includes("pdf") || file.originalname.endsWith(".pdf")) {
    if (file.size > PDF_TEXT_PARSE_LIMIT_BYTES) {
      return `Uploaded file: ${file.originalname}. File accepted, but it is larger than the text extraction limit. Use this as teacher-provided source context if readable.`;
    }
    try {
      const parser = new PDFParse({ data: file.buffer });
      const data = await parser.getText();
      await parser.destroy();
      return data.text.slice(0, 16000); // 16k chars limit for PDF content
    } catch (err) {
      console.error("Failed to parse PDF", err);
    }
  }
  return `Uploaded file: ${file.originalname}. Use this as teacher-provided source context if readable.`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "question-paper";
}

function isAllowedOrigin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
  if (!origin) return callback(null, true);
  const normalized = origin.replace(/\/+$/, "");
  const allowed =
    config.clientOrigins.includes(normalized) ||
    normalized.endsWith(".vercel.app") ||
    normalized === "http://localhost:3000";
  callback(allowed ? null : new Error(`Origin ${origin} not allowed by CORS`), allowed);
}

await connectMongo();
startGenerationWorker(io);

server.listen(config.port, () => {
  console.log(`VedaAI API listening on http://localhost:${config.port}`);
});
