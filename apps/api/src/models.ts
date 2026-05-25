import mongoose, { Schema } from "mongoose";
import type { AssignmentRecord } from "./types.js";

const QuestionSchema = new Schema(
  {
    id: String,
    text: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    marks: { type: Number, required: true },
    type: { type: String, enum: ["mcq", "short", "long", "case"], required: true },
  },
  { _id: false },
);

const SectionSchema = new Schema(
  {
    id: String,
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    questions: [QuestionSchema],
  },
  { _id: false },
);

const PaperSchema = new Schema(
  {
    title: String,
    subject: String,
    totalMarks: Number,
    durationMinutes: Number,
    sections: [SectionSchema],
  },
  { _id: false },
);

const AssignmentSchema = new Schema<AssignmentRecord>(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    dueDate: { type: String, required: true },
    questionTypes: [{ type: String, enum: ["mcq", "short", "long", "case"], required: true }],
    questionCount: { type: Number, required: true },
    marksPerQuestion: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    difficultyMix: {
      easy: { type: Number, required: true },
      medium: { type: Number, required: true },
      hard: { type: Number, required: true },
    },
    instructions: String,
    sourceText: String,
    status: {
      type: String,
      enum: ["queued", "generating", "completed", "failed"],
      default: "queued",
      index: true,
    },
    progress: { type: Number, default: 0 },
    error: String,
    paper: PaperSchema,
  },
  { timestamps: true },
);

AssignmentSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret._id = ret._id.toString();
    return ret;
  },
});

export const AssignmentModel =
  mongoose.models.Assignment ?? mongoose.model<AssignmentRecord>("Assignment", AssignmentSchema);
