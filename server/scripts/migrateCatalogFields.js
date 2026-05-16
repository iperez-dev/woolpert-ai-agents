/**
 * One-time migration: default catalogType for legacy docs; remove deprecated status field.
 * Run from repo: cd server && npm run migrate:catalog
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI is not set in server/.env");
  process.exit(1);
}

await mongoose.connect(uri);
const coll = mongoose.connection.collection("agents");

const typeResult = await coll.updateMany(
  { $or: [{ catalogType: { $exists: false } }, { catalogType: null }, { catalogType: "" }] },
  { $set: { catalogType: "ai_agent" } }
);

const unsetResult = await coll.updateMany({ status: { $exists: true } }, { $unset: { status: "" } });

console.log(`Set catalogType on ${typeResult.modifiedCount} document(s).`);
console.log(`Removed status from ${unsetResult.modifiedCount} document(s).`);

await mongoose.disconnect();
