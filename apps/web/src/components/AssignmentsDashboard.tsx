"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter, MoreVertical, Plus, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteAssignment, listAssignments } from "@/lib/api";
import type { Assignment } from "@/lib/types";

export function AssignmentsDashboard() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAssignments()
      .then(({ assignments: next }) => {
        if (cancelled) return;
        setAssignments(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load assignments.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    await deleteAssignment(id);
    setAssignments((current) => current.filter((assignment) => assignment._id !== id));
    setOpenMenuId(null);
    setDeleteTarget(null);
    window.dispatchEvent(new Event("assignments:changed"));
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-md text-sm text-red-600">{error}</p>
        <Link href="/assignments/new" className="flex items-center gap-2 rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white hover:bg-black">
          <Plus className="h-5 w-5" />
          Create Assignment
        </Link>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="relative flex min-h-[calc(100vh-8rem)] flex-col px-4 pb-28 pt-8 text-center sm:px-6 sm:pb-24">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
          <img src="/empty-state.png" alt="No assignments" className="mb-6 h-64 w-64 object-contain sm:mb-8 sm:h-72 sm:w-72" />
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">No assignments yet</h2>
          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
            Create your first assignment to start collecting and grading student
            submissions. You can set up rubrics, define marking criteria, and let AI
            assist with grading.
          </p>
          <Link
            href="/assignments/new"
            className="inline-flex items-center gap-3 rounded-full bg-[#1a1a1a] px-8 py-4 text-base font-semibold text-white shadow-[0_2px_0_rgba(255,255,255,0.22),0_8px_24px_rgba(0,0,0,0.22)] transition-colors hover:bg-black sm:px-10 sm:py-4.5 sm:text-lg"
          >
            <Plus className="h-6 w-6" />
            Create Your First Assignment
          </Link>
        </div>

        <div className="fixed bottom-28 right-4 z-20 sm:bottom-32 sm:right-6 md:hidden">
          <Link
            href="/assignments/new"
            aria-label="Create assignment"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#ea6d3d] shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition-transform active:scale-95"
          >
            <Plus className="h-10 w-10" strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-none flex-col pb-28 sm:pb-24">
      <div className="md:hidden">
        <div className="-mx-4 -mt-5 bg-[#d3d3d3] px-4 pb-5 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6">
          <div className="flex items-center justify-between">
            <button className="flex h-14 w-14 items-center justify-center rounded-full bg-white/55 text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="flex-1 text-center text-2xl font-bold text-gray-800">Assignments</h1>
            <div className="h-14 w-14" aria-hidden="true" />
          </div>

          <div className="mt-8 rounded-[28px] bg-white px-3 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <button className="flex items-center gap-2 text-gray-400">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium leading-none">Filter</span>
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex flex-1 items-center gap-2 rounded-full border border-gray-200 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Name"
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 hidden w-full sm:mb-8 md:block">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
          <span className="h-3 w-3 rounded-full bg-green-500"></span>
          Assignments
        </h1>
        <p className="mt-1 text-sm text-gray-500">Manage and create assignments for your classes.</p>
      </div>

      <div className="mb-6 hidden w-full md:block sm:mb-8">
        <div className="rounded-[28px] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4">
            <button className="flex shrink-0 items-center gap-2 rounded-full px-2 py-0.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600">
              <Filter className="h-4 w-4" />
              <span>Filter By</span>
            </button>

            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search Assignment" 
                className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        {assignments.map((assignment) => (
          <div 
            key={assignment._id} 
            className="group relative cursor-pointer rounded-2xl border border-gray-50 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] sm:p-6"
            onClick={() => router.push(`/assignments/${assignment._id}`)}
          >
            <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
              <h3 className="pr-2 text-lg font-bold text-gray-900 sm:pr-8 sm:text-xl">{assignment.title}</h3>
              <button 
                className="p-1 text-gray-400 hover:text-gray-900"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId((current) => (current === assignment._id ? null : assignment._id));
                }}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {openMenuId === assignment._id ? (
                <div className="absolute right-4 top-12 z-10 w-[14rem] overflow-hidden rounded-[24px] border border-gray-100 bg-white p-3 shadow-[0_18px_40px_rgba(0,0,0,0.14)] sm:right-5 sm:top-14 sm:w-[16rem]">
                  <button
                    type="button"
                    className="flex w-full items-center rounded-[18px] px-4 py-3.5 text-left text-base font-medium text-gray-800 transition-colors hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      router.push(`/assignments/${assignment._id}`);
                    }}
                  >
                    View Assignment
                  </button>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center rounded-[18px] bg-[#f6f6f6] px-4 py-3.5 text-left text-base font-medium text-[#c4473d] transition-colors hover:bg-[#f1f1f1]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(assignment);
                      setOpenMenuId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mt-auto flex flex-col gap-2 text-sm font-medium text-gray-900 sm:flex-row sm:items-center sm:justify-between">
              <span>Assigned on : {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-") : "N/A"}</span>
              <span>Due : {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-") : "N/A"}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-24 left-1/2 z-20 -translate-x-1/2 sm:bottom-8 md:left-[calc(50%+8rem)] md:block hidden">
        <Link
          href="/assignments/new"
          className="flex items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-gray-200/50 transition-transform hover:scale-105 hover:bg-black active:scale-95 sm:px-6 sm:py-3.5"
        >
          <Plus className="h-5 w-5" />
          Create Assignment
        </Link>
      </div>

      <div className="fixed bottom-28 right-4 z-30 md:hidden">
        <Link
          href="/assignments/new"
          aria-label="Create assignment"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#ea6d3d] shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition-transform active:scale-95"
        >
          <Plus className="h-8 w-8" strokeWidth={2.2} />
        </Link>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div
            className="w-full max-w-md rounded-[28px] border border-[#e9e2d8] bg-[var(--panel)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Delete assignment?</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  &quot;{deleteTarget.title}&quot; will be removed permanently. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                onClick={() => void handleDelete(deleteTarget._id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}