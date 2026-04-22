import mongoose from "mongoose";

const agentRequestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    businessNeed: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
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
