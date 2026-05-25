import type { Assignment } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? API_URL;

export async function createAssignment(data: FormData) {
  const response = await fetch(`${API_URL}/api/assignments`, {
    method: "POST",
    body: data,
  });
  return parse<{ assignment: Assignment; jobId: string }>(response);
}

export async function getAssignment(id: string) {
  const response = await fetch(`${API_URL}/api/assignments/${id}`, {
    cache: "no-store",
  });
  return parse<{ assignment: Assignment }>(response);
}

export async function regenerateAssignment(id: string) {
  const response = await fetch(`${API_URL}/api/assignments/${id}/regenerate`, {
    method: "POST",
  });
  return parse<{ assignment: Assignment; jobId: string }>(response);
}

export function pdfUrl(id: string) {
  return `${API_URL}/api/assignments/${id}/pdf`;
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? "Request failed");
  }
  return body as T;
}
