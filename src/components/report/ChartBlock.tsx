import { useEffect, useId, useRef, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { ReportChart } from "@/types";
import { formatMoney } from "@/core/format";
import { SLICE_COLORS, TONES, compact, formatValue } from "./theme";

const GRID = "#e2e8f0";
const AXIS = { fontSize: 11, fill: "#64748b" };

function TooltipBox({ active, payload, label, unit }: { active?: boolean; payload?: any[]; label?: string; unit?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1 font-semibold text-slate-800">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill || p.fill }} />
          {p.name}: <span className="font-semibold text-slate-900">{formatValue(Number(p.value), p.name?.includes("%") ? "%" : unit)}</span>
        </p>
      ))}
    </div>
  );
}

function Gradient({ id, from, to, horizontal }: { id: string; from: string; to: string; horizontal?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={horizontal ? "1" : "0"} y2={horizontal ? "0" : "1"}>
      <stop offset="0%" stopColor={from} />
      <stop offset="100%" stopColor={to} />
    </linearGradient>
  );
}

function TreemapCell(props: any) {
  const { x, y, width, height, index, name, value } = props;
  if (!width || !height || index === undefined) return null;
  const fill = SLICE_COLORS[index % SLICE_COLORS.length];
  const showText = width > 56 && height > 38;
  const maxChars = Math.max(3, Math.floor((width - 18) / 7.6));
  const label = String(name);
  const shown = label.length > maxChars ? label.slice(0, maxChars - 1) + "…" : label;
  // Always try the full amount (₹26,813.00); use a smaller font in narrow boxes, a short form (₹26.8k) only if it cannot fit.
  const fullFits = width >= 66;
  const amount = fullFits ? formatMoney(Number(value)) : `₹${compact(Number(value))}`;
  const amountSize = width >= 100 ? 11 : 9.5;
  // stroke="none": the chart's white box border must not be inherited by the text (it made it look bold).
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} fill={fill} stroke="#fff" strokeWidth={3} opacity={0.95} />
      {showText && (
        <>
          <text x={x + 10} y={y + 20} fill="#fff" stroke="none" fontSize={12} fontWeight={600} style={{ pointerEvents: "none" }}>
            {shown}
          </text>
          <text x={x + 10} y={y + 37} fill="#fff" stroke="none" fontSize={amountSize} fontWeight={400} style={{ pointerEvents: "none" }}>
            {amount}
          </text>
        </>
      )}
    </g>
  );
}

/** Donut / pie with a legend that moves below the ring when the card is narrow (phones). */
function DonutBlock({ chart, rows, first }: { chart: ReportChart; rows: Record<string, string | number>[]; first: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 260 });
  const narrow = size.w < 440;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isDonut = chart.type === "donut";
  const total = chart.series[0]?.data.reduce((s, v) => s + v, 0) ?? 0;
  const valueByName = new Map(rows.map((r) => [String(r.name), Number(r[first] ?? 0)]));
  // Wide: ring keeps its default spot (left of the legend). Narrow: legend sits below, so use exact pixels.
  const cx: string | number = narrow ? Math.round(size.w / 2) : "38%";
  const cy: string | number = narrow ? Math.round(size.h * 0.36) : "47%";

  return (
    <div ref={ref} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<TooltipBox unit={chart.unit} />} />
          <Pie
            data={rows}
            dataKey={first}
            nameKey="name"
            {...(narrow ? { cx: cx, cy: cy } : {})}
            innerRadius={isDonut ? "58%" : 0}
            outerRadius={narrow ? "72%" : "88%"}
            paddingAngle={isDonut ? 3 : 1}
            cornerRadius={isDonut ? 6 : 0}
            stroke="#fff"
            strokeWidth={2}
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
            ))}
          </Pie>
          {isDonut && (
            <>
              <text x={cx} y={cy} textAnchor="middle" fill="#0f172a" fontSize={22} fontWeight={700}>
                {compact(total)}
              </text>
              <text x={cx} y={cy} dy={18} textAnchor="middle" fill="#64748b" fontSize={11}>
                total
              </text>
            </>
          )}
          <Legend
            layout={narrow ? "horizontal" : "vertical"}
            align={narrow ? "center" : "right"}
            verticalAlign={narrow ? "bottom" : "middle"}
            iconType="circle"
            wrapperStyle={{ fontSize: 12, lineHeight: "22px" }}
            itemSorter={null}
            formatter={(value: string) => {
              const v = valueByName.get(String(value)) ?? 0;
              const share = total > 0 ? (v / total) * 100 : 0;
              const pct = share > 0 && share < 1 ? "<1%" : `${Math.round(share)}%`;
              return (
                <span className="text-slate-600">
                  {value} <span className="font-semibold text-slate-900">{pct}</span>
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderChart(chart: ReportChart, uid: string) {
  const tone = TONES[chart.color ?? "indigo"];
  const rows = chart.labels.map((label, i) => {
    const row: Record<string, string | number> = { name: String(label) };
    chart.series.forEach((s) => {
      row[s.name] = s.data[i] ?? 0;
    });
    return row;
  });
  const first = chart.series[0]?.name ?? "value";
  const tick = (v: number) => (chart.unit === "₹" ? `₹${compact(v)}` : chart.unit === "%" ? `${v}%` : compact(v));

  switch (chart.type) {
    case "hbar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }}>
            <defs>
              <Gradient id={`${uid}-h`} from={tone.light} to={tone.main} horizontal />
            </defs>
            <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
            <XAxis type="number" tick={AXIS} tickFormatter={tick} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={76} tick={{ ...AXIS, fill: "#334155" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: tone.soft }} content={<TooltipBox unit={chart.unit} />} />
            <Bar dataKey={first} radius={[0, 8, 8, 0]} fill={`url(#${uid}-h)`} barSize={16}
              label={{ position: "right", fontSize: 11, fill: "#475569", formatter: (v: any) => formatValue(Number(v), chart.unit) }} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
            <defs>
              <Gradient id={`${uid}-a`} from={tone.main} to={tone.light} />
              <Gradient id={`${uid}-b`} from={TONES.rose.main} to={TONES.rose.light} />
              <Gradient id={`${uid}-c`} from={TONES.teal.main} to={TONES.teal.light} />
            </defs>
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={52} />
            <YAxis tick={AXIS} tickFormatter={tick} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: tone.soft }} content={<TooltipBox unit={chart.unit} />} />
            {chart.series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
            {chart.series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} radius={[6, 6, 0, 0]} maxBarSize={26} fill={`url(#${uid}-${["a", "b", "c"][i % 3]})`} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} tickFormatter={tick} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipBox unit={chart.unit} />} />
            {chart.series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
            {chart.series.map((s, i) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={SLICE_COLORS[i % SLICE_COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case "pareto":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 4, left: -8 }}>
            <defs>
              <Gradient id={`${uid}-p`} from={tone.main} to={tone.light} />
              <Gradient id={`${uid}-pa`} from={TONES.amber.light} to="#ffffff" />
            </defs>
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={52} />
            <YAxis yAxisId="l" tick={AXIS} tickFormatter={tick} axisLine={false} tickLine={false} />
            <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={AXIS} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipBox unit={chart.unit} />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="l" dataKey={chart.series[0]?.name} radius={[6, 6, 0, 0]} maxBarSize={28} fill={`url(#${uid}-p)`} />
            <Area yAxisId="r" type="monotone" dataKey={chart.series[1]?.name} stroke="none" fill={`url(#${uid}-pa)`} fillOpacity={0.5} legendType="none" tooltipType="none" />
            <Line yAxisId="r" type="monotone" dataKey={chart.series[1]?.name} stroke={TONES.amber.main} strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      );

    case "pie":
    case "donut":
      return <DonutBlock chart={chart} rows={rows} first={first} />;

    case "treemap":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={chart.labels.map((l, i) => ({ name: String(l), size: chart.series[0]?.data[i] ?? 0 }))}
            dataKey="size"
            stroke="#fff"
            isAnimationActive={false}
            content={<TreemapCell />}
          >
            <Tooltip content={<TooltipBox unit={chart.unit} />} />
          </Treemap>
        </ResponsiveContainer>
      );

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 20, left: -4 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={chart.xLabel ?? "x"} tick={AXIS} axisLine={false} tickLine={false}
              label={{ value: chart.xLabel, position: "insideBottom", offset: -12, fontSize: 11, fill: "#64748b" }} />
            <YAxis type="number" dataKey="y" name={chart.yLabel ?? "y"} tick={AXIS} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
            <ZAxis type="number" dataKey="z" range={[60, 380]} name="Returned units" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }: any) =>
                active && payload?.length ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="mb-1 font-semibold text-slate-800">{payload[0].payload.name}</p>
                    <p className="text-slate-600">Units sold: <b className="text-slate-900">{payload[0].payload.x}</b></p>
                    <p className="text-slate-600">Return ratio: <b className="text-slate-900">{payload[0].payload.y}%</b></p>
                    <p className="text-slate-600">Returned units: <b className="text-slate-900">{payload[0].payload.z}</b></p>
                  </div>
                ) : null
              }
            />
            {chart.referenceY !== undefined && (
              <ReferenceLine y={chart.referenceY} stroke={TONES.amber.main} strokeDasharray="5 4"
                label={{ value: `${chart.referenceLabel ?? "Avg"} ${chart.referenceY}%`, position: "insideTopLeft", fontSize: 11, fill: TONES.amber.text }} />
            )}
            <Scatter data={chart.points ?? []} fill={tone.main} fillOpacity={0.6} stroke={tone.main} />
          </ScatterChart>
        </ResponsiveContainer>
      );
  }
}

export function ChartBlock({ chart }: { chart: ReportChart }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tone = TONES[chart.color ?? "indigo"];
  const empty = chart.type === "scatter" ? (chart.points ?? []).length === 0 : chart.labels.length === 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-8 w-1.5 shrink-0 rounded-full" style={{ background: `linear-gradient(${tone.main}, ${tone.light})` }} />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{chart.title}</h3>
          {chart.subtitle && <p className="text-xs text-slate-500">{chart.subtitle}</p>}
        </div>
      </div>
      <div className="mt-3 h-72 w-full">
        {empty ? <p className="flex h-full items-center justify-center text-sm text-slate-400">No data to chart.</p> : renderChart(chart, uid)}
      </div>
    </div>
  );
}
