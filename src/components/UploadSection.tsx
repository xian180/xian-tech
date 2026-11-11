import { useCallback, useRef, useState } from "react";
import type { UploadedFileInfo } from "@/types";
import { cn } from "@/utils/cn";

interface UploadSectionProps {
  uploadedFile: UploadedFileInfo | null;
  onFileChosen: (file: File) => void;
  onRemove: () => void;
  error: string | null;
  disabled?: boolean;
}

export function UploadSection({ uploadedFile, onFileChosen, onRemove, error, disabled }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFileChosen(files[0]);
    },
    [onFileChosen]
  );

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">1. Upload your marketplace Excel file</h2>
      <p className="mt-1 text-sm text-slate-600">
        Supported formats: .xlsx, .xls — exported from Amazon, Flipkart, AJIO, Meesho, Myntra or similar.
      </p>

      {!uploadedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (!disabled) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
            dragActive ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-indigo-600" stroke="currentColor" strokeWidth={2}>
              <path d="M12 16V4m0 0L7 9m5-5l5 5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">
            Drag &amp; drop your Excel file here, or <span className="text-indigo-600">browse</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Maximum file size: 25 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            disabled={disabled}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-emerald-600" stroke="currentColor" strokeWidth={2}>
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="4" width="18" height="16" rx="2" />
              </svg>
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-medium text-slate-800">{uploadedFile.name}</p>
              <p className="text-xs text-slate-500">
                {uploadedFile.sizeLabel} · {uploadedFile.headers.length} columns detected
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Remove
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={disabled}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
