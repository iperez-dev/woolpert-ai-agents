import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createAgent, createRequest, deleteAgent, deleteRequest, getAgent, getAgents, getRequests, updateAgent, updateRequest } from "./api";
import {
  AGENT_DEPARTMENTS,
  CATALOG_TYPE_LABELS,
  REQUEST_PROJECT_TYPE_LABELS,
  type Agent,
  type AgentCatalogType,
  type AgentDepartment,
  type AgentInput,
  type AgentRequest,
  type AgentRequestInput,
  type RequestPriority,
  type RequestProjectType,
} from "./types";

type CatalogFilter = "ai_agent" | "claude_skill" | "design_system" | "requested";

const SEARCH_STOPWORDS = new Set(["agent", "agents", "the", "a", "an"]);

function parseSearchTokens(raw: string): string[] {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !SEARCH_STOPWORDS.has(t));
}

function tagMatchesAnyToken(tag: string, tokens: string[]): boolean {
  const tagNorm = tag.toLowerCase();
  return tokens.some((tok) => tagNorm.includes(tok) || tok.includes(tagNorm));
}

function getSearchableTagStrings(agent: Agent): string[] {
  const kind = resolveCatalogType(agent);
  const label = CATALOG_TYPE_LABELS[kind];
  const slugSpaced = kind.replace(/_/g, " ");
  const extras =
    kind === "ai_agent"
      ? ["AI Agents", "ai agents"]
      : kind === "claude_skill"
        ? ["Claude Skills", "claude skills", "Claude skill"]
        : kind === "design_system"
          ? ["Design Systems", "design systems", "Design system"]
          : [];
  return [...agent.tags, label, kind, slugSpaced, ...extras];
}

function agentMatchesSearch(agent: Agent, tokens: string[]): boolean {
  if (tokens.length === 0) {
    return true;
  }
  return getSearchableTagStrings(agent).some((tag) => tagMatchesAnyToken(tag, tokens));
}

/** Base64 body only (no data: prefix), for .skill ZIP uploads. */
function fileToBase64Raw(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected read result."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed."));
    reader.readAsDataURL(file);
  });
}

function resolveCatalogType(agent: Agent): AgentCatalogType {
  return agent.catalogType ?? "ai_agent";
}

function catalogThumbnailTypeLabel(agent: Agent): string {
  return CATALOG_TYPE_LABELS[resolveCatalogType(agent)];
}

/** Display date as M.D.YYYY (e.g. 5.16.2026) */
function formatCardDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return `${d.getMonth() + 1}.${d.getDate()}.${d.getFullYear()}`;
}

type AgentCardAction = "launch" | "docs" | "edit" | "delete" | "skill_download";

const emptyAgentForm: AgentInput = {
  catalogType: "ai_agent",
  name: "",
  summary: "",
  department: "",
  tags: "",
  ownerName: "",
  ownerEmail: "",
  hostedUrl: "",
  docsUrl: "",
  featured: false,
  skillMarkdown: "",
  skillZipBase64: "",
  skillSourceFileName: "",
};

const emptyRequestForm: AgentRequestInput = {
  name: "",
  department: "",
  projectType: "",
  problem: "",
  currentSolutions: "",
  businessCase: "",
  successCriteria: "",
  requestedBy: "",
  requesterEmail: "",
  priority: "medium",
};

function App() {
  const skillFileInputRef = useRef<HTMLInputElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>("ai_agent");
  const [agentForm, setAgentForm] = useState<AgentInput>(emptyAgentForm);
  const [requestForm, setRequestForm] = useState<AgentRequestInput>(emptyRequestForm);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [agentSearch, setAgentSearch] = useState("");
  const [actionGate, setActionGate] = useState<{
    agent: Agent;
    action: AgentCardAction;
  } | null>(null);
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [requestDetail, setRequestDetail] = useState<AgentRequest | null>(null);
  const [requestDetailEditing, setRequestDetailEditing] = useState(false);
  const [requestDetailForm, setRequestDetailForm] = useState<AgentRequestInput>(emptyRequestForm);

  const closeActionGate = useCallback(() => {
    setActionGate(null);
    setGatePassword("");
    setGateError("");
  }, []);

  const aiAgentCount = useMemo(
    () => agents.filter((agent) => resolveCatalogType(agent) === "ai_agent").length,
    [agents]
  );

  const claudeSkillCount = useMemo(
    () => agents.filter((agent) => resolveCatalogType(agent) === "claude_skill").length,
    [agents]
  );

  const designSystemCount = useMemo(
    () => agents.filter((agent) => resolveCatalogType(agent) === "design_system").length,
    [agents]
  );

  const filteredAgents = useMemo(() => {
    if (activeFilter === "requested") return [];
    const pool = agents.filter((a) => resolveCatalogType(a) === activeFilter);
    const tokens = parseSearchTokens(agentSearch);
    if (tokens.length === 0) return pool;
    return pool.filter((agent) => agentMatchesSearch(agent, tokens));
  }, [agents, agentSearch, activeFilter]);

  const filteredRequests = useMemo(() => {
    if (activeFilter !== "requested") return [];
    const tokens = parseSearchTokens(agentSearch);
    if (tokens.length === 0) return requests;
    return requests.filter((req) => {
      const text = [req.name, req.department, req.projectType, req.problem, req.requestedBy, req.priority, req.status]
        .join(" ")
        .toLowerCase();
      return tokens.some((tok) => text.includes(tok));
    });
  }, [requests, agentSearch, activeFilter]);

  useEffect(() => {
    async function loadData() {
      try {
        const [agentList, requestList] = await Promise.all([getAgents(), getRequests()]);
        setAgents(agentList);
        setRequests(requestList);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load data.");
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!actionGate) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeActionGate();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actionGate, closeActionGate]);

  useEffect(() => {
    if (!actionGate) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [actionGate]);

  function resetMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function applySkillUploadFile(file: File) {
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".md")) {
        const text = await file.text();
        setAgentForm((prev) => ({
          ...prev,
          skillMarkdown: text,
          skillZipBase64: "",
          skillSourceFileName: file.name,
        }));
        resetMessages();
        return;
      }
      if (lower.endsWith(".skill")) {
        const b64 = await fileToBase64Raw(file);
        setAgentForm((prev) => ({
          ...prev,
          skillMarkdown: "",
          skillZipBase64: b64,
          skillSourceFileName: file.name,
        }));
        resetMessages();
        return;
      }
      setErrorMessage("Upload a plain .md skill file or a .skill ZIP archive.");
    } catch {
      setErrorMessage("Could not read the skill file.");
    }
  }

  async function beginEditing(agent: Agent) {
    setBusy(true);
    resetMessages();
    try {
      const full = await getAgent(agent._id);
      setEditingAgentId(full._id);
      setAgentForm({
        catalogType: resolveCatalogType(full),
        name: full.name,
        summary: full.summary,
        department: full.department,
        tags: full.tags.join(", "),
        ownerName: full.ownerName,
        ownerEmail: full.ownerEmail,
        hostedUrl: full.hostedUrl,
        docsUrl: full.docsUrl || "",
        featured: full.featured,
        skillMarkdown: full.skillMarkdown ?? "",
        skillZipBase64: "",
        skillSourceFileName: "",
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load agent for editing.");
    } finally {
      setBusy(false);
    }
  }

  function cancelEditing() {
    setEditingAgentId(null);
    setAgentForm(emptyAgentForm);
  }

  async function refreshAgents() {
    const agentList = await getAgents();
    setAgents(agentList);
  }

  async function handleAgentSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    resetMessages();

    try {
      if (agentForm.catalogType === "claude_skill") {
        const hasSkillPayload =
          agentForm.skillMarkdown.trim().length > 0 || agentForm.skillZipBase64.trim().length > 0;
        if (!hasSkillPayload) {
          setErrorMessage(
            "Claude Skill catalog items require a plain .md file or a .skill ZIP with valid SKILL.md frontmatter."
          );
          return;
        }
      }

      const authEmail = agentForm.ownerEmail.trim();
      if (editingAgentId) {
        await updateAgent(editingAgentId, agentForm, authEmail);
        setSuccessMessage("Agent updated successfully.");
      } else {
        await createAgent(agentForm, authEmail);
        setSuccessMessage("Agent uploaded successfully.");
      }

      await refreshAgents();
      cancelEditing();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save agent.");
    } finally {
      setBusy(false);
    }
  }

  function openActionGate(agent: Agent, action: AgentCardAction) {
    setActionGate({ agent, action });
    setGatePassword("");
    setGateError("");
  }

  function confirmActionGate() {
    if (!actionGate) {
      return;
    }
    const expected = actionGate.agent.name.trim();
    if (gatePassword.trim() !== expected) {
      setGateError("Incorrect password. Try again, or contact the developer team if you need access.");
      return;
    }

    const { agent, action } = actionGate;
    closeActionGate();

    if (action === "launch") {
      window.open(agent.hostedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "docs" && agent.docsUrl) {
      window.open(agent.docsUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "edit") {
      void beginEditing(agent);
      return;
    }
    if (action === "delete") {
      void performDelete(agent._id);
      return;
    }
    if (action === "skill_download") {
      void downloadSkillMarkdown(agent);
    }
  }

  async function downloadSkillMarkdown(agent: Agent) {
    try {
      const full = await getAgent(agent._id);
      const md = full.skillMarkdown;
      if (!md?.trim()) {
        setErrorMessage("No skill file is stored for this catalog item.");
        return;
      }
      const base =
        agent.name
          .trim()
          .replace(/[/\\?%*:|"<>]/g, "_")
          .slice(0, 120) || "SKILL";
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${base}.md`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not download skill file.");
    }
  }

  async function performDelete(agentId: string) {
    setBusy(true);
    resetMessages();

    try {
      const agent = agents.find((a) => a._id === agentId);
      await deleteAgent(agentId, (agent?.ownerEmail ?? "").trim());
      await refreshAgents();
      setSuccessMessage("Agent removed.");
      if (editingAgentId === agentId) {
        cancelEditing();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete agent.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    resetMessages();

    try {
      await createRequest(requestForm);
      const updatedRequests = await getRequests();
      setRequests(updatedRequests);
      setRequestForm(emptyRequestForm);
      setSuccessMessage("Request submitted. Thank you.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit request.");
    } finally {
      setBusy(false);
    }
  }

  function openRequestDetail(req: AgentRequest) {
    setRequestDetail(req);
    setRequestDetailEditing(false);
    setRequestDetailForm({
      name: req.name,
      department: req.department,
      projectType: req.projectType,
      problem: req.problem,
      currentSolutions: req.currentSolutions,
      businessCase: req.businessCase,
      successCriteria: req.successCriteria,
      requestedBy: req.requestedBy,
      requesterEmail: req.requesterEmail,
      priority: req.priority,
    });
  }

  function closeRequestDetail() {
    setRequestDetail(null);
    setRequestDetailEditing(false);
  }

  async function handleRequestUpdate(event: FormEvent) {
    event.preventDefault();
    if (!requestDetail) return;
    setBusy(true);
    resetMessages();
    try {
      await updateRequest(requestDetail._id, requestDetailForm);
      const updated = await getRequests();
      setRequests(updated);
      closeRequestDetail();
      setSuccessMessage("Request updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update request.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestDelete() {
    if (!requestDetail) return;
    setBusy(true);
    resetMessages();
    try {
      await deleteRequest(requestDetail._id);
      const updated = await getRequests();
      setRequests(updated);
      closeRequestDetail();
      setSuccessMessage("Request deleted.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero__overlay" />
        <div className="hero__content">
          <p className="hero__eyebrow">Woolpert AI Mission Control</p>
          <h1>AGENTS</h1>
          <p className="hero__summary">
            Central repository for discoverable AI agents across Woolpert teams. Browse, launch,
            and request what should be built next.
          </p>
        </div>
      </section>

      <section className="metrics">
        <article
          className={activeFilter === "ai_agent" ? "metrics__tab--active" : ""}
          onClick={() => setActiveFilter("ai_agent")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveFilter("ai_agent")}
        >
          <h2>{aiAgentCount}</h2>
          <p>AI Agents</p>
        </article>
        <article
          className={activeFilter === "claude_skill" ? "metrics__tab--active" : ""}
          onClick={() => setActiveFilter("claude_skill")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveFilter("claude_skill")}
        >
          <h2>{claudeSkillCount}</h2>
          <p>Claude Skills</p>
        </article>
        <article
          className={activeFilter === "design_system" ? "metrics__tab--active" : ""}
          onClick={() => setActiveFilter("design_system")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveFilter("design_system")}
        >
          <h2>{designSystemCount}</h2>
          <p>Design Systems</p>
        </article>
        <article
          className={activeFilter === "requested" ? "metrics__tab--active" : ""}
          onClick={() => setActiveFilter("requested")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveFilter("requested")}
        >
          <h2>{requests.length}</h2>
          <p>Requested Agents</p>
        </article>
      </section>

      {(errorMessage || successMessage) && (
        <section className={`banner ${errorMessage ? "banner--error" : "banner--success"}`}>
          {errorMessage || successMessage}
        </section>
      )}

      <section className="agents">
        <div className="agents__search">
          <label htmlFor="agent-search" className="agents__search-label">
            {activeFilter === "requested" ? "Search requested agents" : "Search by tag keyword"}
            <input
              id="agent-search"
              type="search"
              value={agentSearch}
              onChange={(event) => setAgentSearch(event.target.value)}
              placeholder={activeFilter === "requested" ? "e.g. automation, high priority" : "e.g. scraping, AI Agent, Claude Skill"}
              autoComplete="off"
            />
          </label>
        </div>

        {activeFilter === "requested" ? (
          filteredRequests.length === 0 && agentSearch.trim() !== "" ? (
            <p className="agents__empty">No requests match your search.</p>
          ) : filteredRequests.length === 0 ? (
            <p className="agents__empty">No agent requests yet.</p>
          ) : (
            <div className="agent-grid">
              {filteredRequests.map((req) => (
                <article key={req._id} className="agent-card agent-card--clickable" onClick={() => openRequestDetail(req)}>
                  <header className="agent-card__meta">
                    <span className={`agent-card__tag agent-card__tag--priority-${req.priority}`}>
                      {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)} Priority
                    </span>
                    <time className="agent-card__date" dateTime={req.createdAt}>
                      {formatCardDate(req.createdAt)}
                    </time>
                  </header>
                  <h3 className="agent-card__title">{req.name}</h3>
                  <p className="agent-card__summary">{req.problem}</p>
                  <div className="agent-card__tags" aria-label="Tags">
                    <span className="agent-card__tag agent-card__tag--dept">{req.department}</span>
                    <span className={`agent-card__tag agent-card__tag--catalog-${req.projectType === "ai_agent" ? "ai" : req.projectType === "claude_skill" ? "claude" : "plugin"}`}>
                      {REQUEST_PROJECT_TYPE_LABELS[req.projectType]}
                    </span>
                  </div>
                  <p className="agent-card__creator">
                    Requested by: {req.requestedBy} ({req.requesterEmail})
                  </p>
                </article>
              ))}
            </div>
          )
        ) : filteredAgents.length === 0 && agentSearch.trim() !== "" ? (
          <p className="agents__empty">No agents match your search.</p>
        ) : (
          <div className="agent-grid">
            {filteredAgents.map((agent) => (
              <article key={agent._id} className="agent-card">
                <header className="agent-card__meta">
                  <span className="agent-card__dept">{agent.department}</span>
                  <time className="agent-card__date" dateTime={agent.createdAt}>
                    {formatCardDate(agent.createdAt)}
                  </time>
                </header>
                <h3 className="agent-card__title">{agent.name.trim()}</h3>
                <p className="agent-card__summary">{agent.summary}</p>
                <div className="agent-card__tags" aria-label="Tags">
                  <span
                    className={
                      resolveCatalogType(agent) === "claude_skill"
                        ? "agent-card__tag agent-card__tag--catalog-claude"
                        : resolveCatalogType(agent) === "design_system"
                          ? "agent-card__tag agent-card__tag--catalog-design"
                          : "agent-card__tag agent-card__tag--catalog-ai"
                    }
                  >
                    {catalogThumbnailTypeLabel(agent)}
                  </span>
                  {agent.tags.map((tag) => (
                    <span key={`${agent._id}-${tag}`} className="agent-card__tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="agent-card__creator">
                  Creator: {agent.ownerName} ({agent.ownerEmail})
                </p>
                <footer className="agent-card__footer">
                  <button
                    type="button"
                    className="agent-card__action"
                    onClick={() => openActionGate(agent, "launch")}
                  >
                    Launch Agent
                  </button>
                  {agent.docsUrl ? (
                    <button
                      type="button"
                      className="agent-card__action"
                      onClick={() => openActionGate(agent, "docs")}
                    >
                      Documentation
                    </button>
                  ) : null}
                  <button type="button" className="agent-card__action" onClick={() => openActionGate(agent, "edit")}>
                    Edit
                  </button>
                  {resolveCatalogType(agent) === "claude_skill" && agent.skillFileUploaded ? (
                    <button
                      type="button"
                      className="agent-card__action"
                      onClick={() => openActionGate(agent, "skill_download")}
                    >
                      Download SKILL.md
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="agent-card__action"
                    onClick={() => openActionGate(agent, "delete")}
                  >
                    Delete
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="forms">
        <form className="panel" onSubmit={handleAgentSubmit}>
          <h2>{editingAgentId ? "Update Existing Agent" : "Upload New Agent"}</h2>
          <p className="panel__hint">
            Allowed users only. Creator email must be your Woolpert address listed in the backend allow
            list — it is used to authorize uploads and edits.
          </p>

          <label>
            Catalog item type
            <select
              required
              value={agentForm.catalogType}
              onChange={(event) =>
                setAgentForm((prev) => ({
                  ...prev,
                  catalogType: event.target.value as AgentCatalogType,
                  ...(event.target.value !== "claude_skill"
                    ? { skillMarkdown: "", skillZipBase64: "", skillSourceFileName: "" }
                    : {}),
                }))
              }
            >
              <option value="ai_agent">{CATALOG_TYPE_LABELS.ai_agent}</option>
              <option value="claude_skill">{CATALOG_TYPE_LABELS.claude_skill}</option>
              <option value="design_system">{CATALOG_TYPE_LABELS.design_system}</option>
            </select>
          </label>
          <label>
            Creator name
            <input
              required
              value={agentForm.ownerName}
              onChange={(event) =>
                setAgentForm((prev) => ({ ...prev, ownerName: event.target.value }))
              }
            />
          </label>
          <label>
            Creator email
            <input
              required
              type="email"
              value={agentForm.ownerEmail}
              onChange={(event) =>
                setAgentForm((prev) => ({ ...prev, ownerEmail: event.target.value }))
              }
            />
          </label>
          <label>
            Agent name
            <input
              required
              value={agentForm.name}
              onChange={(event) => setAgentForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label>
            Agent department
            <select
              required
              value={agentForm.department}
              onChange={(event) =>
                setAgentForm((prev) => ({ ...prev, department: event.target.value }))
              }
            >
              <option value="" disabled>
                Select department
              </option>
              {AGENT_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
              {agentForm.department !== "" &&
              !AGENT_DEPARTMENTS.includes(agentForm.department as AgentDepartment) ? (
                <option value={agentForm.department}>{agentForm.department} (legacy)</option>
              ) : null}
            </select>
          </label>
          <label>
            Tags (comma separated)
            <input
              value={agentForm.tags}
              onChange={(event) => setAgentForm((prev) => ({ ...prev, tags: event.target.value }))}
              placeholder="GIS, Automation, Proposal"
            />
          </label>
          <label>
            Description
            <textarea
              required
              value={agentForm.summary}
              onChange={(event) =>
                setAgentForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </label>

          {agentForm.catalogType === "claude_skill" ? (
            <div className="skill-dropzone-wrap">
              <span className="skill-dropzone-label">Claude skill (.md or .skill ZIP)</span>
              <div
                className="skill-dropzone"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files[0];
                  if (file) {
                    void applySkillUploadFile(file);
                  }
                }}
                onClick={() => skillFileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    skillFileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <p className="skill-dropzone__lead">Drop a plain SKILL.md or a .skill ZIP here, or click to browse</p>
                <p className="skill-dropzone__hint">
                  Plain file: YAML frontmatter with name and description. Archive: must contain exactly one
                  top-level folder with SKILL.md inside (e.g. MySkill/SKILL.md).
                </p>
              </div>
              <input
                ref={skillFileInputRef}
                type="file"
                accept=".md,.skill,text/markdown,application/zip"
                className="skill-dropzone__input"
                aria-label="Choose Claude skill file or archive"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void applySkillUploadFile(file);
                  }
                  event.target.value = "";
                }}
              />
              <p className="skill-dropzone__status">
                {agentForm.skillSourceFileName
                  ? `Attached: ${agentForm.skillSourceFileName}`
                  : agentForm.skillMarkdown.trim() || agentForm.skillZipBase64.trim()
                    ? "Saved skill on server — drop or browse to replace."
                    : "No skill file selected yet."}
              </p>
            </div>
          ) : null}

          <label>
            Hosted URL
            <input
              required
              type="url"
              value={agentForm.hostedUrl}
              onChange={(event) =>
                setAgentForm((prev) => ({ ...prev, hostedUrl: event.target.value }))
              }
              placeholder="https://..."
            />
          </label>
          <label>
            Documentation URL (optional)
            <input
              type="url"
              value={agentForm.docsUrl}
              onChange={(event) => setAgentForm((prev) => ({ ...prev, docsUrl: event.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={agentForm.featured}
              onChange={(event) =>
                setAgentForm((prev) => ({ ...prev, featured: event.target.checked }))
              }
            />
            Featured agent
          </label>

          <div className="panel__actions">
            <button disabled={busy} type="submit">
              {editingAgentId ? "Save Changes" : "Upload Agent"}
            </button>
            {editingAgentId ? (
              <button type="button" className="ghost" onClick={cancelEditing}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <form className="panel" onSubmit={handleRequestSubmit}>
          <h2>Request a New Agent</h2>
          <p className="panel__hint">
            Missing something from the catalog? Submit a request so the team can prioritize it.
          </p>
          <label>
            Name
            <input
              required
              value={requestForm.name}
              onChange={(event) => setRequestForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="RFPs Dashboard"
            />
          </label>
          <label>
            Department
            <select
              required
              value={requestForm.department}
              onChange={(event) =>
                setRequestForm((prev) => ({ ...prev, department: event.target.value as AgentDepartment }))
              }
            >
              <option value="" disabled>Select a department</option>
              {AGENT_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </label>
          <label>
            Project type
            <select
              required
              value={requestForm.projectType}
              onChange={(event) =>
                setRequestForm((prev) => ({ ...prev, projectType: event.target.value as RequestProjectType }))
              }
            >
              <option value="" disabled>Select a project type</option>
              {(Object.entries(REQUEST_PROJECT_TYPE_LABELS) as [RequestProjectType, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Problem
            <textarea
              required
              value={requestForm.problem}
              onChange={(event) =>
                setRequestForm((prev) => ({ ...prev, problem: event.target.value }))
              }
              placeholder="The practice receives RFPs and other opportunities across multiple portals and there is no single place to track them. Opportunities are being missed because they are discovered too late to respond competitively."
            />
          </label>
          <label>
            Current solutions
            <textarea
              required
              value={requestForm.currentSolutions}
              onChange={(event) =>
                setRequestForm((prev) => ({ ...prev, currentSolutions: event.target.value }))
              }
              placeholder="Opportunities are tracked through multiple individual government and private platforms."
            />
          </label>
          <label>
            Business case
            <textarea
              required
              value={requestForm.businessCase}
              onChange={(event) =>
                setRequestForm((prev) => ({ ...prev, businessCase: event.target.value }))
              }
              placeholder="Time saved: Eliminates duplicated, fragmented portal monitoring across the team. One shared source of truth replaces individual effort. Better strategic decisions: Full pipeline visibility lets leadership make deliberate choices about where to focus BD effort — by sector, client type, and volume."
            />
          </label>
          <label>
            Success criteria
            <textarea
              required
              value={requestForm.successCriteria}
              onChange={(event) =>
                setRequestForm((prev) => ({ ...prev, successCriteria: event.target.value }))
              }
              placeholder="A 60-day pilot with the BD team and two directors. All incoming opportunities logged regardless of source. Success: zero opportunities discovered too late, and at least one pursuit directly enabled by the dashboard's visibility."
            />
          </label>
          <label>
            Requested by
            <input
              required
              value={requestForm.requestedBy}
              onChange={(event) =>
                setRequestForm((prev) => ({ ...prev, requestedBy: event.target.value }))
              }
            />
          </label>
          <label>
            Requester email
            <input
              required
              type="email"
              value={requestForm.requesterEmail}
              onChange={(event) =>
                setRequestForm((prev) => ({ ...prev, requesterEmail: event.target.value }))
              }
              placeholder="name@woolpert.com"
            />
          </label>
          <label>
            Priority
            <select
              value={requestForm.priority}
              onChange={(event) =>
                setRequestForm((prev) => ({
                  ...prev,
                  priority: event.target.value as AgentRequestInput["priority"],
                }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <div className="panel__actions">
            <button disabled={busy} type="submit">
              Submit Request
            </button>
          </div>
        </form>
      </section>

      {requestDetail ? (
        <div
          className="req-detail"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRequestDetail();
          }}
        >
          <div
            className="req-detail__dialog"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {requestDetailEditing ? (
              <form onSubmit={handleRequestUpdate}>
                <div className="req-detail__header">
                  <h3 className="req-detail__title">Edit Request</h3>
                  <button type="button" className="req-detail__close" onClick={closeRequestDetail}>Close</button>
                </div>
                <div className="req-detail__fields">
                  <label>
                    Name
                    <input
                      required
                      value={requestDetailForm.name}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </label>
                  <label>
                    Department
                    <select
                      required
                      value={requestDetailForm.department}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, department: e.target.value as AgentDepartment }))}
                    >
                      <option value="" disabled>Select a department</option>
                      {AGENT_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Project type
                    <select
                      required
                      value={requestDetailForm.projectType}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, projectType: e.target.value as RequestProjectType }))}
                    >
                      <option value="" disabled>Select a project type</option>
                      {(Object.entries(REQUEST_PROJECT_TYPE_LABELS) as [RequestProjectType, string][]).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Problem
                    <textarea
                      required
                      value={requestDetailForm.problem}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, problem: e.target.value }))}
                    />
                  </label>
                  <label>
                    Current solutions
                    <textarea
                      required
                      value={requestDetailForm.currentSolutions}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, currentSolutions: e.target.value }))}
                    />
                  </label>
                  <label>
                    Business case
                    <textarea
                      required
                      value={requestDetailForm.businessCase}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, businessCase: e.target.value }))}
                    />
                  </label>
                  <label>
                    Success criteria
                    <textarea
                      required
                      value={requestDetailForm.successCriteria}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, successCriteria: e.target.value }))}
                    />
                  </label>
                  <label>
                    Requested by
                    <input
                      required
                      value={requestDetailForm.requestedBy}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, requestedBy: e.target.value }))}
                    />
                  </label>
                  <label>
                    Requester email
                    <input
                      required
                      type="email"
                      value={requestDetailForm.requesterEmail}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, requesterEmail: e.target.value }))}
                    />
                  </label>
                  <label>
                    Priority
                    <select
                      value={requestDetailForm.priority}
                      onChange={(e) => setRequestDetailForm((p) => ({ ...p, priority: e.target.value as RequestPriority }))}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>
                <div className="req-detail__actions">
                  <button type="submit" className="req-detail__save-btn" disabled={busy}>Save</button>
                  <button type="button" className="req-detail__cancel-btn" onClick={() => setRequestDetailEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div className="req-detail__header">
                  <h3 className="req-detail__title">{requestDetail.name}</h3>
                  <button type="button" className="req-detail__close" onClick={closeRequestDetail}>Close</button>
                </div>
                <div className="req-detail__tags">
                  <span className="agent-card__tag agent-card__tag--dept">{requestDetail.department}</span>
                  <span className={`agent-card__tag agent-card__tag--catalog-${requestDetail.projectType === "ai_agent" ? "ai" : requestDetail.projectType === "claude_skill" ? "claude" : "plugin"}`}>
                    {REQUEST_PROJECT_TYPE_LABELS[requestDetail.projectType]}
                  </span>
                  <span className={`agent-card__tag agent-card__tag--priority-${requestDetail.priority}`}>
                    {requestDetail.priority.charAt(0).toUpperCase() + requestDetail.priority.slice(1)} Priority
                  </span>
                  <span className={`agent-card__tag agent-card__tag--status-${requestDetail.status}`}>
                    {requestDetail.status.charAt(0).toUpperCase() + requestDetail.status.slice(1)}
                  </span>
                </div>
                <hr className="req-detail__divider" />
                <div className="req-detail__section">
                  <span className="req-detail__label">Problem</span>
                  <p className="req-detail__value">{requestDetail.problem}</p>
                </div>
                <div className="req-detail__section">
                  <span className="req-detail__label">Current solutions</span>
                  <p className="req-detail__value">{requestDetail.currentSolutions}</p>
                </div>
                <div className="req-detail__section">
                  <span className="req-detail__label">Business case</span>
                  <p className="req-detail__value">{requestDetail.businessCase}</p>
                </div>
                <div className="req-detail__section">
                  <span className="req-detail__label">Success criteria</span>
                  <p className="req-detail__value">{requestDetail.successCriteria}</p>
                </div>
                <hr className="req-detail__divider" />
                <div className="req-detail__section">
                  <span className="req-detail__label">Requested by</span>
                  <p className="req-detail__value">{requestDetail.requestedBy} — {requestDetail.requesterEmail}</p>
                </div>
                <div className="req-detail__section">
                  <span className="req-detail__label">Submitted</span>
                  <p className="req-detail__value">{formatCardDate(requestDetail.createdAt)}</p>
                </div>
                <div className="req-detail__actions">
                  <button type="button" className="req-detail__edit-btn" onClick={() => setRequestDetailEditing(true)}>Edit</button>
                  <button type="button" className="req-detail__delete-btn" onClick={handleRequestDelete} disabled={busy}>Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {actionGate ? (
        <div
          className="action-gate"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeActionGate();
            }
          }}
        >
          <div
            className="action-gate__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-gate-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 id="action-gate-title">Password required</h3>
            <p className="action-gate__hint">
              Enter the password to access this agent. If you need credentials, contact the developer team.
            </p>
            <label className="action-gate__label">
              Password
              <input
                autoComplete="off"
                type="text"
                value={gatePassword}
                onChange={(event) => {
                  setGatePassword(event.target.value);
                  setGateError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    confirmActionGate();
                  }
                }}
              />
            </label>
            {gateError ? <p className="action-gate__error">{gateError}</p> : null}
            <div className="action-gate__actions">
              <button type="button" className="action-gate__confirm" onClick={confirmActionGate}>
                Continue
              </button>
              <button type="button" className="action-gate__cancel" onClick={closeActionGate}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
