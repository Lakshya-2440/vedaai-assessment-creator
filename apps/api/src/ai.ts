import { InferenceClient } from "@huggingface/inference"; // Trigger restart
import { config } from "./config.js";
import type { AssignmentRequest, Difficulty, QuestionPaper, QuestionType } from "./types.js";
import { questionPaperSchema } from "./validation.js";

const sectionNames: Record<QuestionType, string> = {
  mcq: "Section A - Objective Questions",
  short: "Section B - Short Answer Questions",
  long: "Section C - Long Answer Questions",
  case: "Section D - Case Based Questions",
  numerical: "Section E - Numerical Problems",
};

const instructions: Record<QuestionType, string> = {
  mcq: "Attempt all questions. Choose the most appropriate option.",
  short: "Attempt all questions. Answer in 30-50 words.",
  long: "Attempt all questions. Show reasoning and key steps.",
  case: "Read each scenario carefully and answer with evidence.",
  numerical: "Show all calculations clearly and specify units.",
};

function pickDifficulty(index: number, input: AssignmentRequest): Difficulty {
  const easyLimit = Math.round((input.questionCount * input.difficultyMix.easy) / 100);
  const mediumLimit = easyLimit + Math.round((input.questionCount * input.difficultyMix.medium) / 100);
  if (index < easyLimit) return "easy";
  if (index < mediumLimit) return "medium";
  return "hard";
}

export function fallbackPaper(input: AssignmentRequest): QuestionPaper {
  const sections = input.questionTypes.map((config) => ({
    id: config.type,
    title: sectionNames[config.type],
    instruction: instructions[config.type],
    questions: [] as QuestionPaper["sections"][number]["questions"],
  }));

  let globalIndex = 0;
  for (const config of input.questionTypes) {
    const section = sections.find((s) => s.id === config.type)!;
    for (let i = 0; i < config.count; i++) {
      const localNumber = i + 1;
      const sourceHint = input.sourceText
        ? "Use concepts from the uploaded study material."
        : `Focus on ${input.subject} fundamentals.`;

      section.questions.push({
        id: `${config.type}-${localNumber}`,
        text: `${sourceHint} ${questionStem(config.type, input.subject, localNumber)}`,
        difficulty: pickDifficulty(globalIndex, input),
        marks: config.marks,
        type: config.type,
        options: config.type === "mcq" ? ["Option A", "Option B", "Option C", "Option D"] : undefined,
        answer: config.type === "mcq" ? "Option A" : "Detailed solution or key points for this question.",
      });
      globalIndex++;
    }
  }

  return {
    title: input.title,
    subject: input.subject,
    totalMarks: input.questionTypes.reduce((acc, t) => acc + t.count * t.marks, 0),
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
  if (type === "numerical") {
    return `Create numerical problem ${n} related to ${subject} and provide the step-by-step solution.`;
  }
  return `Given a classroom case on ${subject}, identify problem, reasoning, and final answer for scenario ${n}.`;
}

function promptFor(input: AssignmentRequest) {
  const allowedTypes = input.questionTypes.map((t) => `"${t.type}"`).join(" | ");
  const breakdown = input.questionTypes.map((t) => `- ${t.count} questions of type "${t.type}" (worth ${t.marks} marks each)`).join("\n");
  
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
          "type": ${allowedTypes},
          "options": ["string", "string", "string", "string"], // REQUIRED ONLY FOR MCQ, omit for others
          "answer": "string" // REQUIRED FOR ALL QUESTIONS. Provide the correct answer or key points.
        }
      ]
    }
  ]
}

Teacher request:
Title: ${input.title}
Subject: ${input.subject}
Due date: ${input.dueDate}
Question Breakdown:
${breakdown}
Duration minutes: ${input.durationMinutes}
Difficulty mix: easy ${input.difficultyMix.easy}%, medium ${input.difficultyMix.medium}%, hard ${input.difficultyMix.hard}%
Additional instructions: ${input.instructions || "None"}
Source material: ${input.sourceText || "No source material uploaded. Use subject knowledge."}

Rules:
- Make exactly ${input.questionCount} questions total, strictly following the breakdown above.
- Group questions by type into Section A, Section B, etc.
- Every question must include difficulty and marks as requested.
- MCQ question text must include options A-D and answer key.
- EVERY question MUST have an "answer" field providing the correct answer, solution, or key points.
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
    const paper = questionPaperSchema.parse(parsed);
    return enforceCounts(paper, input);
  } catch (error) {
    console.error("HF generation failed; using structured fallback", error);
    return fallbackPaper(input);
  }
}

function enforceCounts(paper: QuestionPaper, input: AssignmentRequest): QuestionPaper {
  const fallback = fallbackPaper(input);
  const sections = input.questionTypes.map((config) => {
    const generatedSection = paper.sections.find((section) =>
      section.questions.some((question) => question.type === config.type),
    );
    const generatedQuestions = paper.sections.flatMap((section) => section.questions).filter((question) => question.type === config.type);
    let questions = generatedQuestions;

    if (questions.length > config.count) {
      questions = questions.slice(0, config.count);
    } else if (questions.length < config.count) {
      const fallbackSection = fallback.sections.find((s) => s.id === config.type);
      const needed = config.count - questions.length;
      if (fallbackSection) {
        questions.push(...fallbackSection.questions.slice(0, needed));
      }
    }

    questions = questions.map((question) => ({
      ...question,
      marks: config.marks,
      type: config.type,
    }));

    return {
      id: config.type,
      title:
        generatedSection?.title ||
        fallback.sections.find((s) => s.id === config.type)?.title ||
        "",
      instruction:
        generatedSection?.instruction ||
        fallback.sections.find((s) => s.id === config.type)?.instruction ||
        "",
      questions,
    };
  });

  return {
    ...paper,
    totalMarks: input.questionTypes.reduce((acc, t) => acc + t.count * t.marks, 0),
    sections: sections.filter(s => s.questions.length > 0),
  };
}
