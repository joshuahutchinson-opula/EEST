// Node 18 doesn't expose the Web Crypto API as a global the way Node 20+ does,
// but jose's webapi build (loaded dynamically in lib/microsoftAuth.ts) assumes
// globalThis.crypto exists. Polyfill it before anything else runs.
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) {
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as unknown as Crypto;
}

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { initDB } from "./db";
import projectsRouter from "./routes/projects";
import quotesRouter from "./routes/quotes";
import devicesRouter from "./routes/devices";
import installRouter from "./routes/install";
import authRouter from "./routes/auth";
import { authMiddleware } from "./middleware/auth";
import changeOrdersRouter from "./routes/changeOrders";
import auditRouter from "./routes/audit";
import tasksRouter from "./routes/tasks";
import documentsRouter from "./routes/documents";
import notificationsRouter from "./routes/notifications";
import workbookRouter from "./routes/workbook";
import inventoryRouter from "./routes/inventory";
import procurementRouter from "./routes/procurement";
import commissioningRouter from "./routes/commissioning";
import subcontractorsRouter from "./routes/subcontractors";
import projectAssetsRouter from "./routes/project-assets";
import tutorialsRouter from "./routes/tutorials";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://end-to-end-sales-tool-production.up.railway.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", authMiddleware);

app.use("/api/projects", projectsRouter);
app.use("/api/quotes", quotesRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/install", installRouter);
app.use("/api/projects", projectAssetsRouter);
app.use("/api/auth", authRouter);
app.use("/api/change-orders", changeOrdersRouter);
app.use("/api/audit", auditRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/workbook", workbookRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/procurement", procurementRouter);
app.use("/api/commissioning", commissioningRouter);
app.use("/api/subcontractors", subcontractorsRouter);
app.use("/api/users/me/tutorials", tutorialsRouter);

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