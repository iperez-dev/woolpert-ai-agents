import { Router } from "express";
import { Agent } from "../models/Agent.js";
import { AGENT_DEPARTMENTS, CATALOG_TYPES } from "../constants/agentCatalog.js";
import { canManageAgents } from "../middleware/canManageAgents.js";
import { validateClaudeSkillMarkdown } from "../utils/validateClaudeSkillMarkdown.js";

const router = Router();

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function pickAgentPayload(body) {
  const catalogType =
    body.catalogType === undefined || body.catalogType === null || body.catalogType === ""
      ? "ai_agent"
      : body.catalogType;

  return {
    catalogType,
    name: body.name,
    summary: body.summary,
    department: body.department,
    tags: normalizeTags(body.tags),
    ownerName: body.ownerName,
    ownerEmail: body.ownerEmail,
    hostedUrl: body.hostedUrl,
    docsUrl: typeof body.docsUrl === "string" ? body.docsUrl.trim() : "",
    featured: Boolean(body.featured),
    skillMarkdown: typeof body.skillMarkdown === "string" ? body.skillMarkdown : "",
    skillSourceFileName:
      typeof body.skillSourceFileName === "string" ? body.skillSourceFileName.trim() : "",
  };
}

function validateAgentPayload(payload) {
  if (!CATALOG_TYPES.includes(payload.catalogType)) {
    return `Invalid catalog type.`;
  }
  if (!AGENT_DEPARTMENTS.includes(payload.department)) {
    return `Invalid department.`;
  }
  return null;
}

/**
 * Resolves skill markdown storage + validation for Claude skills; clears for AI agents.
 */
function finalizeSkillFields(picked, existing, isCreate) {
  const { skillSourceFileName, ...payload } = picked;

  if (payload.catalogType === "ai_agent") {
    payload.skillMarkdown = "";
    payload.skillFileUploaded = false;
    return { payload };
  }

  const incoming = picked.skillMarkdown;
  const hasIncoming = typeof incoming === "string" && incoming.trim() !== "";
  let md = "";
  if (hasIncoming) {
    md = incoming;
  } else if (existing?.skillMarkdown && String(existing.skillMarkdown).trim() !== "") {
    md = existing.skillMarkdown;
  }

  if (!md.trim()) {
    return {
      error: isCreate
        ? "Claude Skill requires a valid SKILL.md file with YAML frontmatter (name and description)."
        : "Claude Skill requires a SKILL.md file. Upload one or keep the existing skill document.",
    };
  }

  if (hasIncoming && skillSourceFileName && !skillSourceFileName.toLowerCase().endsWith(".md")) {
    return { error: "Skill uploads must use a .md file extension." };
  }

  const validated = validateClaudeSkillMarkdown(md);
  if (!validated.ok) {
    return { error: validated.message };
  }

  payload.skillMarkdown = md;
  payload.skillFileUploaded = true;
  return { payload };
}

router.get("/", async (_req, res, next) => {
  try {
    const agents = await Agent.find()
      .sort({ featured: -1, createdAt: -1 })
      .select("-skillMarkdown")
      .lean();
    res.json(agents);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found." });
    }
    res.json(agent);
  } catch (error) {
    next(error);
  }
});

router.post("/", canManageAgents, async (req, res, next) => {
  try {
    const picked = pickAgentPayload(req.body);
    const validationError = validateAgentPayload(picked);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const finalized = finalizeSkillFields(picked, null, true);
    if (finalized.error) {
      return res.status(400).json({ message: finalized.error });
    }

    const createdAgent = await Agent.create(finalized.payload);
    res.status(201).json(createdAgent);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", canManageAgents, async (req, res, next) => {
  try {
    const picked = pickAgentPayload(req.body);
    const validationError = validateAgentPayload(picked);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existingAgent = await Agent.findById(req.params.id);
    if (!existingAgent) {
      return res.status(404).json({ message: "Agent not found." });
    }

    const finalized = finalizeSkillFields(picked, existingAgent, false);
    if (finalized.error) {
      return res.status(400).json({ message: finalized.error });
    }

    const updatedAgent = await Agent.findByIdAndUpdate(req.params.id, finalized.payload, {
      new: true,
      runValidators: true,
    });

    if (!updatedAgent) {
      return res.status(404).json({ message: "Agent not found." });
    }

    res.json(updatedAgent);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", canManageAgents, async (req, res, next) => {
  try {
    const removedAgent = await Agent.findByIdAndDelete(req.params.id);

    if (!removedAgent) {
      return res.status(404).json({ message: "Agent not found." });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
