export type AgentCatalogType = "ai_agent" | "claude_skill" | "design_system";

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
  design_system: "Design System",
};

export type RequestPriority = "low" | "medium" | "high";

export type RequestProjectType = "ai_agent" | "claude_skill" | "plugin";

export const REQUEST_PROJECT_TYPE_LABELS: Record<RequestProjectType, string> = {
  ai_agent: "AI Agent",
  claude_skill: "Claude Skill",
  plugin: "Plugin",
};

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
  name: string;
  department: AgentDepartment;
  projectType: RequestProjectType;
  problem: string;
  currentSolutions: string;
  businessCase: string;
  successCriteria: string;
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
  name: string;
  department: AgentDepartment | "";
  projectType: RequestProjectType | "";
  problem: string;
  currentSolutions: string;
  businessCase: string;
  successCriteria: string;
  requestedBy: string;
  requesterEmail: string;
  priority: RequestPriority;
}
