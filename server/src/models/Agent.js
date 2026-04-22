import mongoose from "mongoose";

const agentSchema = new mongoose.Schema(
  {
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
      maxlength: 100,
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
    status: {
      type: String,
      enum: ["active", "pilot", "deprecated"],
      default: "active",
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Agent = mongoose.model("Agent", agentSchema);
