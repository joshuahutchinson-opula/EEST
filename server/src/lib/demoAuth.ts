import bcrypt from "bcrypt";

// A single hardcoded demo account for showing the app to people outside the
// organization — entirely separate from Microsoft SSO. Both env vars must be
// set for this login path to be usable.
const DEMO_USERNAME = process.env.DEMO_USERNAME;
const DEMO_PASSWORD_HASH = process.env.DEMO_PASSWORD_HASH;

export function isDemoAuthConfigured(): boolean {
  return Boolean(DEMO_USERNAME && DEMO_PASSWORD_HASH);
}

export async function verifyDemoCredentials(username: string, password: string): Promise<boolean> {
  if (!DEMO_USERNAME || !DEMO_PASSWORD_HASH) return false;
  // Always run bcrypt.compare, even on a username mismatch, so a wrong username
  // and a wrong password take the same amount of time to reject.
  const passwordOk = await bcrypt.compare(password, DEMO_PASSWORD_HASH).catch(() => false);
  return username === DEMO_USERNAME && passwordOk;
}
