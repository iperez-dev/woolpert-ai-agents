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

export default router;
