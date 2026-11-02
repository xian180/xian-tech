import { useState } from "react";
import type { ReportConfig } from "@/types";
import { useAllReports, upsertReport, deleteReport, toggleActive, resetToDefaults } from "@/store/reportsStore";
import { ReportFormModal } from "./ReportFormModal";
import { changePassword, logout } from "@/auth/adminAuth";

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const reports = useAllReports();
  const [editing, setEditing] = useState<ReportConfig | null | "new">(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const sorted = [...reports].sort((a, b) => a.displayOrder - b.displayOrder);
  const maxOrder = reports.reduce((m, r) => Math.max(m, r.displayOrder), 0);

  function handleSave(report: ReportConfig) {
    upsertReport(report);
    setEditing(null);
  }

  function handleLogout() {
    logout();
    onLogout();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-lg font-semibold text-slate-900">Xian Tech — Admin</p>
            <p className="text-xs text-slate-400">Manage report scripts available to end users</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="#/" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              View site
            </a>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Settings
            </button>
            <button onClick={handleLogout} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
            <p className="text-sm text-slate-500">
              Activating a report makes it instantly visible on the homepage — no code changes required.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm("Reset all reports to the built-in defaults? This will discard any custom edits.")) {
                  resetToDefaults();
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Reset to defaults
            </button>
            <button
              onClick={() => setEditing("new")}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              + Add New Report
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Script</th>
                <th className="px-4 py-3">Required Columns</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((report) => (
                <tr key={report.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-400">{report.displayOrder}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{report.name}</p>
                    <p className="max-w-xs truncate text-xs text-slate-400">{report.description}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{report.scriptName}</td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {report.requiredColumns.map((c) => (
                        <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(report.id)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        report.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {report.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(report.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(report)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(report.id)}
                        className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                    No reports configured yet. Click "Add New Report" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <ReportFormModal
          initial={editing === "new" ? null : editing}
          existingIds={reports.map((r) => r.id)}
          nextOrder={maxOrder + 1}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDeleteDialog
          reportName={reports.find((r) => r.id === confirmDeleteId)?.name ?? ""}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            deleteReport(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
        />
      )}

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function ConfirmDeleteDialog({ reportName, onCancel, onConfirm }: { reportName: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">Delete "{reportName}"?</h3>
        <p className="mt-2 text-sm text-slate-500">
          This will remove the report and its Python script permanently. This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirmNext) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    const ok = await changePassword(current, next);
    if (ok) {
      setMessage({ type: "success", text: "Password updated successfully." });
      setCurrent("");
      setNext("");
      setConfirmNext("");
    } else {
      setMessage({ type: "error", text: "Current password is incorrect, or the new password is too short (min 8 characters)." });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Admin Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Current password</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">New password (min. 8 characters)</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Confirm new password</label>
            <input
              type="password"
              value={confirmNext}
              onChange={(e) => setConfirmNext(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          {message && (
            <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>{message.text}</p>
          )}
          <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            Update password
          </button>
        </form>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          Remember: this password only gates this browser's admin UI. See README for notes on securing a real multi-admin
          deployment.
        </p>
      </div>
    </div>
  );
}
