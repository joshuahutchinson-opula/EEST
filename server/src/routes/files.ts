import { Router, Request, Response } from "express";
import path from "path";
import { resolveUploadPath, verifyFileSignature } from "../lib/uploads";

const router = Router();

// Types safe to render inline from the API origin. Anything else (HTML, SVG, ...) is forced to
// download so an uploaded file can't run as a page here.
const INLINE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".pdf", ".txt"]);

// GET /api/files/<relative path>?exp=&sig= — no session needed; the signature is the credential
// (see lib/uploads.ts signFileUrl).
router.get("/*", (req: Request, res: Response) => {
  let rel: string;
  try {
    rel = decodeURIComponent(req.path.replace(/^\//, ""));
  } catch {
    return res.status(400).json({ error: "Bad file path" });
  }
  const { exp, sig } = req.query as { exp?: string; sig?: string };
  if (!verifyFileSignature(rel, exp, sig)) return res.status(403).json({ error: "Link expired or invalid" });

  const filePath = resolveUploadPath(`/uploads/${rel}`);
  if (!filePath) return res.status(404).json({ error: "File not found" });

  const inline = INLINE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=600");
  if (!inline) res.attachment(path.basename(filePath));
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: "File not found" });
  });
});

export default router;
