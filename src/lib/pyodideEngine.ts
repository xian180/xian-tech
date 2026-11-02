// ---------------------------------------------------------------------------
// Python execution engine, powered by Pyodide (CPython compiled to
// WebAssembly, running entirely inside the visitor's browser).
//
// This is what makes it possible to run genuine, admin-authored Python
// report scripts from a 100% static site hosted on GitHub Pages: there is
// no server executing code, the visitor's own browser does, via WebAssembly.
//
// Pyodide itself (≈ 10 MB of wasm/js) is loaded on demand from the jsDelivr
// CDN the first time a user generates a report, instead of being bundled
// into the app, which keeps the GitHub Pages build small and fast.
// ---------------------------------------------------------------------------

import type { ReportResult } from "@/types";

const PYODIDE_VERSION = "0.26.3";
const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Minimal typings for the subset of the Pyodide API we use.
interface PyodideInterface {
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    unlink: (path: string) => void;
  };
  loadPackage: (names: string | string[]) => Promise<unknown>;
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { set: (name: string, value: unknown) => void; delete: (name: string) => void };
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

let pyodidePromise: Promise<PyodideInterface> | null = null;

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the Python engine (Pyodide) from the CDN."));
    document.head.appendChild(script);
  });
}

export type EngineProgressCallback = (message: string) => void;

/**
 * Loads and initializes Pyodide plus the Python packages required to process
 * marketplace Excel exports (pandas for analysis, openpyxl/xlrd for reading
 * .xlsx / .xls files). The result is cached so subsequent report runs are
 * instant.
 */
async function getPyodide(onProgress?: EngineProgressCallback): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onProgress?.("Loading Python engine (Pyodide)...");
      await loadScriptOnce(`${PYODIDE_CDN_BASE}pyodide.js`);
      if (!window.loadPyodide) {
        throw new Error("Pyodide failed to initialize in this browser.");
      }
      const pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN_BASE });

      onProgress?.("Loading data analysis libraries (pandas, openpyxl)...");
      await pyodide.loadPackage(["pandas", "micropip"]);
      await pyodide.runPythonAsync(`
import micropip
await micropip.install("openpyxl")
      `);
      return pyodide;
    })().catch((err) => {
      // Allow retrying if initialization failed.
      pyodidePromise = null;
      throw err;
    });
  }
  return pyodidePromise;
}

/** Pre-warms the Python engine so the first real report run feels instant. */
export function preloadEngine(onProgress?: EngineProgressCallback) {
  getPyodide(onProgress).catch(() => {
    /* errors are surfaced when a report is actually generated */
  });
}

const RUNNER_WRAPPER = `
import json
import traceback
import numpy as np
import pandas as pd

def __xiantech_default(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, (pd.Timestamp,)):
        return str(o)
    if hasattr(o, "item"):
        try:
            return o.item()
        except Exception:
            pass
    return str(o)

def __xiantech_run(file_path):
    try:
        result = run_report(file_path)
        if not isinstance(result, dict):
            raise TypeError("run_report() must return a dictionary.")
        result.setdefault("tables", [])
        result.setdefault("charts", [])
        result.setdefault("insights", [])
        result.setdefault("summary", [])
        return json.dumps({"ok": True, "result": result}, default=__xiantech_default)
    except Exception as exc:
        return json.dumps({
            "ok": False,
            "error": str(exc),
            "trace": traceback.format_exc(),
        })
`;

/** Shape returned from executing the wrapped python code. */
interface PyRunOutcome {
  ok: boolean;
  result?: ReportResult;
  error?: string;
  trace?: string;
}

/**
 * Executes an admin-authored report script against an uploaded Excel file.
 *
 * @param pythonCode  The full source of the report's `run_report()` function.
 * @param file        The Excel file uploaded by the user.
 */
export async function runReportScript(
  pythonCode: string,
  file: File,
  onProgress?: EngineProgressCallback
): Promise<ReportResult> {
  const pyodide = await getPyodide(onProgress);

  onProgress?.("Reading uploaded workbook...");
  const buffer = new Uint8Array(await file.arrayBuffer());
  const ext = file.name.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";
  const virtualPath = `/tmp_upload.${ext}`;
  pyodide.FS.writeFile(virtualPath, buffer);

  try {
    if (ext === "xls") {
      await pyodide.loadPackage(["xlrd"]);
    }

    onProgress?.("Running report script...");
    await pyodide.runPythonAsync(`${pythonCode}\n\n${RUNNER_WRAPPER}`);
    const outcomeJson = await pyodide.runPythonAsync(`__xiantech_run(${JSON.stringify(virtualPath)})`);
    const outcome = JSON.parse(outcomeJson as string) as PyRunOutcome;

    if (!outcome.ok || !outcome.result) {
      throw new Error(outcome.error || "The report script failed to run.");
    }

    return {
      ...outcome.result,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    try {
      pyodide.FS.unlink(virtualPath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

/**
 * Runs a report script against a small in-memory sample workbook. Used by
 * the Admin panel's "Test Script" feature so admins can validate a script
 * before activating it for real users.
 */
export async function testReportScript(
  pythonCode: string,
  sampleWorkbookBytes: Uint8Array,
  onProgress?: EngineProgressCallback
): Promise<ReportResult> {
  const pyodide = await getPyodide(onProgress);
  const virtualPath = "/tmp_sample.xlsx";
  pyodide.FS.writeFile(virtualPath, sampleWorkbookBytes);

  try {
    await pyodide.runPythonAsync(`${pythonCode}\n\n${RUNNER_WRAPPER}`);
    const outcomeJson = await pyodide.runPythonAsync(`__xiantech_run(${JSON.stringify(virtualPath)})`);
    const outcome = JSON.parse(outcomeJson as string) as PyRunOutcome;

    if (!outcome.ok || !outcome.result) {
      const detail = outcome.trace || outcome.error || "Unknown error";
      throw new Error(detail);
    }
    return { ...outcome.result, generatedAt: new Date().toISOString() };
  } finally {
    try {
      pyodide.FS.unlink(virtualPath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}
