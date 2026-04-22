import cors from "cors";
import express from "express";
import agentsRouter from "./routes/agents.js";
import requestsRouter from "./routes/requests.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/agents", agentsRouter);
app.use("/api/requests", requestsRouter);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed.",
      details: Object.values(err.errors).map((entry) => entry.message),
    });
  }

  return res.status(500).json({ message: "Unexpected server error." });
});

export default app;
