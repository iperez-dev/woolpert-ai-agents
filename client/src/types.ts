export type AgentCatalogType = "ai_agent" | "claude_skill";

export const AGENT_DEPARTMENTS = [
  "Buildings",
  "Geospatial",
  "Infrastructure",
  "Growth",
  "Human Resources",
  "Finance and Legal",
  "IT",
] as const;

export type AgentDepartment = (typeof AGENT_DEPARTMENTS)[number];

export const CATALOG_TYPE_LABELS: Record<AgentCatalogType, string> = {
  ai_agent: "AI Agent",
  claude_skill: "Claude Skill",
};

export type RequestPriority = "low" | "medium" | "high";

export interface Agent {
  _id: string;
  catalogType?: AgentCatalogType;
  name: string;
  summary: string;
  department: string;
  tags: string[];
  ownerName: string;
  ownerEmail: string;
  hostedUrl: string;
  docsUrl?: string;
  skillMarkdown?: string;
  skillFileUploaded?: boolean;
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
  catalogType: AgentCatalogType;
  name: string;
  summary: string;
  department: string;
  tags: string;
  ownerName: string;
  ownerEmail: string;
  hostedUrl: string;
  docsUrl: string;
  featured: boolean;
  skillMarkdown: string;
  skillZipBase64: string;
  skillSourceFileName: string;
}

export interface AgentRequestInput {
  title: string;
  businessNeed: string;
  requestedBy: string;
  requesterEmail: string;
  priority: RequestPriority;
}
