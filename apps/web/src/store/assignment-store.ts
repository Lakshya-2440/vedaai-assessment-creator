"use client";

import { create } from "zustand";
import type { Assignment, QuestionType, QuestionTypeConfig } from "@/lib/types";

type FormState = {
  title: string;
  subject: string;
  dueDate: string;
  questionTypes: QuestionTypeConfig[];
  questionCount: number;
  marksPerQuestion: number;
  durationMinutes: number;
  easy: number;
  medium: number;
  hard: number;
  instructions: string;
  sourceText: string;
  file: File | null;
};

type Store = {
  form: FormState;
  activeAssignment: Assignment | null;
  assignments: Assignment[];
  addAssignment: (assignment: Assignment) => void;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleType: (type: QuestionType) => void;
  setActiveAssignment: (assignment: Assignment | null) => void;
  toFormData: () => FormData;
};

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 7);

const defaultForm: FormState = {
  title: "Grade 8 Science Assessment",
  subject: "Science",
  dueDate: tomorrow.toISOString().split("T")[0],
  questionTypes: [
    { type: "mcq", count: 4, marks: 1 },
    { type: "short", count: 3, marks: 2 },
    { type: "long", count: 2, marks: 5 },
    { type: "case", count: 1, marks: 4 },
    { type: "numerical", count: 1, marks: 5 },
  ],
  questionCount: 11,
  marksPerQuestion: 3,
  durationMinutes: 60,
  easy: 40,
  medium: 40,
  hard: 20,
  instructions: "Include application-based questions and avoid repeated concepts.",
  sourceText: "",
  file: null,
};

export const useAssignmentStore = create<Store>((set, get) => ({
  form: defaultForm,
  activeAssignment: null,
  assignments: [],
  addAssignment: (assignment) => set((state) => ({ assignments: [...state.assignments, assignment] })),
  setField: (key, value) =>
    set((state) => ({
      form: { ...state.form, [key]: value },
    })),
  toggleType: (type) =>
    set((state) => {
      const exists = state.form.questionTypes.some((item) => item.type === type);
      const next = exists
        ? state.form.questionTypes.filter((item) => item.type !== type)
        : [...state.form.questionTypes, { type, count: 1, marks: 1 }];
      return {
        form: {
          ...state.form,
          questionTypes: next,
        },
      };
    }),
  setActiveAssignment: (assignment) => set({ activeAssignment: assignment }),
  toFormData: () => {
    const { form } = get();
    const data = new FormData();
    data.set("title", form.title);
    data.set("subject", form.subject);
    data.set("dueDate", form.dueDate);
    data.set(
      "questionTypes",
      JSON.stringify(
        form.questionTypes.map((item) => ({
          type: item.type,
          numQuestions: item.count,
          marks: item.marks,
        }))
      )
    );
    data.set("questionCount", String(form.questionCount));
    data.set("marksPerQuestion", String(form.marksPerQuestion));
    data.set("durationMinutes", String(form.durationMinutes));
    data.set("easy", String(form.easy));
    data.set("medium", String(form.medium));
    data.set("hard", String(form.hard));
    data.set("instructions", form.instructions);
    data.set("sourceText", form.sourceText);
    if (form.file) data.set("file", form.file);
    return data;
  },
}));
