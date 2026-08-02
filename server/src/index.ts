import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { initDB } from "./db";
import projectsRouter from "./routes/projects";
import quotesRouter from "./routes/quotes";
import devicesRouter from "./routes/devices";
import installRouter from "./routes/install";
import canvasRouter from "./routes/canvas";
import authRouter from "./routes/auth";
import changeOrdersRouter from "./routes/changeOrders";
import auditRouter from "./routes/audit";
import tasksRouter from "./routes/tasks";
import documentsRouter from "./routes/documents";
import notificationsRouter from "./routes/notifications";
import workbookRouter from "./routes/workbook";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://end-to-end-sales-tool-production.up.railway.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/projects", projectsRouter);
app.use("/api/quotes", quotesRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/install", installRouter);
app.use("/api/canvas", canvasRouter);
app.use("/api/auth", authRouter);
app.use("/api/change-orders", changeOrdersRouter);
app.use("/api/audit", auditRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/workbook", workbookRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
