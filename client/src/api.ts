import type { Agent, AgentInput, AgentRequest, AgentRequestInput } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(
  /\/$/,
  ""
);

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getAgents(): Promise<Agent[]> {
  const response = await fetch(`${API_BASE_URL}/api/agents`);
  return parseResponse<Agent[]>(response);
}

export async function getAgent(agentId: string): Promise<Agent> {
  const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`);
  return parseResponse<Agent>(response);
}

export async function createAgent(input: AgentInput, userEmail: string): Promise<Agent> {
  const response = await fetch(`${API_BASE_URL}/api/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": userEmail,
    },
    body: JSON.stringify({
      ...input,
      tags: input.tags,
    }),
  });

  return parseResponse<Agent>(response);
}

export async function updateAgent(
  agentId: string,
  input: AgentInput,
  userEmail: string
): Promise<Agent> {
  const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": userEmail,
    },
    body: JSON.stringify({
      ...input,
      tags: input.tags,
    }),
  });

  return parseResponse<Agent>(response);
}

export async function deleteAgent(agentId: string, userEmail: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
    method: "DELETE",
    headers: {
      "x-user-email": userEmail,
    },
  });

  return parseResponse<void>(response);
}

export async function getRequests(): Promise<AgentRequest[]> {
  const response = await fetch(`${API_BASE_URL}/api/requests`);
  return parseResponse<AgentRequest[]>(response);
}

export async function createRequest(input: AgentRequestInput): Promise<AgentRequest> {
  const response = await fetch(`${API_BASE_URL}/api/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseResponse<AgentRequest>(response);
}
