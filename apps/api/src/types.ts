export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "mcq" | "short" | "long" | "case";
export type AssignmentStatus = "queued" | "generating" | "completed" | "failed";

export type Question = {
  id: string;
  text: string;
  difficulty: Difficulty;
  marks: number;
  type: QuestionType;
};

export type QuestionSection = {
  id: string;
  title: string;
  instruction: string;
  questions: Question[];
};

export type QuestionPaper = {
  title: string;
  subject: string;
  totalMarks: number;
  durationMinutes: number;
  sections: QuestionSection[];
};

export type AssignmentRequest = {
  title: string;
  subject: string;
  dueDate: string;
  questionTypes: QuestionType[];
  questionCount: number;
  marksPerQuestion: number;
  durationMinutes: number;
  difficultyMix: {
    easy: number;
    medium: number;
    hard: number;
  };
  instructions?: string;
  sourceText?: string;
};

export type AssignmentRecord = AssignmentRequest & {
  _id: string;
  status: AssignmentStatus;
  progress: number;
  error?: string;
  paper?: QuestionPaper;
  createdAt: string;
  updatedAt: string;
};
