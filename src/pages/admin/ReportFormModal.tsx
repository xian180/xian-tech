import { useState } from "react";
import CodeEditor from "@uiw/react-textarea-code-editor";
import type { ReportConfig, ReportResult } from "@/types";
import { slugify } from "@/store/reportsStore";
import { buildSampleWorkbookBytes } from "@/lib/excel";
import { testReportScript } from "@/lib/pyodideEngine";
import { ReportView } from "@/components/report/ReportView";

interface ReportFormModalProps {
  initial: ReportConfig | null;
  existingIds: string[];
  nextOrder: number;
  onClose: () => void;
  onSave: (report: ReportConfig) => void;
}

const EMPTY_SCRIPT = `import pandas as pd


def run_report(file_path):
    """
    Required contract:
      - Read the uploaded workbook with pandas: df = pd.read_excel(file_path)
      - Return a dict with keys: summary, tables, charts, insights
      - Never hardcode business logic elsewhere — this function is the
        single source of truth for this report's calculations.
    """
    df = pd.read_excel(file_path)

    return {
        "title": "My New Report",
        "summary": [
            {"label": "Total Rows", "value": len(df)},
        ],
        "tables": [],
        "charts": [],
        "insights": ["Replace this script with your own analysis logic."],
    }
`;

export function ReportFormModal({ initial, existingIds, nextOrder, onClose, onSave }: ReportFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [scriptName, setScriptName] = useState(initial?.scriptName ?? "new_report.py");
  const [requiredColumnsText, setRequiredColumnsText] = useState(initial?.requiredColumns.join(", ") ?? "");
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? nextOrder);
  const [active, setActive] = useState(initial?.active ?? true);
  const [pythonCode, setPythonCode] = useState(initial?.pythonCode ?? EMPTY_SCRIPT);
  const [formError, setFormError] = useState<string | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ReportResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const sample = buildSampleWorkbookBytes();
      const result = await testReportScript(pythonCode, sample);
      setTestResult(result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Unknown error while testing the script.");
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setFormError(null);
    if (!name.trim()) {
      setFormError("Please provide a report name.");
      return;
    }
    if (!pythonCode.includes("def run_report")) {
      setFormError("The Python script must define a `run_report(file_path)` function.");
      return;
    }
    const requiredColumns = requiredColumnsText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (requiredColumns.length === 0) {
      setFormError("Please list at least one required Excel column (comma separated).");
      return;
    }

    const id = initial?.id ?? ensureUniqueId(slugify(name), existingIds);

    onSave({
      id,
      name: name.trim(),
      description: description.trim(),
      scriptName: scriptName.trim() || "report.py",
      pythonCode,
      requiredColumns,
      active,
      displayOrder: Number(displayOrder) || 0,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-8">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{initial ? "Edit Report" : "Add New Report"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-500">Report Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="e.g. Return Report"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Python Script Name</label>
              <input
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="e.g. return_report.py"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="Short description shown to users on the homepage"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-500">Required Excel Columns (comma separated)</label>
              <input
                value={requiredColumnsText}
                onChange={(e) => setRequiredColumnsText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="Order ID, Order Status, Quantity"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Display Order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Active (visible to users on the homepage)
          </label>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-500">
                Python Processing Code — must define <code className="rounded bg-slate-100 px-1">run_report(file_path)</code>
              </label>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {testing ? "Running test..." : "▶ Test Script on sample data"}
              </button>
            </div>
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-300">
              <CodeEditor
                value={pythonCode}
                language="python"
                onChange={(e) => setPythonCode(e.target.value)}
                padding={14}
                minHeight={260}
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 13,
                  backgroundColor: "#0f172a",
                  color: "#e2e8f0",
                }}
              />
            </div>
          </div>

          {testError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-700">Test failed</p>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-red-600">{testError}</pre>
            </div>
          )}
          {testResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="mb-3 text-sm font-semibold text-emerald-700">✓ Test succeeded — preview using sample data</p>
              <ReportView result={testResult} />
            </div>
          )}

          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {initial ? "Save Changes" : "Create Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ensureUniqueId(base: string, existingIds: string[]): string {
  if (!existingIds.includes(base)) return base;
  let i = 2;
  while (existingIds.includes(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}
