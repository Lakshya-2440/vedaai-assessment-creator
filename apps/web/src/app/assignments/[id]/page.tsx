"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { getAssignment, pdfUrl, regenerateAssignment, WS_URL } from "@/lib/api";
import type { Assignment, Difficulty, QuestionPaper } from "@/lib/types";
import { useAssignmentStore } from "@/store/assignment-store";

const difficultyLabels: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Moderate",
  hard: "Hard",
};

export default function AssignmentOutputPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { activeAssignment, setActiveAssignment } = useAssignmentStore();
  const [assignment, setAssignment] = useState<Assignment | null>(activeAssignment?._id === id ? activeAssignment : null);
  const [message, setMessage] = useState("Loading assignment");
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAssignment(id)
      .then(({ assignment: next }) => {
        if (cancelled) return;
        setAssignment(next);
        setActiveAssignment(next);
        setMessage(statusMessage(next.status));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load assignment.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, setActiveAssignment]);

  useEffect(() => {
    let socket: Socket | null = io(WS_URL, { transports: ["websocket", "polling"] });
    socket.emit("assignment:join", id);
    socket.on("assignment:progress", (payload: { progress: number; message: string }) => {
      setMessage(payload.message);
      setAssignment((current) => (current ? { ...current, status: "generating", progress: payload.progress } : current));
    });
    socket.on("assignment:complete", (payload: { assignment: Assignment }) => {
      setMessage("Paper ready");
      setAssignment(payload.assignment);
      setActiveAssignment(payload.assignment);
    });
    socket.on("assignment:error", (payload: { message: string }) => {
      setError(payload.message);
      setMessage("Generation failed");
    });
    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [id, setActiveAssignment]);

  async function regenerate() {
    setError("");
    setRegenerating(true);
    try {
      const response = await regenerateAssignment(id);
      setAssignment(response.assignment);
      setActiveAssignment(response.assignment);
      setMessage("Queued for regeneration");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not regenerate.");
    } finally {
      setRegenerating(false);
    }
  }

  const paper = assignment?.paper;
  const progress = assignment?.progress ?? 0;
  const loading = !paper || assignment?.status !== "completed";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
              VedaAI
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">{assignment?.title ?? "Assessment Output"}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={regenerate}
              disabled={regenerating || !assignment}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold hover:border-[var(--accent)]"
            >
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Regenerate
            </button>
            <a
              href={paper ? pdfUrl(id) : undefined}
              className={`inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] ${paper ? "" : "pointer-events-none opacity-60"}`}
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-sm font-semibold">Live Status</p>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>
          {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <dl className="mt-5 space-y-3 text-sm">
            <Info label="Status" value={assignment?.status ?? "loading"} />
            <Info label="Subject" value={assignment?.subject ?? "-"} />
            <Info label="Due" value={assignment?.dueDate ?? "-"} />
            <Info label="Questions" value={String(assignment?.questionCount ?? "-")} />
          </dl>
        </aside>

        {loading ? <Generating /> : <PaperView paper={paper} />}
      </div>
    </main>
  );
}

function PaperView({ paper }: { paper: QuestionPaper }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white px-5 py-6 shadow-sm md:px-10 md:py-9">
      <header className="border-b-2 border-slate-900 pb-5 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Question Paper</p>
        <h2 className="mt-2 text-2xl font-bold md:text-4xl">{paper.title}</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {paper.subject} | Time: {paper.durationMinutes} minutes | Max Marks: {paper.totalMarks}
        </p>
      </header>

      <section className="grid gap-4 border-b border-[var(--line)] py-6 md:grid-cols-3">
        <LineInput label="Name" />
        <LineInput label="Roll Number" />
        <LineInput label="Section" />
      </section>

      <div className="space-y-8 pt-7">
        {paper.sections.map((section, sectionIndex) => (
          <section key={section.id}>
            <div className="flex flex-col gap-2 border-b border-[var(--line)] pb-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-xl font-bold">{section.title || `Section ${sectionIndex + 1}`}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{section.instruction}</p>
              </div>
              <p className="font-mono text-xs text-[var(--muted)]">{section.questions.length} questions</p>
            </div>
            <ol className="mt-4 space-y-4">
              {section.questions.map((question, index) => (
                <li key={question.id} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 md:grid-cols-[32px_1fr_auto]">
                  <span className="font-mono text-sm font-semibold text-[var(--muted)]">{index + 1}.</span>
                  <p className="text-sm leading-7 text-slate-900 md:text-base">{question.text}</p>
                  <div className="flex items-center gap-2 md:flex-col md:items-end">
                    <DifficultyBadge difficulty={question.difficulty} />
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold">{question.marks} marks</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </article>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const className =
    difficulty === "easy"
      ? "bg-green-50 text-green-700 border-green-200"
      : difficulty === "medium"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{difficultyLabels[difficulty]}</span>;
}

function Generating() {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] p-8 text-center shadow-sm">
      <div>
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--accent)]" />
        <h2 className="mt-4 text-2xl font-semibold">Generating question paper</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
          Worker is processing prompt, parsing structured JSON, saving result, then websocket will refresh this page.
        </p>
      </div>
    </div>
  );
}

function LineInput({ label }: { label: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-5 border-b border-slate-900" />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

function statusMessage(status: string) {
  if (status === "completed") return "Paper ready";
  if (status === "failed") return "Generation failed";
  if (status === "queued") return "Waiting in queue";
  return "Generating paper";
}
