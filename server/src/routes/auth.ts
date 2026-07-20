import { Router, Request, Response } from "express";

const router = Router();

// POST /api/auth/login (stubbed)
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  // Stubbed — accepts any credentials for now
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  res.json({
    token: "stub-jwt-token",
    user: { email, name: "Marcus Webb", initials: "MW" },
  });
});

// POST /api/auth/register (stubbed)
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  res.status(201).json({
    token: "stub-jwt-token",
    user: { email, name: name || "New User", initials: (name || "NU").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() },
  });
});

export default router;