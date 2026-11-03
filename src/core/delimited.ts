// ---------------------------------------------------------------------------
// Small, dependency-free parser for delimited text files (.txt / .tsv / .csv).
// Amazon "All Orders" and "Returns" reports are tab-separated text files, so
// the delimiter is detected automatically from the header line.
// ---------------------------------------------------------------------------

const CANDIDATE_DELIMITERS = ["\t", ",", ";", "|"];

/** Picks the delimiter that appears most often in the header line. */
export function detectDelimiter(headerLine: string): string {
  let best = ",";
  let bestCount = -1;
  for (const d of CANDIDATE_DELIMITERS) {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/** Parses delimited text into a matrix of strings. Handles quotes and CRLF. */
export function parseDelimited(input: string, delimiter?: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const d = delimiter ?? detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === d) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
