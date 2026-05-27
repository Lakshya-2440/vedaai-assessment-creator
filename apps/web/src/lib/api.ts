import type { Assignment } from "./types";

const DEFAULT_API_URL =
  process.env.NODE_ENV === "production" ? "https://vedaai-api-kztt.onrender.com" : "/api/proxy";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";

export async function createAssignment(data: FormData) {
  const response = await fetch(`${API_URL}/api/assignments`, {
    method: "POST",
    body: data,
  });
  const body = await parse<unknown>(response);
  const payload = unwrap(body) as { assignment?: Assignment; assignmentId?: string; jobId?: string };
  if (payload.assignment) {
    return { assignment: payload.assignment, jobId: payload.jobId ?? "" };
  }
  if (payload.assignmentId) {
    return {
      assignment: { _id: payload.assignmentId } as Assignment,
      jobId: payload.jobId ?? "",
    };
  }
  throw new Error("Unexpected create-assignment response");
}

export async function listAssignments() {
  const response = await fetch(`${API_URL}/api/assignments`, {
    cache: "no-store",
  });
  const body = await parse<unknown>(response);
  const payload = unwrap(body) as { assignments?: Assignment[] } | Assignment[];
  if (Array.isArray(payload)) return { assignments: payload };
  return { assignments: payload.assignments ?? [] };
}

export async function deleteAssignment(id: string) {
  const response = await fetch(`${API_URL}/api/assignments/${id}`, {
    method: "DELETE",
  });
  return parse<{ ok: true }>(response);
}

export async function getAssignment(id: string) {
  const response = await fetch(`${API_URL}/api/assignments/${id}`, {
    cache: "no-store",
  });
  const body = await parse<unknown>(response);
  const payload = unwrap(body) as { assignment?: Assignment } | Assignment;
  if ("assignment" in (payload as { assignment?: Assignment }) && (payload as { assignment?: Assignment }).assignment) {
    return { assignment: (payload as { assignment: Assignment }).assignment };
  }
  return { assignment: payload as Assignment };
}

export async function getAssignmentResult(id: string) {
  const response = await fetch(`${API_URL}/api/assignments/${id}/result`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  return parse<{ paper?: Assignment["paper"]; cached?: boolean }>(response);
}

export async function regenerateAssignment(id: string) {
  const response = await fetch(`${API_URL}/api/assignments/${id}/regenerate`, {
    method: "POST",
  });
  const body = await parse<unknown>(response);
  const payload = unwrap(body) as { assignment?: Assignment; jobId?: string };
  if (payload.assignment) {
    return { assignment: payload.assignment, jobId: payload.jobId ?? "" };
  }
  throw new Error("Unexpected regenerate response");
}

export function pdfUrl(id: string) {
  return `${API_URL}/api/assignments/${id}/pdf`;
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text().catch(() => "");
  const body = text ? safeJson(text) : {};
  if (!response.ok) {
    const message =
      body && typeof body === "object" && !Array.isArray(body)
        ? ((body as { message?: string; error?: string }).message ??
          (body as { message?: string; error?: string }).error)
        : undefined;
    const fallback = text.trim().slice(0, 180);
    throw new Error(message ?? fallback ?? `Request failed with status ${response.status}`);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function unwrap<T>(body: unknown): T {
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    (body as { success?: boolean }).success === false
  ) {
    throw new Error((body as { message?: string; error?: string }).message ?? "Request failed");
  }
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    (body as { success?: boolean }).success !== false
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}
