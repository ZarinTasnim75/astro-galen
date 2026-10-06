import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, BarChart3, FileText, LayoutDashboard, Moon, Radio, Settings, Sun, AlertOctagon } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { useAstro } from "@/lib/astro/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Mission Overview", short: "Overview", Icon: LayoutDashboard },
  { to: "/health", label: "Health Monitor", short: "Health", Icon: Activity },
  { to: "/insights", label: "Insights", short: "Insights", Icon: BarChart3 },
  { to: "/reports", label: "Reports", short: "Reports", Icon: FileText },
  { to: "/sensors", label: "Sensors", short: "Sensors", Icon: Radio },
  { to: "/settings", label: "Settings", short: "Settings", Icon: Settings },
] as const;

export function ThemeToggle() {
  const { state, updateSettings } = useAstro();
  const dark = state.settings.theme === "dark";
  return (
    <button
      onClick={() => updateSettings({ theme: dark ? "light" : "dark" })}
      className="flex w-full items-center justify-between rounded-lg border bg-surface-2 p-1 text-xs font-semibold"
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
    >
      <span className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors", !dark ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
        <Sun className="h-3.5 w-3.5" /> Light
      </span>
      <span className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors", dark ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
        <Moon className="h-3.5 w-3.5" /> Dark
      </span>
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, findings } = useAstro();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const connected = state.sensors.filter((s) => s.connected).length;
  const critical = findings.find((f) => f.severity === "CRITICAL" || f.severity === "HIGH");

  return (
    <div className="space-backdrop min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar/95 backdrop-blur lg:flex">
        <div className="px-5 pt-6 pb-5"><Logo /></div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Main">
          {NAV.map(({ to, label, Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-cyan" />}
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 border-t p-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-success text-success animate-sensor" />
            <span className="font-semibold text-foreground">Link to Mission Control</span>
          </div>
          <div className="font-mono text-[0.65rem] text-muted-foreground">{connected}/{state.sensors.length} SENSORS · SYNC {state.syncAge}s AGO</div>
          <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">AM</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">Cdr. Alex Morgan</div>
              <div className="font-mono text-[0.65rem] text-muted-foreground">{state.settings.crewId} · DEMO</div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="w-36"><ThemeToggle /></div>
      </header>

      <div className="lg:pl-64">
        {critical && (
          <div role="alert" className={cn("sticky top-0 z-10 flex items-center gap-3 border-b px-6 py-2.5 text-sm font-semibold", critical.severity === "CRITICAL" ? "bg-critical text-primary-foreground border-critical" : "bg-high/15 text-high border-high/30")}>
            <AlertOctagon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{critical.severity === "CRITICAL" ? "CRITICAL" : "HIGH"} · {critical.title}{state.settings.autoReport ? " — automatic report transmission enabled" : ""}</span>
            <Link to="/insights" className="underline underline-offset-2">Review</Link>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 px-6 pt-4 md:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold tracking-wider text-cyan">NASA SPACE APPS CHALLENGE PROTOTYPE</span>
            {state.settings.simulationMode && <span className="rounded-full border border-warning/30 bg-warning/12 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold tracking-wider text-warning">SIMULATION MODE</span>}
            {state.settings.autoReport && <span className="hidden rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold tracking-wider text-muted-foreground sm:inline">AUTO-REPORT ENABLED</span>}
          </div>
          <div className="hidden font-mono text-xs text-muted-foreground md:block">{state.settings.missionName} · DAY {state.settings.missionDay}</div>
        </div>
        <main key={pathname} className="animate-page mx-auto max-w-[1440px] px-4 pt-5 pb-28 md:px-8 lg:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-card/95 backdrop-blur lg:hidden" aria-label="Main mobile">
        {NAV.map(({ to, short, Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link key={to} to={to} className={cn("flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold", active ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" aria-hidden />
              {short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
