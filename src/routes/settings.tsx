import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel } from "@/components/astro/primitives";
import { ThemeToggle } from "@/components/astro/AppShell";
import { useAstro } from "@/lib/astro/store";
import type { Settings } from "@/lib/astro/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AstroGalen" },
      { name: "description", content: "Appearance, notifications, mission details, data synchronization and privacy settings." },
      { property: "og:title", content: "Settings — AstroGalen" },
      { property: "og:description", content: "Configure AstroGalen for your mission." },
    ],
  }),
  component: SettingsPage,
});

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div><div className="text-sm font-semibold text-foreground">{label}</div>{hint && <div className="text-xs text-muted-foreground">{hint}</div>}</div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const { state, updateSettings } = useAstro();
  const s = state.settings;
  const toggle = (k: keyof Settings, label: string, hint?: string) => (
    <Row label={label} hint={hint}>
      <Switch checked={s[k] as boolean} onCheckedChange={(v) => updateSettings({ [k]: v } as Partial<Settings>)} aria-label={label} />
    </Row>
  );
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configuration" title="Settings" subtitle="Tune AstroGalen for your mission and preferences." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Appearance" title="Theme"><div className="max-w-xs"><ThemeToggle /></div></Panel>
        <Panel eyebrow="Notifications" title="Alerts">
          <div className="divide-y">
            {toggle("healthAlerts", "Health alerts", "Show toasts for new moderate signals. High and critical always show.")}
            {toggle("autoReport", "Automatic report transmission", "Send a report when a high/critical risk is detected (120 s cooldown per risk type).")}
            {toggle("sensorAlerts", "Sensor connection alerts")}
          </div>
        </Panel>
        <Panel eyebrow="Mission" title="Mission details">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold text-foreground">Mission Day<Input type="number" className="mt-1" value={s.missionDay} onChange={(e) => updateSettings({ missionDay: Number(e.target.value) || 1 })} /></label>
            <label className="text-sm font-semibold text-foreground">Crew ID<Input className="mt-1" value={s.crewId} onChange={(e) => updateSettings({ crewId: e.target.value })} /></label>
            <label className="text-sm font-semibold text-foreground">Mission name<Input className="mt-1" value={s.missionName} onChange={(e) => updateSettings({ missionName: e.target.value })} /></label>
          </div>
        </Panel>
        <Panel eyebrow="Data" title="Synchronization">
          <div className="divide-y">
            {toggle("nasaSync", "NASA data synchronization", "Space-weather context from NASA DONKI.")}
            {toggle("sensorSync", "Sensor synchronization", "Pause to freeze live telemetry.")}
            {toggle("simulationMode", "Simulation mode label", "Clearly marks simulated values for judges.")}
          </div>
        </Panel>
        <Panel eyebrow="Privacy" title="Your data">
          <div className="divide-y">
            {toggle("localData", "Keep data on this workstation", "Telemetry is processed locally in this prototype.")}
            <Row label="Report transmission" hint="Reports go only to Mission Control (simulated)."><span className="text-sm font-semibold text-foreground">Mission Control only</span></Row>
            <Row label="Data retention">
              <select className="rounded-md border bg-card px-2 py-1.5 text-sm text-foreground" value={s.retentionDays} onChange={(e) => updateSettings({ retentionDays: Number(e.target.value) })}>
                {[7, 30, 90, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
              </select>
            </Row>
          </div>
        </Panel>
        <Panel eyebrow="About" title="AstroGalen">
          <p className="text-sm text-muted-foreground">Your health. Your mission. Always monitored.</p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">AstroGalen is a prototype decision-support system created for the NASA Space Apps Challenge. It does not diagnose medical conditions or replace professional medical judgment or mission medical procedures. All crew data is fictional demo data.</p>
        </Panel>
      </div>
    </div>
  );
}
