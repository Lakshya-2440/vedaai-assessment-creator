import { InferenceClient } from "@huggingface/inference";
import { config } from "./config.js";
import type { AssignmentRequest, Difficulty, QuestionPaper, QuestionType } from "./types.js";
import { questionPaperSchema } from "./validation.js";

const sectionNames: Record<QuestionType, string> = {
  mcq: "Section A - Objective Questions",
  short: "Section B - Short Answer Questions",
  long: "Section C - Long Answer Questions",
  case: "Section D - Case Based Questions",
};

const instructions: Record<QuestionType, string> = {
  mcq: "Attempt all questions. Choose the most appropriate option.",
  short: "Attempt all questions. Answer in 30-50 words.",
  long: "Attempt all questions. Show reasoning and key steps.",
  case: "Read each scenario carefully and answer with evidence.",
};

function pickDifficulty(index: number, input: AssignmentRequest): Difficulty {
  const easyLimit = Math.round((input.questionCount * input.difficultyMix.easy) / 100);
  const mediumLimit = easyLimit + Math.round((input.questionCount * input.difficultyMix.medium) / 100);
  if (index < easyLimit) return "easy";
  if (index < mediumLimit) return "medium";
  return "hard";
}

export function fallbackPaper(input: AssignmentRequest): QuestionPaper {
  const questionsByType = new Map<QuestionType, number>();
  input.questionTypes.forEach((type) => questionsByType.set(type, 0));

  const sections = input.questionTypes.map((type) => ({
    id: type,
    title: sectionNames[type],
    instruction: instructions[type],
    questions: [] as QuestionPaper["sections"][number]["questions"],
  }));

  for (let index = 0; index < input.questionCount; index += 1) {
    const type = input.questionTypes[index % input.questionTypes.length];
    const section = sections.find((item) => item.id === type)!;
    const localNumber = (questionsByType.get(type) ?? 0) + 1;
    questionsByType.set(type, localNumber);
    const sourceHint = input.sourceText
      ? "Use concepts from the uploaded study material."
      : `Focus on ${input.subject} fundamentals.`;

    section.questions.push({
      id: `${type}-${localNumber}`,
      text: `${sourceHint} ${questionStem(type, input.subject, localNumber)}`,
      difficulty: pickDifficulty(index, input),
      marks: input.marksPerQuestion,
      type,
    });
  }

  return {
    title: input.title,
    subject: input.subject,
    totalMarks: input.questionCount * input.marksPerQuestion,
    durationMinutes: input.durationMinutes,
    sections: sections.filter((section) => section.questions.length > 0),
  };
}

function questionStem(type: QuestionType, subject: string, n: number) {
  if (type === "mcq") {
    return `Create MCQ ${n} with four plausible options and mark correct answer for ${subject}.`;
  }
  if (type === "short") {
    return `Explain concept ${n} from ${subject} with one suitable example.`;
  }
  if (type === "long") {
    return `Analyze topic ${n} from ${subject} in detail and justify your conclusion.`;
  }
  return `Given a classroom case on ${subject}, identify problem, reasoning, and final answer for scenario ${n}.`;
}

function promptFor(input: AssignmentRequest) {
  return `You are VedaAI, an exam paper generator for teachers.

Return only valid JSON. No markdown. No commentary.

JSON schema:
{
  "title": string,
  "subject": string,
  "totalMarks": number,
  "durationMinutes": number,
  "sections": [
    {
      "id": string,
      "title": string,
      "instruction": string,
      "questions": [
        {
          "id": string,
          "text": string,
          "difficulty": "easy" | "medium" | "hard",
          "marks": number,
          "type": "mcq" | "short" | "long" | "case"
        }
      ]
    }
  ]
}

Teacher request:
Title: ${input.title}
Subject: ${input.subject}
Due date: ${input.dueDate}
Question count: ${input.questionCount}
Marks per question: ${input.marksPerQuestion}
Duration minutes: ${input.durationMinutes}
Question types: ${input.questionTypes.join(", ")}
Difficulty mix: easy ${input.difficultyMix.easy}%, medium ${input.difficultyMix.medium}%, hard ${input.difficultyMix.hard}%
Additional instructions: ${input.instructions || "None"}
Source material: ${input.sourceText || "No source material uploaded. Use subject knowledge."}

Rules:
- Make exactly ${input.questionCount} questions total.
- Group questions by type into Section A, Section B, etc.
- Every question must include difficulty and marks.
- MCQ question text must include options A-D and answer key.
- No raw prose outside JSON.`;
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("HF response did not contain JSON");
  return cleaned.slice(start, end + 1);
}

export async function generateQuestionPaper(input: AssignmentRequest): Promise<QuestionPaper> {
  if (!config.hfToken || config.hfToken.includes("your_token")) {
    return fallbackPaper(input);
  }

  try {
    const client = new InferenceClient(config.hfToken);
    const response = await client.chatCompletion({
      model: config.hfModel,
      messages: [
        {
          role: "user",
          content: promptFor(input),
        },
      ],
      max_tokens: 3500,
      temperature: 0.45,
    });
    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("HF response was empty");
    const parsed = JSON.parse(extractJson(content));
    return questionPaperSchema.parse(parsed);
  } catch (error) {
    console.error("HF generation failed; using structured fallback", error);
    return fallbackPaper(input);
  }
}
