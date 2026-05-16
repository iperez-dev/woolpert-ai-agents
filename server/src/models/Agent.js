import mongoose from "mongoose";
import { AGENT_DEPARTMENTS, CATALOG_TYPES } from "../constants/agentCatalog.js";

const agentSchema = new mongoose.Schema(
  {
    catalogType: {
      type: String,
      enum: CATALOG_TYPES,
      default: "ai_agent",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      enum: AGENT_DEPARTMENTS,
    },
    tags: {
      type: [String],
      default: [],
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    hostedUrl: {
      type: String,
      required: true,
      trim: true,
    },
    docsUrl: {
      type: String,
      trim: true,
      default: "",
    },
    skillMarkdown: {
      type: String,
      default: "",
      maxlength: 524288,
    },
    skillFileUploaded: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Agent = mongoose.model("Agent", agentSchema);
