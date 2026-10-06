import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Battery, Satellite, Signal, Sun, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SeverityBadge, SourceTag } from "@/components/astro/primitives";
import { useAstro } from "@/lib/astro/store";
import { SCENARIOS } from "@/lib/astro/scenarios";
import { fetchSpaceWeather } from "@/lib/astro/adapters/nasa-donki";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sensors")({
  head: () => ({
    meta: [
      { title: "Sensors & Simulation — AstroGalen" },
      { name: "description", content: "Connected wearable sensors, data freshness, NASA space-weather feed and simulation controls." },
      { property: "og:title", content: "Sensors & Simulation — AstroGalen" },
      { property: "og:description", content: "Sensor status, NASA DONKI space weather and demo simulation controls." },
    ],
  }),
  component: SensorsPage,
});

function SpaceWeather() {
  const { state } = useAstro();
  const q = useQuery({ queryKey: ["donki"], queryFn: fetchSpaceWeather, enabled: state.settings.nasaSync, staleTime: 10 * 60 * 1000, retry: 1 });
  return (
    <Panel eyebrow="External data" title="Space weather (last 30 days)" action={<SourceTag source="NASA Data" />}>
      {!state.settings.nasaSync ? <p className="text-sm text-muted-foreground">NASA data synchronization is turned off in Settings.</p>
        : q.isLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Satellite className="h-4 w-4 animate-pulse" /> Contacting NASA DONKI…</div>
        : q.isError || !q.data ? <p className="text-sm text-muted-foreground">NASA DONKI is unavailable right now (public demo key rate limit). Simulated telemetry continues normally.</p>
        : (
          <div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface-2 p-3"><div className="eyebrow">Solar flares</div><div className="font-display text-2xl font-semibold text-foreground">{q.data.flares.length}</div></div>
              <div className="rounded-lg bg-surface-2 p-3"><div className="eyebrow">Particle events</div><div className="font-display text-2xl font-semibold text-foreground">{q.data.sepCount}</div></div>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {q.data.flares.slice(0, 4).map((f) => (
                <li key={f.id} className="flex justify-between"><span className="inline-flex items-center gap-1.5 font-semibold text-foreground"><Sun className="h-3.5 w-3.5 text-warning" /> Class {f.classType}</span><span className="font-mono text-xs text-muted-foreground">{f.peakTime?.replace("T", " ").replace("Z", "")}</span></li>
              ))}
            </ul>
          </div>
        )}
      <p className="mt-3 text-xs text-muted-foreground">Source: NASA DONKI (Space Weather Database). Provides environment context only — never physiological data.</p>
    </Panel>
  );
}

function SensorsPage() {
  const { state, setScenario, toggleSensor } = useAstro();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Devices" title="Connected Sensors" subtitle="Device health, signal quality and data freshness." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {state.sensors.map((s) => (
          <article key={s.id} className="panel panel-hover p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display text-lg font-semibold text-foreground">{s.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{s.id}</div>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", s.connected ? "text-success" : "text-critical")}>
                <span className={cn("h-2 w-2 rounded-full", s.connected ? "bg-success animate-sensor" : "bg-critical")} />
                {s.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="eyebrow text-[0.6rem]"><Signal className="mr-1 inline h-3 w-3" />Signal</dt><dd className="font-semibold text-foreground">{s.signal}</dd></div>
              <div><dt className="eyebrow text-[0.6rem]"><Battery className="mr-1 inline h-3 w-3" />Battery</dt><dd className="font-semibold text-foreground tabular">{s.battery}%</dd></div>
              <div><dt className="eyebrow text-[0.6rem]">Last reading</dt><dd className="font-semibold text-foreground tabular">{s.lastReadingSec}s ago</dd></div>
            </dl>
            <div className="mt-3 flex items-center justify-between">
              <SeverityBadge severity={!s.connected ? "MODERATE" : s.lastReadingSec < 10 ? "NORMAL" : "WATCH"} label={!s.connected ? "Data stale" : "Data fresh"} />
              <Button size="sm" variant="ghost" onClick={() => toggleSensor(s.id)}><Power className="h-3.5 w-3.5" /> {s.connected ? "Simulate disconnect" : "Reconnect"}</Button>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel eyebrow="Developer / demo" title="Simulation Controls" action={<span className="rounded-full border border-warning/30 bg-warning/12 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold tracking-wider text-warning">SIMULATION MODE</span>}>
          <p className="mb-4 text-sm text-muted-foreground">Values below are simulated for the NASA Space Apps demonstration. Selecting a scenario updates telemetry, charts and the risk engine in real time.</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {SCENARIOS.map((s) => (
              <Button key={s.id} variant={state.scenario === s.id ? "default" : "outline"} className="h-auto flex-col items-start gap-0.5 py-3 text-left whitespace-normal" onClick={() => setScenario(s.id)}>
                <span className="font-semibold">{s.label}</span>
                <span className={cn("text-[0.7rem] font-normal", state.scenario === s.id ? "text-primary-foreground/80" : "text-muted-foreground")}>{s.summary}</span>
              </Button>
            ))}
          </div>
        </Panel>
        <SpaceWeather />
      </div>

      <Panel eyebrow="Architecture" title="Data sources">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 p-3"><SourceTag source="NASA Data" /><p className="mt-1 text-muted-foreground">Real public APIs (NASA DONKI) through swappable adapters.</p></div>
          <div className="rounded-lg bg-surface-2 p-3"><SourceTag source="Simulated Sensor" /><p className="mt-1 text-muted-foreground">Physiological telemetry generated for the prototype; replaceable with real wearable feeds.</p></div>
          <div className="rounded-lg bg-surface-2 p-3"><SourceTag source="Self Report" /><p className="mt-1 text-muted-foreground">Daily check-in answers from the astronaut.</p></div>
        </div>
      </Panel>
    </div>
  );
}
