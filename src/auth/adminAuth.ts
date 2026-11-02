// ---------------------------------------------------------------------------
// Admin authentication.
//
// *** IMPORTANT SECURITY NOTE (read this before using in production) ***
// Xian Tech's frontend is a 100% static site (designed to run on GitHub
// Pages), which has no server and cannot keep real secrets. This module
// therefore implements a *client-side* password gate: it only hides the
// admin UI from casual visitors and prevents the report configuration
// screen from being stumbled upon by normal users.
//
// It is NOT equivalent to real server-side authentication:
//   - The password hash and the "is logged in" flag live in this browser.
//   - Anyone with developer tools and motivation could bypass this gate
//     client-side (e.g. by calling setSession(true) directly).
//
// For a production deployment with multiple admins / real access control,
// replace this module with calls to a small authenticated backend (for
// example: Cloudflare Workers + Access, a Supabase Edge Function, or any
// serverless function behind real auth) that stores report definitions and
// gates write-access server-side, while keeping the rest of the app (the
// `ReportConfig` data shape and the Pyodide execution engine) unchanged.
// See README.md -> "Security & Production Notes" for more detail.
// ---------------------------------------------------------------------------

const PASSWORD_HASH_KEY = "xiantech_admin_pw_hash";
const SESSION_KEY = "xiantech_admin_session";

/** SHA-256 hash of the default admin password: "XianTech@Admin2024" */
const DEFAULT_PASSWORD_HASH = "40ab91c241d7378eabad4b9c59fc84fe4fd3a86358e868735b3bc9dbb07ff581";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getStoredHash(): string {
  return localStorage.getItem(PASSWORD_HASH_KEY) || DEFAULT_PASSWORD_HASH;
}

export async function login(password: string): Promise<boolean> {
  const hash = await sha256Hex(password);
  const ok = hash === getStoredHash();
  if (ok) sessionStorage.setItem(SESSION_KEY, "true");
  return ok;
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  const currentHash = await sha256Hex(currentPassword);
  if (currentHash !== getStoredHash()) return false;
  if (newPassword.length < 8) return false;
  const newHash = await sha256Hex(newPassword);
  localStorage.setItem(PASSWORD_HASH_KEY, newHash);
  return true;
}

export function hasCustomPassword(): boolean {
  return localStorage.getItem(PASSWORD_HASH_KEY) !== null;
}
