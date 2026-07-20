import { Request, Response, NextFunction } from "express";

// Stubbed auth middleware — passes through all requests
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // TODO: Verify JWT token from Authorization header
  // const token = req.headers.authorization?.replace("Bearer ", "");
  // if (!token) return res.status(401).json({ error: "Unauthorized" });
  next();
}