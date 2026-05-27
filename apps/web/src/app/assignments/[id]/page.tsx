"use client";

import { useEffect, useState } from "react";
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
    let cancelled = false;
    const refresh = () => {
      getAssignment(id)
        .then(({ assignment: next }) => {
          if (cancelled) return;
          setAssignment(next);
          setActiveAssignment(next);
          setMessage(statusMessage(next.status));
          if (next.status === "failed" && next.error) setError(next.error);
          if (next.status !== "failed") setError("");
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Could not refresh assignment.");
        });
    };
    const interval = setInterval(refresh, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, setActiveAssignment]);

  useEffect(() => {
    if (!/^https?:\/\//.test(WS_URL)) return;

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
    socket.on("connect_error", () => {
      setMessage("Realtime connection unavailable. Polling for updates.");
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
  const failed = assignment?.status === "failed";
  const loading = !paper || assignment?.status !== "completed";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="sticky top-0 z-10 px-4 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto max-w-7xl rounded-[28px] bg-[#232323] px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:px-6 sm:py-6 md:px-8 md:py-7">
          <div className="flex flex-col gap-4 text-white md:flex-row md:items-end md:justify-between md:gap-8">
            <div className="max-w-4xl">
              <h1 className="mt-1 text-lg font-semibold leading-snug sm:mt-2 md:text-2xl">
                {assignment?.subject
                  ? `Certainly, Lakshya! Here are customized Question Paper for your CBSE Grade 8 ${assignment.subject} classes on the NCERT chapters:`
                  : "Certainly, Lakshya! Here are customized Question Paper for your CBSE Grade 8 Science classes on the NCERT chapters:"}
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
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

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 sm:py-6">
        {failed ? (
          <StatusPanel
            title="Generation failed"
            message={error || assignment?.error || "Could not generate this paper. Try regenerate."}
            progress={progress}
            failed
          />
        ) : loading ? (
          <StatusPanel title="Generating question paper" message={message} progress={progress} />
        ) : (
          <PaperView paper={paper} />
        )}
      </div>
    </main>
  );
}

function PaperView({ paper }: { paper: QuestionPaper }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white px-4 py-7 text-slate-900 shadow-sm sm:px-5 md:px-12 md:py-12">
      <header className="mb-8 space-y-2 text-center">
        <h2 className="text-xl font-bold sm:text-2xl md:text-3xl">Delhi Public School, Sector-4, Bokaro</h2>
        <p className="text-base font-semibold sm:text-lg">Subject: {paper.subject}</p>
        <p className="text-base font-semibold sm:text-lg">Class: 5th</p>
      </header>

      <div className="mb-4 flex flex-col gap-2 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between md:text-base">
        <p>Time Allowed: {paper.durationMinutes} minutes</p>
        <p>Maximum Marks: {paper.totalMarks}</p>
      </div>

      <p className="mb-8 text-sm font-semibold md:text-base">All questions are compulsory unless stated otherwise.</p>

      <div className="mb-10 space-y-3 text-sm font-semibold">
        <div className="flex items-center gap-2">
          <span>Name:</span>
          <div className="h-[1px] min-w-20 flex-1 bg-slate-900"></div>
        </div>
        <div className="flex items-center gap-2">
          <span>Roll Number:</span>
          <div className="h-[1px] min-w-20 flex-1 bg-slate-900"></div>
        </div>
        <div className="flex items-center gap-2">
          <span>Class: 5th Section:</span>
          <div className="h-[1px] min-w-16 flex-1 bg-slate-900"></div>
        </div>
      </div>

      <div className="space-y-10">
        {paper.sections.map((section, sectionIndex) => {
          const parts = section.title.split(" - ");
          const sectionLabel = parts[0] || `Section ${String.fromCharCode(65 + sectionIndex)}`;
          const sectionName = parts.length > 1 ? parts.slice(1).join(" - ") : "";

          return (
            <section key={section.id}>
              <h3 className="mb-6 text-center text-lg font-bold sm:text-xl">{sectionLabel}</h3>
              
              <div className="mb-4">
                {sectionName && <h4 className="text-base font-bold sm:text-lg">{sectionName}</h4>}
                <p className="text-sm italic text-slate-700">{section.instruction}</p>
              </div>

              <ol className="space-y-5">
                {section.questions.map((question, index) => (
                  <li key={`${section.id}-${index}-${question.id}`} className="flex gap-2 text-sm md:text-base">
                    <span className="shrink-0">{index + 1}.</span>
                    <div className="w-full">
                      <p>
                        [{difficultyLabels[question.difficulty]}] {question.text} [{question.marks} Marks]
                      </p>
                      {question.type === "mcq" && question.options?.length === 4 && (
                        <div className="mt-3 grid grid-cols-1 gap-2 pl-4 md:grid-cols-2">
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

      <p className="mt-10 mb-12 font-bold">End of Question Paper</p>

      <div className="mt-12 border-t border-slate-300 pt-8">
        <h3 className="mb-6 text-lg font-bold sm:text-xl">Answer Key:</h3>
        <ol className="space-y-5">
          {paper.sections.flatMap(s => s.questions).map((question, index) => (
            <li key={`ans-${index}-${question.id}`} className="flex gap-3 text-sm md:text-base">
              <span className="shrink-0">{index + 1}.</span>
              <p className="leading-relaxed whitespace-pre-wrap">{question.answer || "Answer not generated."}</p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function StatusPanel({
  title,
  message,
  progress,
  failed = false,
}: {
  title: string;
  message: string;
  progress: number;
  failed?: boolean;
}) {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 text-center shadow-sm sm:p-8">
      <div className="w-full max-w-md">
        {failed ? (
          <RefreshCcw className="mx-auto h-10 w-10 text-red-500" />
        ) : (
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--accent)]" />
        )}
        <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
          {message || "Preparing generation job."}
        </p>
        {!failed && (
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${Math.max(5, progress)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function statusMessage(status: string) {
  if (status === "completed") return "Paper ready";
  if (status === "failed") return "Generation failed";
  if (status === "queued") return "Waiting in queue";
  return "Generating paper";
}
