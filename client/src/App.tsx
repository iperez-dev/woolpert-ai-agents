import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createAgent, createRequest, deleteAgent, getAgents, getRequests, updateAgent } from "./api";
import type { Agent, AgentInput, AgentRequestInput } from "./types";

const emptyAgentForm: AgentInput = {
  name: "",
  summary: "",
  department: "",
  tags: "",
  ownerName: "",
  ownerEmail: "",
  hostedUrl: "",
  docsUrl: "",
  status: "active",
  featured: false,
};

const emptyRequestForm: AgentRequestInput = {
  title: "",
  businessNeed: "",
  requestedBy: "",
  requesterEmail: "",
  priority: "medium",
};

function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [agentForm, setAgentForm] = useState<AgentInput>(emptyAgentForm);
  const [requestForm, setRequestForm] = useState<AgentRequestInput>(emptyRequestForm);
  const [uploaderEmail, setUploaderEmail] = useState("");
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeAgentCount = useMemo(
    () => agents.filter((agent) => agent.status === "active").length,
    [agents]
  );

  const featuredAgentCount = useMemo(
    () => agents.filter((agent) => agent.featured).length,
    [agents]
  );

  useEffect(() => {
    async function loadData() {
      try {
        const [agentList, requests] = await Promise.all([getAgents(), getRequests()]);
        setAgents(agentList);
        setRequestCount(requests.length);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load data.");
      }
    }

    loadData();
  }, []);

  function resetMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function beginEditing(agent: Agent) {
    setEditingAgentId(agent._id);
    setAgentForm({
      name: agent.name,
      summary: agent.summary,
      department: agent.department,
      tags: agent.tags.join(", "),
      ownerName: agent.ownerName,
      ownerEmail: agent.ownerEmail,
      hostedUrl: agent.hostedUrl,
      docsUrl: agent.docsUrl || "",
      status: agent.status,
      featured: agent.featured,
    });
    resetMessages();
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
      if (editingAgentId) {
        await updateAgent(editingAgentId, agentForm, uploaderEmail);
        setSuccessMessage("Agent updated successfully.");
      } else {
        await createAgent(agentForm, uploaderEmail);
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

  async function handleDelete(agentId: string) {
    if (!window.confirm("Delete this agent from the repository?")) {
      return;
    }

    setBusy(true);
    resetMessages();

    try {
      await deleteAgent(agentId, uploaderEmail);
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
      const requests = await getRequests();
      setRequestCount(requests.length);
      setRequestForm(emptyRequestForm);
      setSuccessMessage("Request submitted. Thank you.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit request.");
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
        <article>
          <h2>{agents.length}</h2>
          <p>Total Agents</p>
        </article>
        <article>
          <h2>{activeAgentCount}</h2>
          <p>Active Agents</p>
        </article>
        <article>
          <h2>{featuredAgentCount}</h2>
          <p>Featured Agents</p>
        </article>
        <article>
          <h2>{requestCount}</h2>
          <p>Requested Agents</p>
        </article>
      </section>

      {(errorMessage || successMessage) && (
        <section className={`banner ${errorMessage ? "banner--error" : "banner--success"}`}>
          {errorMessage || successMessage}
        </section>
      )}

      <section className="agents">
        <h2>Available AI Agents</h2>
        <div className="agent-grid">
          {agents.map((agent) => (
            <article key={agent._id} className="agent-card">
              <header>
                <p className="agent-card__dept">{agent.department}</p>
                <h3>{agent.name}</h3>
              </header>
              <p className="agent-card__summary">{agent.summary}</p>
              <p className="agent-card__owner">
                Owner: {agent.ownerName} ({agent.ownerEmail})
              </p>
              <div className="agent-card__tags">
                {agent.tags.map((tag) => (
                  <span key={`${agent._id}-${tag}`}>{tag}</span>
                ))}
              </div>
              <footer>
                <a href={agent.hostedUrl} target="_blank" rel="noreferrer">
                  Launch Agent
                </a>
                {agent.docsUrl ? (
                  <a href={agent.docsUrl} target="_blank" rel="noreferrer">
                    Documentation
                  </a>
                ) : null}
                <button type="button" onClick={() => beginEditing(agent)}>
                  Edit
                </button>
                <button type="button" className="danger" onClick={() => handleDelete(agent._id)}>
                  Delete
                </button>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="forms">
        <form className="panel" onSubmit={handleAgentSubmit}>
          <h2>{editingAgentId ? "Update Existing Agent" : "Upload New Agent"}</h2>
          <p className="panel__hint">
            Allowed users only. Use your Woolpert email listed in the backend allow list.
          </p>

          <label>
            Uploader email
            <input
              required
              type="email"
              value={uploaderEmail}
              onChange={(event) => setUploaderEmail(event.target.value)}
              placeholder="name@woolpert.com"
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
            Summary
            <textarea
              required
              value={agentForm.summary}
              onChange={(event) =>
                setAgentForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </label>
          <label>
            Department
            <input
              required
              value={agentForm.department}
              onChange={(event) =>
                setAgentForm((prev) => ({ ...prev, department: event.target.value }))
              }
            />
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
            Owner name
            <input
              required
              value={agentForm.ownerName}
              onChange={(event) =>
                setAgentForm((prev) => ({ ...prev, ownerName: event.target.value }))
              }
            />
          </label>
          <label>
            Owner email
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
          <label>
            Status
            <select
              value={agentForm.status}
              onChange={(event) =>
                setAgentForm((prev) => ({
                  ...prev,
                  status: event.target.value as AgentInput["status"],
                }))
              }
            >
              <option value="active">Active</option>
              <option value="pilot">Pilot</option>
              <option value="deprecated">Deprecated</option>
            </select>
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
            Agent request title
            <input
              required
              value={requestForm.title}
              onChange={(event) => setRequestForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Automated Scope Writer"
            />
          </label>
          <label>
            Business need
            <textarea
              required
              value={requestForm.businessNeed}
              onChange={(event) =>
                setRequestForm((prev) => ({ ...prev, businessNeed: event.target.value }))
              }
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
    </main>
  );
}

export default App;
