const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer demo-token",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  getSessions: () => request<unknown[]>("/sessions"),
  getSession: (id: string) => request<unknown>(`/sessions/${id}`),
  getLearnings: () => request<unknown[]>("/learnings"),
  retrieve: (query: string, filters?: { statuses?: string[]; toolNames?: string[] }, limit = 5) =>
    request<{ results: unknown[] }>("/retrieve", {
      method: "POST",
      body: JSON.stringify({
        tenantId: "tenant-1",
        agentId: "all",
        query,
        limit,
        filters: filters || { statuses: [], toolNames: [] },
      }),
    }),
};
