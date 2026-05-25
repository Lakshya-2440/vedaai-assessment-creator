"use client";

import { create } from "zustand";
import type { Assignment, QuestionType } from "@/lib/types";

type FormState = {
  title: string;
  subject: string;
  dueDate: string;
  questionTypes: QuestionType[];
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
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleType: (type: QuestionType) => void;
  setActiveAssignment: (assignment: Assignment | null) => void;
  toFormData: () => FormData;
};

const defaultForm: FormState = {
  title: "Grade 8 Science Assessment",
  subject: "Science",
  dueDate: "",
  questionTypes: ["mcq", "short", "long"],
  questionCount: 12,
  marksPerQuestion: 2,
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
  setField: (key, value) =>
    set((state) => ({
      form: { ...state.form, [key]: value },
    })),
  toggleType: (type) =>
    set((state) => {
      const exists = state.form.questionTypes.includes(type);
      const next = exists
        ? state.form.questionTypes.filter((item) => item !== type)
        : [...state.form.questionTypes, type];
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
    data.set("questionTypes", JSON.stringify(form.questionTypes));
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
