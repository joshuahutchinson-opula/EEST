import path from "path";
import fs from "fs";

// Where uploaded files live on disk. Set UPLOAD_DIR to a persistent volume mount in production
// (the container filesystem is wiped on every redeploy); defaults to the original src/dist
// "uploads" folder for local dev.
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "..", "uploads");

export const DOCUMENTS_DIR = path.join(UPLOAD_ROOT, "documents");
fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });

// Stored file URLs look like "/uploads/documents/xyz.jpg". Returns the on-disk path, or null if
// the URL isn't an upload or would escape the upload root.
export function resolveUploadPath(fileUrl: string): string | null {
  const match = /^\/?uploads\/(.+)$/.exec(fileUrl.split(/[?#]/)[0]);
  if (!match) return null;
  const resolved = path.resolve(UPLOAD_ROOT, match[1]);
  if (!resolved.startsWith(UPLOAD_ROOT + path.sep)) return null;
  return resolved;
}
