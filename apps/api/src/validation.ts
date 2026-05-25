import { z } from "zod";

const questionTypes = ["mcq", "short", "long", "case"] as const;

function jsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value.split(",").map((item) => item.trim());
  }
}

export const createAssignmentSchema = z
  .object({
    title: z.string().trim().min(3, "Title is required"),
    subject: z.string().trim().min(2, "Subject is required"),
    dueDate: z.string().trim().min(1, "Due date is required"),
    questionTypes: z.preprocess(
      jsonArray,
      z.array(z.enum(questionTypes)).min(1, "Pick at least one question type"),
    ),
    questionCount: z.coerce.number().int().min(1).max(60),
    marksPerQuestion: z.coerce.number().int().min(1).max(20),
    durationMinutes: z.coerce.number().int().min(10).max(300),
    easy: z.coerce.number().int().min(0).max(100).default(40),
    medium: z.coerce.number().int().min(0).max(100).default(40),
    hard: z.coerce.number().int().min(0).max(100).default(20),
    instructions: z.string().trim().max(2000).optional(),
    sourceText: z.string().trim().max(8000).optional(),
  })
  .refine((data) => data.easy + data.medium + data.hard === 100, {
    message: "Difficulty mix must total 100",
    path: ["difficultyMix"],
  })
  .transform(({ easy, medium, hard, ...rest }) => ({
    ...rest,
    difficultyMix: { easy, medium, hard },
  }));

export const questionPaperSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  totalMarks: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        instruction: z.string().min(1),
        questions: z
          .array(
            z.object({
              id: z.string().min(1),
              text: z.string().min(5),
              difficulty: z.enum(["easy", "medium", "hard"]),
              marks: z.number().int().positive(),
              type: z.enum(questionTypes),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});
