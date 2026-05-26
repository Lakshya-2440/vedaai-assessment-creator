"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Loader2, RefreshCcw } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { getAssignment, getAssignmentResult, pdfUrl, regenerateAssignment, WS_URL } from "@/lib/api";
import type { Assignment, Difficulty, QuestionPaper } from "@/lib/types";
import { useAssignmentStore } from "@/store/assignment-store";

const difficultyLabels: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Moderate",
  hard: "Challenging",
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

      let attempts = 0;
      const maxAttempts = 12;
      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const result = await getAssignmentResult(id);
        if (result?.paper) {
          const refreshedAssignment = {
            ...(assignment ?? response.assignment),
            paper: result.paper,
            status: "completed" as const,
            progress: 100,
          };
          setAssignment(refreshedAssignment);
          setActiveAssignment(refreshedAssignment);
          setMessage("Paper ready");
          break;
        }
        attempts += 1;
      }

      if (attempts === maxAttempts) {
        setError("Could not retrieve regenerated paper. Please try again.");
      }
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
      <div className="sticky top-0 z-10 px-5 pt-4">
        <div className="mx-auto max-w-7xl rounded-[28px] bg-[#232323] px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] md:px-8 md:py-7">
          <div className="flex flex-col gap-5 text-white md:flex-row md:items-end md:justify-between md:gap-8">
            <div className="max-w-4xl">
              <h1 className="mt-2 text-lg font-semibold leading-snug md:text-2xl">
                {assignment?.subject
                  ? `Certainly, Lakshya! Here are customized Question Paper for your CBSE Grade 8 ${assignment.subject} classes on the NCERT chapters:`
                  : "Certainly, Lakshya! Here are customized Question Paper for your CBSE Grade 8 Science classes on the NCERT chapters:"}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <button
                type="button"
                onClick={regenerate}
                disabled={regenerating || !assignment}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:pointer-events-none disabled:opacity-60"
              >
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Regenerate
              </button>
              <a
                href={paper ? pdfUrl(id) : undefined}
                className={`inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 ${paper ? "" : "pointer-events-none opacity-60"}`}
              >
                <Download className="h-4 w-4" />
                Download as PDF
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {loading ? <Generating /> : <PaperView paper={paper} />}
      </div>
    </main>
  );
}

function PaperView({ paper }: { paper: QuestionPaper }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white px-5 py-8 shadow-sm md:px-12 md:py-12 text-slate-900">
      <header className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold md:text-3xl">Delhi Public School, Sector-4, Bokaro</h2>
        <p className="text-lg font-semibold">Subject: {paper.subject}</p>
        <p className="text-lg font-semibold">Class: 5th</p>
      </header>

      <div className="flex justify-between font-semibold mb-4 text-sm md:text-base">
        <p>Time Allowed: {paper.durationMinutes} minutes</p>
        <p>Maximum Marks: {paper.totalMarks}</p>
      </div>

      <p className="font-semibold mb-8 text-sm md:text-base">All questions are compulsory unless stated otherwise.</p>

      <div className="space-y-3 mb-10 text-sm font-semibold">
        <div className="flex items-center gap-2">
          <span>Name:</span>
          <div className="h-[1px] w-48 bg-slate-900"></div>
        </div>
        <div className="flex items-center gap-2">
          <span>Roll Number:</span>
          <div className="h-[1px] w-48 bg-slate-900"></div>
        </div>
        <div className="flex items-center gap-2">
          <span>Class: 5th Section:</span>
          <div className="h-[1px] w-32 bg-slate-900"></div>
        </div>
      </div>

      <div className="space-y-10">
        {paper.sections.map((section, sectionIndex) => {
          const parts = section.title.split(" - ");
          const sectionLabel = parts[0] || `Section ${String.fromCharCode(65 + sectionIndex)}`;
          const sectionName = parts.length > 1 ? parts.slice(1).join(" - ") : "";

          return (
            <section key={section.id}>
              <h3 className="text-xl font-bold text-center mb-6">{sectionLabel}</h3>
              
              <div className="mb-4">
                {sectionName && <h4 className="font-bold text-lg">{sectionName}</h4>}
                <p className="italic text-sm text-slate-700">{section.instruction}</p>
              </div>

              <ol className="space-y-5">
                {section.questions.map((question, index) => (
                  <li key={`${section.id}-${index}-${question.id}`} className="text-sm md:text-base flex gap-2">
                    <span className="shrink-0">{index + 1}.</span>
                    <div className="w-full">
                      <p>
                        [{difficultyLabels[question.difficulty]}] {question.text} [{question.marks} Marks]
                      </p>
                      {question.type === "mcq" && question.options?.length === 4 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pl-4">
                          {question.options.map((opt, i) => {
                            const cleaned = opt.replace(/^[A-Da-d][).:\-]\s*/, "");
                            return (
                              <div key={i} className="flex gap-2">
                                <span>{String.fromCharCode(65 + i)}.</span>
                                <span>{cleaned}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <p className="font-bold mt-10 mb-12">End of Question Paper</p>

      <div className="mt-12 border-t border-slate-300 pt-8">
        <h3 className="text-xl font-bold mb-6">Answer Key:</h3>
        <ol className="space-y-5">
          {paper.sections.flatMap(s => s.questions).map((question, index) => (
            <li key={`ans-${index}-${question.id}`} className="text-sm md:text-base flex gap-3">
              <span className="shrink-0">{index + 1}.</span>
              <p className="leading-relaxed whitespace-pre-wrap">{question.answer || "Answer not generated."}</p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
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
