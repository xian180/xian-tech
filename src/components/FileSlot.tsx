import { useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE } from "@/core/readTable";
import { cn } from "@/utils/cn";

interface FileSlotProps {
  title: string;
  hint: string;
  file: File | null;
  error?: string | null;
  disabled?: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileSlot({ title, hint, file, error, disabled, onFile, onRemove }: FileSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>

      {file ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-emerald-900">{file.name}</p>
            <p className="text-xs text-emerald-700">{sizeLabel(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (!disabled && f) onFile(f);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            drag ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <p className="text-sm font-medium text-slate-700">
            Drag &amp; drop here, or <span className="text-indigo-600">browse</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">.txt, .tsv, .csv, .xlsx or .xls - up to 25 MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
