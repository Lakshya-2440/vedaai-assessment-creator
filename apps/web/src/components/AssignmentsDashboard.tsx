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
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/assignments/new" className="flex items-center gap-2 rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white hover:bg-black">
          <Plus className="h-5 w-5" />
          Create Assignment
        </Link>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col items-center justify-center text-center">
        <img src="/empty-state.png" alt="No assignments" className="mb-6 h-64 w-64 object-contain" />
        <h2 className="mb-2 text-2xl font-bold text-gray-900">No assignments yet</h2>
        <p className="mb-8 max-w-lg text-sm leading-relaxed text-gray-500">
          Create your first assignment to start collecting and grading student
          submissions. You can set up rubrics, define marking criteria, and let AI
          assist with grading.
        </p>
        <Link
          href="/assignments/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
        >
          <Plus className="h-5 w-5" />
          Create Your First Assignment
        </Link>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-full max-w-6xl flex-col pb-28">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          Assignments
          <span className="ml-1 h-2 w-2 rounded-full bg-green-500"></span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">Manage and create assignments for your classes.</p>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <button className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-medium text-gray-500 shadow-sm transition-colors hover:text-gray-700">
          <Filter className="h-4 w-4" />
          Filter By
        </button>
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Assignment" 
            className="w-full rounded-xl border border-gray-100 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none transition-colors focus:border-gray-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {assignments.map((assignment) => (
          <div 
            key={assignment._id} 
            className="group relative cursor-pointer rounded-2xl border border-gray-50 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
            onClick={() => router.push(`/assignments/${assignment._id}`)}
          >
            <div className="mb-8 flex items-start justify-between">
              <h3 className="pr-8 text-xl font-bold text-gray-900">{assignment.title}</h3>
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
                <div className="absolute right-5 top-14 z-10 w-[16rem] overflow-hidden rounded-[24px] border border-gray-100 bg-white p-3 shadow-[0_18px_40px_rgba(0,0,0,0.14)]">
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
            <div className="mt-auto flex items-center justify-between text-sm font-medium text-gray-900">
              <span>Assigned on : {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-") : "N/A"}</span>
              <span>Due : {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-") : "N/A"}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-8 left-[calc(50%+8rem)] z-20 -translate-x-1/2">
        <Link
          href="/assignments/new"
          className="flex items-center gap-2 rounded-full bg-[#1a1a1a] px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-gray-200/50 transition-transform hover:scale-105 hover:bg-black active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Create Assignment
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