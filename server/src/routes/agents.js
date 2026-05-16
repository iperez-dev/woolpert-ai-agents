import { Router } from "express";
import { Agent } from "../models/Agent.js";
import { AGENT_DEPARTMENTS, CATALOG_TYPES } from "../constants/agentCatalog.js";
import { canManageAgents } from "../middleware/canManageAgents.js";

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

router.get("/", async (_req, res, next) => {
  try {
    const agents = await Agent.find().sort({ featured: -1, createdAt: -1 });
    res.json(agents);
  } catch (error) {
    next(error);
  }
});

router.post("/", canManageAgents, async (req, res, next) => {
  try {
    const payload = pickAgentPayload(req.body);
    const validationError = validateAgentPayload(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const createdAgent = await Agent.create(payload);
    res.status(201).json(createdAgent);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", canManageAgents, async (req, res, next) => {
  try {
    const payload = pickAgentPayload(req.body);
    const validationError = validateAgentPayload(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const updatedAgent = await Agent.findByIdAndUpdate(req.params.id, payload, {
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
