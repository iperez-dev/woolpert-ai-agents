import { Router } from "express";
import { AgentRequest } from "../models/AgentRequest.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const requests = await AgentRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const createdRequest = await AgentRequest.create(req.body);
    res.status(201).json(createdRequest);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const updated = await AgentRequest.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Request not found." });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await AgentRequest.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Request not found." });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
