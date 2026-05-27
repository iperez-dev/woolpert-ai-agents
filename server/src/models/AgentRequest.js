import mongoose from "mongoose";

const agentRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    department: {
      type: String,
      required: true,
      enum: ["Buildings", "Geospatial", "Infrastructure", "Growth", "Human Resources", "Finance and Legal", "IT"],
    },
    projectType: {
      type: String,
      required: true,
      enum: ["ai_agent", "claude_skill", "plugin"],
    },
    problem: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    currentSolutions: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    businessCase: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    successCriteria: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    requestedBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    requesterEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["new", "reviewing", "planned", "closed"],
      default: "new",
    },
  },
  { timestamps: true }
);

export const AgentRequest = mongoose.model("AgentRequest", agentRequestSchema);
