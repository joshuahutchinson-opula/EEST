import path from "path";
import fs from "fs";
import crypto from "crypto";

// Where uploaded files live on disk. Set UPLOAD_DIR to a persistent volume mount in production
// (the container filesystem is wiped on every redeploy); defaults to the original src/dist
// "uploads" folder for local dev.
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "..", "uploads");

export const DOCUMENTS_DIR = path.join(UPLOAD_ROOT, "documents");
fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });

// Files are stored in the database as "/uploads/<relative path>" and handed to clients as
// short-lived signed "/api/files/<relative path>?exp=&sig=" URLs (see routes/files.ts), since
// <img src> can't send a bearer token. Clients echo signed URLs back on writes (e.g. appending a
// photo to an existing list), so every write path normalizes them with toStoredFileUrl.

// Relative path inside the upload root for either URL shape, or null for anything else
// (e.g. an external link).
function uploadRelativePath(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url, "http://local").pathname;
  } catch {
    return null;
  }
  const match = /^\/(?:uploads|api\/files)\/(.+)$/.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

// Returns the on-disk path for a stored or signed file URL, or null if it isn't an upload or
// would escape the upload root.
export function resolveUploadPath(fileUrl: string): string | null {
  const rel = uploadRelativePath(fileUrl);
  if (!rel) return null;
  const resolved = path.resolve(UPLOAD_ROOT, rel);
  if (!resolved.startsWith(UPLOAD_ROOT + path.sep)) return null;
  return resolved;
}

export function toStoredFileUrl(url: string): string {
  const rel = uploadRelativePath(url);
  return rel ? `/uploads/${rel}` : url;
}

export function toStoredFileUrls(urls: unknown): string[] | undefined {
  return Array.isArray(urls) ? urls.filter((u): u is string => typeof u === "string").map(toStoredFileUrl) : undefined;
}

const FILE_URL_TTL_SECONDS = 60 * 60;
// Expiries are rounded up to this bucket so the same file gets the same URL for a while,
// letting the browser cache images across page loads.
const FILE_URL_BUCKET_SECONDS = 10 * 60;

function fileUrlSignature(rel: string, exp: number): string {
  const secret = process.env.SESSION_JWT_SECRET || "insecure-dev-only-secret-set-SESSION_JWT_SECRET";
  return crypto.createHmac("sha256", secret).update(`file-url:${rel}:${exp}`).digest("base64url");
}

export function signFileUrl<T extends string | null | undefined>(url: T): T | string {
  if (typeof url !== "string") return url;
  const rel = uploadRelativePath(url);
  if (!rel) return url;
  const now = Math.floor(Date.now() / 1000);
  const exp = Math.ceil((now + FILE_URL_TTL_SECONDS) / FILE_URL_BUCKET_SECONDS) * FILE_URL_BUCKET_SECONDS;
  const encoded = rel.split("/").map(encodeURIComponent).join("/");
  return `/api/files/${encoded}?exp=${exp}&sig=${fileUrlSignature(rel, exp)}`;
}

export function signFileUrls(urls: unknown): string[] {
  return Array.isArray(urls) ? urls.filter((u): u is string => typeof u === "string").map((u) => signFileUrl(u)) : [];
}

export function verifyFileSignature(rel: string, exp: string | undefined, sig: string | undefined): boolean {
  const expNum = Number(exp);
  if (!sig || !Number.isInteger(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(fileUrlSignature(rel, expNum));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
