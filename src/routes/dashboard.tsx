import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowDownRight, ArrowUpRight, Brain, CheckCircle2, ClipboardList, Footprints, HeartPulse, Moon, Radiation, Radio, Send, Stethoscope, Thermometer, TrendingUp, Wind, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/astro/MetricCard";
import { Panel, SeverityBadge } from "@/components/astro/primitives";
import { CheckInDialog, SendReportDialog } from "@/components/astro/dialogs";
import { useAstro } from "@/lib/astro/store";
import { METRICS } from "@/lib/astro/metrics";
import { overallStatus } from "@/lib/astro/risk-engine";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Mission Overview — AstroGalen" },
      { name: "description", content: "Today's astronaut health status, Mission Wellness Score, key vitals and active alerts." },
      { property: "og:title", content: "Mission Overview — AstroGalen" },
      { property: "og:description", content: "Astronaut health status at a glance for Mission Day 148." },
    ],
  }),
  component: Dashboard,
});

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="64" cy="64" r={r} fill="none" className="stroke-muted" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" className="stroke-cyan transition-all duration-700" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
        <circle cx="64" cy="64" r="62" fill="none" className="stroke-border" strokeWidth="0.6" strokeDasharray="1 5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display tabular text-4xl font-semibold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function pct(a: number, b: number) {
  return Math.round(((a - b) / b) * 100);
}

function Dashboard() {
  const { state, findings, score, worst, setScenario, ackEvent, transmitReport } = useAstro();
  const v = state.values;
  const status = overallStatus(score.overall, worst);
  const sleepDiff = Math.round((v.sleep - 6.7) * 60);
  const changes = [
    { label: "Heart rate", d: pct(v.hr, 74), suffix: "% from baseline", goodDown: true },
    { label: "Sleep", d: sleepDiff, suffix: " min vs. yesterday", goodDown: false },
    { label: "Activity", d: pct(v.steps, 6980), suffix: "% vs. weekly avg", goodDown: false },
    { label: "Stress", d: pct(v.stress, 25), suffix: "% vs. yesterday", goodDown: true },
  ];
  const stable = findings.length === 0;
  const headline = stable ? "Your body is adapting well today." : worst === "WATCH" ? "Mostly stable — one item to watch." : "Some indicators need your attention.";
  const narrative = stable
    ? "Your cardiovascular indicators remain close to your personal baseline. Sleep recovery improved compared with yesterday. Activity levels are slightly below your weekly mission average."
    : `${findings[0].title}. ${findings[0].evidence[0]} AstroGalen compares readings with your own baseline, not population averages.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Mission Overview</div>
          <h1 className="mt-1 text-3xl font-semibold text-foreground md:text-4xl">Good morning, Commander.</h1>
          <p className="mt-1.5 text-base text-muted-foreground">Here's your health status for Mission Day {state.settings.missionDay}.</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          {[
            ["Crew member", "A. Morgan"],
            ["Mission", "Deep Space Expedition"],
            ["Location", "Deep Space Transit"],
            ["Last sync", `${state.syncAge} s ago`],
          ].map(([k, val]) => (
            <div key={k}><dt className="eyebrow text-[0.6rem]">{k}</dt><dd className="font-semibold text-foreground tabular">{val}</dd></div>
          ))}
        </dl>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <section className="panel relative overflow-hidden p-6">
          <svg className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 animate-orbit text-border" viewBox="0 0 200 200" aria-hidden>
            <ellipse cx="100" cy="100" rx="95" ry="40" fill="none" stroke="currentColor" strokeDasharray="2 6" />
            <circle cx="195" cy="100" r="3" className="fill-cyan" />
          </svg>
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <ScoreRing score={score.overall} />
            <div className="min-w-0">
              <div className="eyebrow">Health status</div>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-display text-4xl font-semibold text-foreground">{status}</span>
                <SeverityBadge severity={status === "Stable" ? "NORMAL" : worst} label={status === "Stable" ? "All clear" : undefined} />
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">Mission Wellness Score</div>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Calculated from recent physiological trends, recovery indicators, activity, sleep and self-reported wellbeing. Prototype indicator — not a diagnosis.</p>
            </div>
          </div>
        </section>

        <section className="panel p-6">
          <div className="eyebrow">Today's health summary</div>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">{headline}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{narrative}</p>
          <div className="mt-4 text-sm font-semibold text-foreground">What changed today?</div>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {changes.map((c) => {
              const up = c.d >= 0;
              const good = c.goodDown ? !up : up;
              const Icon = up ? ArrowUpRight : ArrowDownRight;
              return (
                <li key={c.label} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <Icon className={good ? "h-4 w-4 text-success" : "h-4 w-4 text-warning"} aria-hidden />
                  <span className="font-semibold text-foreground">{c.label}</span>
                  <span className="tabular text-muted-foreground">{up ? "↑" : "↓"} {Math.abs(c.d)}{c.suffix}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Button variant="outline" className="h-12 justify-start" onClick={() => toast.success("Health check complete", { description: `${findings.length ? findings.length + " item(s) flagged" : "No issues detected"} · Score ${score.overall}` })}><Stethoscope className="h-4 w-4" /> Run Health Check</Button>
        <Button variant="outline" className="h-12 justify-start" asChild><Link to="/insights"><TrendingUp className="h-4 w-4" /> View Trends</Link></Button>
        <SendReportDialog trigger={<Button className="h-12 justify-start"><Send className="h-4 w-4" /> Send Health Report</Button>} />
        <Button variant="outline" className="h-12 justify-start" asChild><Link to="/sensors"><Radio className="h-4 w-4" /> Check Sensors</Link></Button>
        <CheckInDialog trigger={<Button variant="outline" className="col-span-2 h-12 justify-start md:col-span-1"><ClipboardList className="h-4 w-4" /> Daily Check-In</Button>} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <MetricCard k="hr" icon={HeartPulse} />
          <MetricCard k="spo2" icon={Droplets} normalLabel="Stable" />
          <MetricCard k="temp" icon={Thermometer} />
          <MetricCard k="resp" icon={Wind} normalLabel="Stable" />
          <MetricCard k="sleep" icon={Moon} normalLabel="Good" />
          <MetricCard k="steps" icon={Footprints} normalLabel="Moderate" />
          <MetricCard k="stress" icon={Brain} normalLabel="Low" />
          <MetricCard k="radiation" icon={Radiation} normalLabel="In range" note="Environmental exposure telemetry — not a diagnosis." />
        </div>

        <Panel eyebrow="Alerts" title="Mission Health Alerts" className="h-fit">
          {findings.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-success/25 bg-success/10 p-4 text-sm font-semibold text-success">
              <CheckCircle2 className="h-5 w-5" /> No active health alerts
            </div>
          ) : (
            <ul className="space-y-3">
              {findings.map((f) => {
                const ev = state.events.find((e) => e.type === f.type);
                return (
                  <li key={f.type} className="rounded-lg border bg-surface-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground">{f.title}</h3>
                      <SeverityBadge severity={f.severity} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{f.evidence[0]}</p>
                    <p className="mt-2 text-sm text-foreground"><span className="font-semibold">Recommended:</span> {f.recommendation}</p>
                    {ev && <div className="mt-2 font-mono text-[0.65rem] text-muted-foreground">{ev.id} · {ev.detectedAt}{ev.autoReported ? " · AUTO-REPORTED" : ""}{ev.acknowledged ? " · ACKNOWLEDGED" : ""}</div>}
                    {(f.severity === "HIGH" || f.severity === "CRITICAL") && state.settings.autoReport && <div className="mt-1 text-xs font-semibold text-high">Automatic report transmission enabled</div>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild><Link to="/insights">Review Alert</Link></Button>
                      <Button size="sm" onClick={() => transmitReport({ eventId: ev?.id })}><Send className="h-3.5 w-3.5" /> Send Report</Button>
                      {ev && !ev.acknowledged && <Button size="sm" variant="ghost" onClick={() => ackEvent(ev.id)}>Acknowledge</Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-5 rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Activity className="h-4 w-4 text-cyan" /> Demo Mode</div>
            <p className="mt-1 text-xs text-muted-foreground">Trigger a simulated event to see detection, explanation and automatic reporting.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setScenario("elevatedHr")}>Trigger elevated HR</Button>
              <Button size="sm" variant="secondary" onClick={() => setScenario("multi")}>Multiple signals</Button>
              <Button size="sm" variant="ghost" onClick={() => setScenario("normal")}>Reset</Button>
            </div>
          </div>
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">Demo data · Commander Alex Morgan is a fictional crew member. Baselines: HR {METRICS.hr.baseline.join("–")} BPM.</p>
    </div>
  );
}
