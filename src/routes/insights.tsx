import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SeverityBadge, SourceTag, TrendChart } from "@/components/astro/primitives";
import { CheckInDialog } from "@/components/astro/dialogs";
import { metricSeverity } from "@/components/astro/MetricCard";
import { useAstro, clockLabel } from "@/lib/astro/store";
import { METRICS, baselineDelta, baselineStatus, formatValue } from "@/lib/astro/metrics";
import { SCENARIOS } from "@/lib/astro/scenarios";
import type { MetricKey } from "@/lib/astro/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Health Insights — AstroGalen" },
      { name: "description", content: "Explainable risk analysis, personal-baseline comparisons and 24-hour health trends." },
      { property: "og:title", content: "Health Insights — AstroGalen" },
      { property: "og:description", content: "Understand what your health data is telling you." },
    ],
  }),
  component: InsightsPage,
});

const TREND_KEYS: MetricKey[] = ["hr", "spo2", "temp", "steps", "sleep", "stress"];
const BASELINE_KEYS: MetricKey[] = ["hr", "spo2", "temp", "resp", "restingHr", "hrv", "sleep", "stress"];
const DEMO_SCENARIOS = ["elevatedHr", "lowSpo2", "sleepDep", "radiation", "multi"] as const;

function BaselineRow({ k }: { k: MetricKey }) {
  const { state } = useAstro();
  const def = METRICS[k];
  const v = state.values[k];
  const [lo, hi] = def.baseline;
  const w = hi - lo;
  const min = lo - w * 1.5;
  const max = hi + w * 1.5;
  const pos = (x: number) => `${Math.max(0, Math.min(100, ((x - min) / (max - min)) * 100))}%`;
  const sev = metricSeverity(k, v);
  const delta = baselineDelta(k, v);
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-4 py-2.5 sm:grid-cols-[160px_1fr_170px]">
      <div>
        <div className="text-sm font-semibold text-foreground">{def.label}</div>
        <div className="font-display tabular text-lg font-semibold text-foreground">{formatValue(k, v)} <span className="text-xs font-normal text-muted-foreground">{k === "sleep" ? "" : def.unit}</span></div>
      </div>
      <div className="relative h-3 rounded-full bg-muted" aria-label={`Personal baseline ${lo} to ${hi}`}>
        <div className="absolute inset-y-0 rounded-full bg-success/30" style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }} />
        <div className={cn("absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow transition-all duration-500", sev === "NORMAL" ? "bg-primary" : sev === "WATCH" ? "bg-info" : sev === "MODERATE" ? "bg-warning" : "bg-critical")} style={{ left: pos(v) }} />
      </div>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:justify-end">
        <SeverityBadge severity={sev} label={baselineStatus(k, v)} />
        {delta && <span className="hidden text-xs text-muted-foreground xl:inline">{delta}</span>}
      </div>
    </div>
  );
}

function InsightsPage() {
  const { state, findings, score, setScenario } = useAstro();
  const [metric, setMetric] = useState<MetricKey>("hr");
  const labels = state.history.hr.map((_, i) => clockLabel(state.clock - (state.history.hr.length - 1 - i) * 30).replace(" UTC", ""));
  const def = METRICS[metric];
  const c = state.checkIn;

  const today = findings.length === 0
    ? "Cardiovascular indicators are stable and all monitored values sit inside your personal baseline. Recovery is on track."
    : `${findings.map((f) => f.title.toLowerCase()).join(", ").replace(/^./, (m) => m.toUpperCase())}. Other indicators remain close to your personal baseline.`;

  const summary = findings.length === 0
    ? "Your physiological indicators are stable. Keep following your scheduled rest and exercise plan."
    : `Your physiological indicators show ${findings.length} item(s) to review. ${findings[0].recommendation}`;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analysis" title="Health Insights" subtitle="Understand what your health data is telling you." actions={<CheckInDialog trigger={<Button variant="outline"><ClipboardList className="h-4 w-4" /> Daily Check-In</Button>} />} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel eyebrow="Today" title="Your current health picture">
          <p className="text-lg leading-relaxed text-foreground">{today}</p>
          {c && (
            <div className="mt-4 rounded-lg bg-surface-2 p-4">
              <div className="flex items-center justify-between"><div className="text-sm font-semibold text-foreground">Today's Summary</div><SourceTag source="Self Report" /></div>
              <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                {[["Feeling", c.feeling], ["Energy", `${c.energy}/5`], ["Stress", `${c.stress}/5`], ["Mood", `${c.mood}/5`], ["Sleep quality", `${c.sleepQuality}/5`]].map(([k, val]) => (
                  <div key={k}><div className="eyebrow text-[0.6rem]">{k}</div><div className="font-semibold text-foreground">{val}</div></div>
                ))}
              </div>
              <div className="mt-2 font-mono text-[0.65rem] text-muted-foreground">Submitted {c.submittedAt}</div>
            </div>
          )}
          {!c && <p className="mt-3 text-sm text-muted-foreground">Complete today's check-in to add self-reported wellbeing to this analysis.</p>}
        </Panel>

        <Panel eyebrow="Explainable score" title={`Mission Wellness Score: ${score.overall}`}>
          <ul className="space-y-2.5">
            {score.parts.map((p) => (
              <li key={p.label}>
                <div className="flex justify-between text-sm"><span className="font-semibold text-foreground">{p.label}</span><span className="tabular text-muted-foreground">{p.value} · weight {Math.round(p.weight * 100)}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-cyan transition-all duration-500" style={{ width: `${p.value}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Score is a prototype decision-support indicator and not a medical diagnosis. Weights are illustrative.</p>
        </Panel>
      </div>

      <Panel eyebrow="Risk analysis" title="Why the system flagged something" action={<SeverityBadge severity={findings[0]?.severity ?? "NORMAL"} label={findings.length ? undefined : "Low"} />}>
        {findings.length === 0 ? (
          <div className="flex items-start gap-3 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 text-success" /> Overall risk: Low. No rule in the risk engine is currently triggered. Rules check thresholds, personal-baseline deviation, sustained readings, signal combinations and data quality.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {findings.map((f) => (
              <article key={f.type} className="rounded-lg border bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-2"><h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3><SeverityBadge severity={f.severity} /></div>
                <div className="mt-2 text-sm font-semibold text-foreground">Detected because:</div>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">{f.evidence.map((e) => <li key={e}>• {e}</li>)}</ul>
                <div className="mt-3 rounded-md bg-card p-3 text-sm text-foreground"><span className="font-semibold">Recommended action:</span> {f.recommendation}</div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel eyebrow="Personal baseline" title="You vs. your own history">
          <div className="divide-y">{BASELINE_KEYS.map((k) => <BaselineRow key={k} k={k} />)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Green band = your personal baseline from the last 30 mission days.</p>
        </Panel>
        <Panel eyebrow="24-hour trends" title={def.label} action={<SourceTag source={def.source} simulated={state.settings.simulationMode} />}>
          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
            {TREND_KEYS.map((k) => (
              <button key={k} role="tab" aria-selected={metric === k} onClick={() => setMetric(k)}
                className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", metric === k ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
                {METRICS[k].label}
              </button>
            ))}
          </div>
          <TrendChart data={state.history[metric]} baseline={def.baseline} labels={labels} unit={metric === "sleep" ? "h" : def.unit} height={300} />
        </Panel>
      </div>

      <Panel eyebrow="Demonstration" title="Health scenarios">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {DEMO_SCENARIOS.map((id, i) => {
            const s = SCENARIOS.find((x) => x.id === id)!;
            const active = state.scenario === id;
            return (
              <div key={id} className={cn("flex flex-col rounded-lg border p-4", active ? "border-cyan bg-cyan/8" : "bg-surface-2")}>
                <div className="eyebrow">Scenario {i + 1}</div>
                <div className="mt-1 font-display font-semibold text-foreground">{s.label}</div>
                <p className="mt-1 flex-1 text-xs text-muted-foreground">{s.summary}</p>
                <Button size="sm" variant={active ? "default" : "outline"} className="mt-3" onClick={() => setScenario(active ? "normal" : id)}>
                  <Play className="h-3.5 w-3.5" /> {active ? "Running — reset" : "Run simulation"}
                </Button>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
