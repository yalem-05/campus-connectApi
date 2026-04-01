import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import { initDatabase, createTables, seedDefaultData } from "./config/database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "School Management System API is running" });
});

async function startServer() {
  try {
    console.log("Initializing database...");
    await initDatabase();
    console.log("Creating tables...");
    await createTables();
    console.log("Seeding default data...");
    await seedDefaultData();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

startServer();

export default app;