import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { METRICS, baselineDelta, baselineStatus, formatValue, trendOf } from "@/lib/astro/metrics";
import { useAstro, clockLabel } from "@/lib/astro/store";
import type { MetricKey, Severity } from "@/lib/astro/types";
import { SeverityBadge, SourceTag, Sparkline } from "./primitives";

export function metricSeverity(key: MetricKey, v: number): Severity {
  const st = baselineStatus(key, v);
  if (st === "Within baseline") return "NORMAL";
  const def = METRICS[key];
  const bad = (st === "Above baseline" && def.worse !== "low") || (st === "Below baseline" && def.worse !== "high");
  if (!bad) return "NORMAL";
  const [lo, hi] = def.baseline;
  const d = v > hi ? (v - hi) / (hi - lo) : (lo - v) / (hi - lo);
  return d > 1.5 ? "HIGH" : d > 0.4 ? "MODERATE" : "WATCH";
}

export function TrendIcon({ trend }: { trend: "Rising" | "Falling" | "Stable" }) {
  const I = trend === "Rising" ? ArrowUpRight : trend === "Falling" ? ArrowDownRight : ArrowRight;
  return <I className="h-3.5 w-3.5" aria-hidden />;
}

export function MetricCard({ k, icon: Icon, normalLabel, detailed, note }: { k: MetricKey; icon?: LucideIcon; normalLabel?: string; detailed?: boolean; note?: string }) {
  const { state } = useAstro();
  const def = METRICS[k];
  const v = state.values[k];
  const sev = metricSeverity(k, v);
  const trend = trendOf(state.history[k]);
  const delta = baselineDelta(k, v);
  const sensor = state.sensors.find((s) => s.id === def.sensorId);
  const stale = sensor && !sensor.connected;
  const tone = sev === "NORMAL" ? "var(--color-chart-1)" : sev === "WATCH" ? "var(--color-info)" : sev === "MODERATE" ? "var(--color-warning)" : "var(--color-critical)";
  const unitShown = k === "sleep" ? "" : def.unit;

  return (
    <article className="panel panel-hover flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {Icon && <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground"><Icon className="h-4 w-4" aria-hidden /></span>}
          {def.label}
        </div>
        <SeverityBadge severity={stale ? "WATCH" : sev} label={stale ? "Stale" : sev === "NORMAL" ? normalLabel ?? "Normal" : undefined} />
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display tabular text-3xl font-semibold text-foreground">{formatValue(k, v)}</span>
        {unitShown && <span className="text-sm font-medium text-muted-foreground">{unitShown}</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Baseline {k === "sleep" ? `${formatValue(k, def.baseline[0])}–${formatValue(k, def.baseline[1])}` : `${def.baseline[0]}–${def.baseline[1]}`}</span>
        <span className="inline-flex items-center gap-0.5"><TrendIcon trend={trend} />{trend}</span>
      </div>
      {delta && <div className="mt-1 text-xs font-semibold text-foreground">{delta}</div>}
      {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
      {def.amp > 0 && <div className="mt-2"><Sparkline data={state.history[k]} baseline={def.baseline} tone={tone} /></div>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <SourceTag source={def.source} simulated={state.settings.simulationMode} />
        {detailed && <span className="font-mono text-[0.65rem] text-muted-foreground">{clockLabel(state.clock)}{def.sensorId ? ` · ${def.sensorId}` : ""}</span>}
      </div>
    </article>
  );
}
