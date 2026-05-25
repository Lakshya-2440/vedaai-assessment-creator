"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, FileText, Loader2, Send, SlidersHorizontal, UploadCloud } from "lucide-react";
import { createAssignment } from "@/lib/api";
import type { QuestionType } from "@/lib/types";
import { useAssignmentStore } from "@/store/assignment-store";

const questionTypes: { label: string; value: QuestionType }[] = [
  { label: "MCQ", value: "mcq" },
  { label: "Short", value: "short" },
  { label: "Long", value: "long" },
  { label: "Case", value: "case" },
];

export default function Home() {
  const router = useRouter();
  const { form, setField, toggleType, toFormData, setActiveAssignment } = useAssignmentStore();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const totalMarks = useMemo(() => form.questionCount * form.marksPerQuestion, [form.questionCount, form.marksPerQuestion]);
  const difficultyTotal = form.easy + form.medium + form.hard;

  async function submit() {
    setError("");
    if (!form.title.trim() || !form.subject.trim() || !form.dueDate) {
      setError("Title, subject, and due date required.");
      return;
    }
    if (form.questionTypes.length === 0) {
      setError("Pick at least one question type.");
      return;
    }
    if (form.questionCount < 1 || form.marksPerQuestion < 1 || form.durationMinutes < 10) {
      setError("Counts, marks, and duration must be positive.");
      return;
    }
    if (difficultyTotal !== 100) {
      setError("Difficulty mix must total 100%.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createAssignment(toFormData());
      setActiveAssignment(response.assignment);
      router.push(`/assignments/${response.assignment._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create assignment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">VedaAI</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-5xl">Assessment Creator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">
              Build teacher-ready question papers with structured AI generation, live queue status, and exportable exam layout.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Questions" value={form.questionCount} />
            <Metric label="Marks" value={totalMarks} />
            <Metric label="Minutes" value={form.durationMinutes} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm md:p-7">
          <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
            <FileText className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <h2 className="text-xl font-semibold">Assignment Setup</h2>
              <p className="text-sm text-[var(--muted)]">Validation runs before job enters queue.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Title">
              <input className="input" value={form.title} onChange={(event) => setField("title", event.target.value)} />
            </Field>
            <Field label="Subject">
              <input className="input" value={form.subject} onChange={(event) => setField("subject", event.target.value)} />
            </Field>
            <Field label="Due Date">
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--muted)]" />
                <input
                  className="input pl-10"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setField("dueDate", event.target.value)}
                />
              </div>
            </Field>
            <Field label="Upload Source (PDF/TXT)">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-dashed border-[var(--line)] bg-white px-3 text-sm text-[var(--muted)]">
                <UploadCloud className="h-4 w-4" />
                <span className="truncate">{form.file?.name ?? "Choose optional file"}</span>
                <input
                  className="sr-only"
                  type="file"
                  accept=".pdf,.txt,text/plain,application/pdf"
                  onChange={(event) => setField("file", event.target.files?.[0] ?? null)}
                />
              </label>
            </Field>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <NumberField label="Questions" value={form.questionCount} min={1} max={60} onChange={(value) => setField("questionCount", value)} />
            <NumberField label="Marks Each" value={form.marksPerQuestion} min={1} max={20} onChange={(value) => setField("marksPerQuestion", value)} />
            <NumberField label="Duration (min)" value={form.durationMinutes} min={10} max={300} onChange={(value) => setField("durationMinutes", value)} />
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium">Question Types</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {questionTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleType(type.value)}
                  className={`h-11 rounded-md border text-sm font-medium transition ${
                    form.questionTypes.includes(type.value)
                      ? "border-[var(--accent)] bg-blue-50 text-[var(--accent-dark)]"
                      : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)]"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <RangeField label="Easy" value={form.easy} onChange={(value) => setField("easy", value)} tone="green" />
            <RangeField label="Moderate" value={form.medium} onChange={(value) => setField("medium", value)} tone="amber" />
            <RangeField label="Hard" value={form.hard} onChange={(value) => setField("hard", value)} tone="red" />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Additional Instructions">
              <textarea
                className="input min-h-32 resize-y"
                value={form.instructions}
                onChange={(event) => setField("instructions", event.target.value)}
              />
            </Field>
            <Field label="Paste Source Text">
              <textarea
                className="input min-h-32 resize-y"
                value={form.sourceText}
                onChange={(event) => setField("sourceText", event.target.value)}
                placeholder="Optional chapter notes, learning objectives, or syllabus excerpt"
              />
            </Field>
          </div>

          {error ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm ${difficultyTotal === 100 ? "text-[var(--muted)]" : "text-red-700"}`}>
              Difficulty total: {difficultyTotal}%
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-dark)]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Generate Paper
            </button>
          </div>
        </section>

        <aside className="rounded-lg border border-[var(--line)] bg-[#172026] p-5 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-blue-300" />
            <h2 className="text-lg font-semibold">Generation Flow</h2>
          </div>
          <ol className="mt-6 space-y-4 text-sm text-slate-200">
            <FlowStep title="API request" body="Validated assignment payload plus optional source file reaches Express." />
            <FlowStep title="BullMQ job" body="Redis tracks job state while worker performs AI generation in background." />
            <FlowStep title="HF inference" body="Prompt asks for JSON only; backend parses and validates structured paper." />
            <FlowStep title="Mongo + WebSocket" body="Result persists in MongoDB and output page updates live." />
          </ol>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <input className="input" type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}

function RangeField({ label, value, onChange, tone }: { label: string; value: number; onChange: (value: number) => void; tone: "green" | "amber" | "red" }) {
  const color = tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : "var(--red)";
  return (
    <label className="block rounded-md border border-[var(--line)] bg-white p-4">
      <span className="flex items-center justify-between text-sm font-medium">
        {label}
        <span style={{ color }}>{value}%</span>
      </span>
      <input className="mt-3 w-full accent-[var(--accent)]" type="range" min={0} max={100} step={5} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-white px-4 py-3">
      <p className="font-mono text-lg font-semibold">{value}</p>
      <p className="text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

function FlowStep({ title, body }: { title: string; body: string }) {
  return (
    <li className="border-l border-blue-300/40 pl-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 leading-6 text-slate-300">{body}</p>
    </li>
  );
}
