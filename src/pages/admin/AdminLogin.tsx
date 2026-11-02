import { useState } from "react";
import { login } from "@/auth/adminAuth";

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    const ok = await login(password);
    setChecking(false);
    if (ok) onSuccess();
    else setError("Incorrect password. Please try again.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 text-white" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white">Xian Tech Admin</p>
        </div>
        <p className="mt-2 text-sm text-slate-400">Sign in to manage report scripts. This area is not linked from the public site.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400">Admin password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="••••••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={checking || !password}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {checking ? "Checking..." : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-[11px] leading-relaxed text-slate-500">
          Default password: <code className="rounded bg-slate-800 px-1 py-0.5">XianTech@Admin2024</code>. Change it immediately
          after first login from Admin Settings. This client-side gate is suitable for a single trusted operator — see README
          for securing multi-admin production deployments.
        </p>
      </div>
    </div>
  );
}
