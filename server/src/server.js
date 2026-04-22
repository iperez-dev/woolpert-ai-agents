import dotenv from "dotenv";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";

dotenv.config();

const port = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on port ${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start API:", error.message);
    process.exit(1);
  }
}

startServer();
