import { Router } from "express";
import { Agent } from "../models/Agent.js";
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
    const payload = {
      ...req.body,
      tags: normalizeTags(req.body.tags),
    };

    const createdAgent = await Agent.create(payload);
    res.status(201).json(createdAgent);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", canManageAgents, async (req, res, next) => {
  try {
    const updatedAgent = await Agent.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        tags: normalizeTags(req.body.tags),
      },
      { new: true, runValidators: true }
    );

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
