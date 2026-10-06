import { AlertOctagon, AlertTriangle, CheckCircle2, Eye, Info, Satellite, Cpu, User, Radio, Sigma } from "lucide-react";
import { Area, AreaChart, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DataSource, Severity } from "@/lib/astro/types";

const SEV: Record<Severity, { label: string; cls: string; Icon: typeof Info }> = {
  NORMAL: { label: "Normal", cls: "bg-success/12 text-success border-success/25", Icon: CheckCircle2 },
  WATCH: { label: "Watch", cls: "bg-info/12 text-info border-info/25", Icon: Eye },
  MODERATE: { label: "Moderate", cls: "bg-warning/15 text-warning border-warning/30", Icon: AlertTriangle },
  HIGH: { label: "High", cls: "bg-high/15 text-high border-high/30", Icon: AlertTriangle },
  CRITICAL: { label: "Critical", cls: "bg-critical/15 text-critical border-critical/30", Icon: AlertOctagon },
};

export const sevTone = (s: Severity) => SEV[s];

export function SeverityBadge({ severity, label, className }: { severity: Severity; label?: string; className?: string }) {
  const { cls, Icon, label: l } = SEV[severity];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", cls, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label ?? l}
    </span>
  );
}

const SRC: Record<DataSource, typeof Info> = {
  "Wearable Sensor": Radio,
  "Simulated Sensor": Cpu,
  "NASA Data": Satellite,
  "Self Report": User,
  "Derived Metric": Sigma,
  "Environmental Telemetry": Satellite,
};

export function SourceTag({ source, simulated }: { source: DataSource; simulated?: boolean }) {
  const Icon = SRC[source];
  const label = simulated && source === "Wearable Sensor" ? "Simulated Sensor" : source;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: ReactNode; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-1 text-3xl font-semibold text-foreground md:text-4xl">{title}</h1>
        <p className="mt-1.5 text-base text-muted-foreground">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, eyebrow, action, children, className }: { title?: ReactNode; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("panel p-5", className)}>
      {(title || eyebrow) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className="mt-0.5 text-lg font-semibold text-foreground">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Sparkline({ data, baseline, tone = "var(--color-chart-1)" }: { data: number[]; baseline?: [number, number]; tone?: string }) {
  const pts = data.slice(-24).map((v, i) => ({ i, v }));
  const min = Math.min(...pts.map((p) => p.v), baseline?.[0] ?? Infinity);
  const max = Math.max(...pts.map((p) => p.v), baseline?.[1] ?? -Infinity);
  const pad = (max - min) * 0.15 || 1;
  return (
    <div className="h-12 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pts} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
          <YAxis hide domain={[min - pad, max + pad]} />
          {baseline && <ReferenceArea y1={baseline[0]} y2={baseline[1]} fill="var(--color-success)" fillOpacity={0.09} stroke="none" />}
          <Line type="monotone" dataKey="v" stroke={tone} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ data, baseline, labels, unit, height = 240, tone = "var(--color-chart-1)" }: { data: number[]; baseline: [number, number]; labels: string[]; unit: string; height?: number; tone?: string }) {
  const pts = data.map((v, i) => ({ t: labels[i], v: Number(v.toFixed(2)) }));
  const min = Math.min(...data, baseline[0]);
  const max = Math.max(...data, baseline[1]);
  const pad = (max - min) * 0.15 || 1;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="tg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity={0.28} />
              <stop offset="100%" stopColor={tone} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} interval={7} />
          <YAxis domain={[Math.floor(min - pad), Math.ceil(max + pad)]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
          <ReferenceArea y1={baseline[0]} y2={baseline[1]} fill="var(--color-success)" fillOpacity={0.08} stroke="var(--color-success)" strokeOpacity={0.25} strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12, color: "var(--color-foreground)" }}
            formatter={(v: number) => [`${v} ${unit}`, "Value"]}
          />
          <Area type="monotone" dataKey="v" stroke={tone} strokeWidth={2.2} fill="url(#tg)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
