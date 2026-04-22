export type AgentStatus = "active" | "pilot" | "deprecated";
export type RequestPriority = "low" | "medium" | "high";

export interface Agent {
  _id: string;
  name: string;
  summary: string;
  department: string;
  tags: string[];
  ownerName: string;
  ownerEmail: string;
  hostedUrl: string;
  docsUrl?: string;
  status: AgentStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRequest {
  _id: string;
  title: string;
  businessNeed: string;
  requestedBy: string;
  requesterEmail: string;
  priority: RequestPriority;
  status: "new" | "reviewing" | "planned" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface AgentInput {
  name: string;
  summary: string;
  department: string;
  tags: string;
  ownerName: string;
  ownerEmail: string;
  hostedUrl: string;
  docsUrl: string;
  status: AgentStatus;
  featured: boolean;
}

export interface AgentRequestInput {
  title: string;
  businessNeed: string;
  requestedBy: string;
  requesterEmail: string;
  priority: RequestPriority;
}
