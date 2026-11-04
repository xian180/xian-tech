// ---------------------------------------------------------------------------
// PDF export of a ReportResult (summary, insights and every table), built
// entirely in the browser with jsPDF. Charts are shown on screen only.
// ---------------------------------------------------------------------------

import type { ReportResult, ReportTable } from "../types";

/** jsPDF's built-in fonts cannot draw the rupee sign, so write "Rs." instead. */
function clean(value: string | number): string {
  return String(value)
    .replace(/₹\s?/g, "Rs. ")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, "");
}

function cell(value: string | number): string {
  return typeof value === "number" ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : clean(value);
}

function fileSafe(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "report";
}

export async function downloadReportAsPdf(result: ReportResult, reportName: string): Promise<void> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(30, 41, 59);
  doc.text(clean(result.title), margin, y + 12);
  y += 30;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 116, 139);
  doc.text(`Xian Tech  |  Generated ${new Date(result.generatedAt).toLocaleString("en-IN")}`, margin, y);
  y += 16;

  if (result.summary.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value", "Notes"]],
      body: result.summary.map((s) => [clean(s.label), cell(s.value), clean(s.helpText ?? "")]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    y = finalY() + 18;
  }

  if (result.insights.length > 0) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(30, 41, 59);
    doc.text("Key Insights", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(51, 65, 85);
    for (const insight of result.insights) {
      const lines = doc.splitTextToSize(`- ${clean(insight)}`, pageW - margin * 2) as string[];
      ensureSpace(lines.length * 12 + 4);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 2;
    }
    y += 10;
  }

  for (const table of result.tables) {
    ensureSpace(60);
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(30, 41, 59);
    doc.text(clean(table.title), margin, y);
    autoTable(doc, {
      startY: y + 6,
      head: [table.columns.map(clean)],
      body: table.rows.map((row) => row.map(cell)),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = finalY() + 20;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 20, { align: "right" });
  }

  doc.save(`${fileSafe(reportName)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** Downloads one table (every row, not just the preview) as a PDF. */
export function downloadTableAsPdf(table: ReportTable, reportName: string): Promise<void> {
  return downloadReportAsPdf(
    {
      title: table.title,
      generatedAt: new Date().toISOString(),
      summary: [],
      tables: [{ ...table, title: `${reportName} - ${table.title}`, previewRows: undefined }],
      charts: [],
      insights: [],
    },
    `${reportName}-${table.title}`
  );
}
