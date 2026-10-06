import { createFileRoute } from "@tanstack/react-router";
import { Activity, Brain, Droplets, Flame, Footprints, Gauge, HeartPulse, Moon, Smile, Thermometer, Timer, Waves, Wind, Zap, BatteryLow, Hourglass } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader, SeverityBadge, Panel } from "@/components/astro/primitives";
import { MetricCard } from "@/components/astro/MetricCard";
import { useAstro } from "@/lib/astro/store";
import type { MetricKey } from "@/lib/astro/types";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Health Monitor — AstroGalen" },
      { name: "description", content: "Live physiological telemetry and personal baseline analysis for every monitored metric." },
      { property: "og:title", content: "Health Monitor — AstroGalen" },
      { property: "og:description", content: "Live physiological telemetry with personal baselines." },
    ],
  }),
  component: HealthPage,
});

const SECTIONS: { title: string; items: [MetricKey, LucideIcon][] }[] = [
  { title: "Cardiovascular", items: [["hr", HeartPulse], ["hrv", Waves], ["bpSys", Gauge]] },
  { title: "Respiratory", items: [["spo2", Droplets], ["resp", Wind]] },
  { title: "Thermal", items: [["temp", Thermometer], ["skinTemp", Flame]] },
  { title: "Recovery", items: [["sleep", Moon], ["recovery", Zap], ["restingHr", Activity]] },
  { title: "Activity", items: [["steps", Footprints], ["exercise", Timer], ["inactivity", Hourglass]] },
  { title: "Behavioral Wellbeing", items: [["stress", Brain], ["mood", Smile], ["cognitive", Brain], ["fatigue", BatteryLow]] },
];

function HealthPage() {
  const { state } = useAstro();
  const ecg = state.sensors.find((s) => s.id === "ECG-02")!;
  return (
    <div>
      <PageHeader eyebrow="Telemetry" title="Health Monitor" subtitle="Live physiological telemetry and personal baseline analysis." />
      <div className="space-y-8">
        {SECTIONS.map((sec) => (
          <section key={sec.title}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">{sec.title}</h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {sec.items.map(([k, Icon]) => <MetricCard key={k} k={k} icon={Icon} detailed />)}
              {sec.title === "Cardiovascular" && (
                <Panel className="flex flex-col justify-between" eyebrow="ECG status" title="Sinus rhythm detected">
                  <svg viewBox="0 0 200 50" className="h-14 w-full text-cyan" aria-hidden>
                    <path d="M0 25h30l5-8 5 8h15l4 -20 6 40 4-20h20l6-6 6 6h40l5-8 5 8h45" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <SeverityBadge severity={ecg.connected ? "NORMAL" : "WATCH"} label={ecg.connected ? "Signal OK" : "No signal"} />
                    <span>Signal {ecg.signal} · ECG-02</span>
                  </div>
                </Panel>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
