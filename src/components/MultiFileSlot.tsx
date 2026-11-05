import { useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE } from "@/core/readTable";
import { cn } from "@/utils/cn";

interface MultiFileSlotProps {
  title: string;
  hint: string;
  files: File[];
  error?: string | null;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Like FileSlot, but takes several files (for example one payment file per month). */
export function MultiFileSlot({ title, hint, files, error, disabled, onFiles, onRemove }: MultiFileSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-emerald-900">{f.name}</p>
                <p className="text-xs text-emerald-700">{sizeLabel(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={disabled}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const list = Array.from(e.dataTransfer.files ?? []);
          if (!disabled && list.length > 0) onFiles(list);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center transition-colors",
          files.length > 0 ? "py-4" : "py-8",
          drag ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <p className="text-sm font-medium text-slate-700">
          {files.length > 0 ? "Add more files: " : "Drag & drop here, or "}
          <span className="text-indigo-600">browse</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">.xlsx or .xls - up to 25 MB each, several files allowed</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          if (list.length > 0) onFiles(list);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
