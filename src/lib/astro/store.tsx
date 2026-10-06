import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { METRICS, METRIC_KEYS, formatValue } from "./metrics";
import { SCENARIOS, type ScenarioId } from "./scenarios";
import { evaluateRisks, sevRank, wellnessScore } from "./risk-engine";
import type { CheckIn, HealthReport, MetricKey, RiskEvent, RiskFinding, Sensor, Settings, Severity } from "./types";

const POINTS = 48;
const TICK_MS = 2500;
const AUTO_REPORT_COOLDOWN_TICKS = 40;
const START_CLOCK = 14 * 60 + 18; // 14:18 UTC mission time

type Values = Record<MetricKey, number>;
type History = Record<MetricKey, number[]>;

export interface AstroState {
  scenario: ScenarioId;
  values: Values;
  history: History;
  clock: number;
  tick: number;
  syncAge: number;
  sensors: Sensor[];
  events: RiskEvent[];
  reports: HealthReport[];
  checkIn: CheckIn | null;
  settings: Settings;
}

export const clockLabel = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")} UTC`;
};

function seedHistory(): History {
  const h = {} as History;
  METRIC_KEYS.forEach((k, idx) => {
    const d = METRICS[k];
    h[k] = Array.from({ length: POINTS }, (_, i) =>
      d.nominal + d.amp * (Math.sin(i / 4 + idx) * 0.9 + Math.sin(i / 1.7 + idx * 2) * 0.4),
    );
    h[k][POINTS - 1] = d.nominal;
  });
  return h;
}

const SEED_SENSORS: Sensor[] = [
  { id: "BIO-01", name: "Bio-Monitor Garment", connected: true, battery: 74, signal: "Good", lastReadingSec: 2, metrics: ["resp", "sleep", "bpSys"] },
  { id: "ECG-02", name: "ECG Sensor", connected: true, battery: 82, signal: "Excellent", lastReadingSec: 4, metrics: ["hr", "hrv", "restingHr"] },
  { id: "OXI-03", name: "Pulse Oximeter", connected: true, battery: 66, signal: "Good", lastReadingSec: 3, metrics: ["spo2"] },
  { id: "TMP-04", name: "Temperature Sensor", connected: true, battery: 91, signal: "Excellent", lastReadingSec: 5, metrics: ["temp", "skinTemp"] },
  { id: "DOS-05", name: "Radiation Dosimeter", connected: true, battery: 88, signal: "Excellent", lastReadingSec: 8, metrics: ["radiation"] },
  { id: "ACT-06", name: "Activity Tracker", connected: true, battery: 57, signal: "Good", lastReadingSec: 6, metrics: ["steps", "exercise", "inactivity"] },
];

const SEED_REPORTS: HealthReport[] = [
  {
    id: "AH-0148-01", createdAt: "Day 148 · 08:05 UTC", missionDay: 148, crewId: "AUR-01-CDR", score: 88,
    metrics: [{ label: "Heart Rate", value: "70 BPM" }, { label: "SpO₂", value: "98%" }, { label: "Sleep", value: "7h 24m" }],
    risks: [{ title: "No active risks", severity: "NORMAL", evidence: ["All indicators within personal baseline."] }],
    recommendations: ["Continue scheduled exercise protocol."], sensorSummary: "6 / 6 sensors connected",
    transmissionStatus: "Sent", auto: false,
  },
  {
    id: "AH-0147-02", createdAt: "Day 147 · 14:32 UTC", missionDay: 147, crewId: "AUR-01-CDR", score: 76,
    metrics: [{ label: "Heart Rate", value: "77 BPM" }, { label: "Sleep", value: "6h 06m" }, { label: "Resting HR", value: "63 BPM" }],
    risks: [{ title: "Moderate recovery risk", severity: "MODERATE", evidence: ["Sleep decreased 1h 18m below recent baseline.", "Resting heart rate increased 7%.", "Activity decreased 14%."] }],
    recommendations: ["Prioritize recovery and perform a follow-up health check."], sensorSummary: "6 / 6 sensors connected",
    transmissionStatus: "Sent", auto: false,
  },
  {
    id: "AH-0146-01", createdAt: "Day 146 · 09:10 UTC", missionDay: 146, crewId: "AUR-01-CDR", score: 84,
    metrics: [{ label: "Heart Rate", value: "71 BPM" }, { label: "Radiation", value: "2.3 mSv" }],
    risks: [{ title: "Low", severity: "WATCH", evidence: ["Activity Tracker briefly disconnected (data gap 18 min)."] }],
    recommendations: ["Re-seat activity tracker strap."], sensorSummary: "5 / 6 sensors connected",
    transmissionStatus: "Sent", auto: false,
  },
];

const DEFAULT_SETTINGS: Settings = {
  theme: "light", healthAlerts: true, autoReport: true, sensorAlerts: true, nasaSync: true, sensorSync: true,
  simulationMode: true, localData: true, retentionDays: 30, missionDay: 148, crewId: "AUR-01-CDR", missionName: "AURORA-01",
};

function initialState(): AstroState {
  const values = {} as Values;
  METRIC_KEYS.forEach((k) => (values[k] = METRICS[k].nominal));
  return {
    scenario: "normal", values, history: seedHistory(), clock: START_CLOCK, tick: 0, syncAge: 14,
    sensors: SEED_SENSORS, events: [], reports: SEED_REPORTS, checkIn: null, settings: DEFAULT_SETTINGS,
  };
}

type Action =
  | { type: "scenario"; id: ScenarioId }
  | { type: "tick"; noise: Record<MetricKey, number> }
  | { type: "second" }
  | { type: "addEvent"; event: RiskEvent }
  | { type: "ackEvent"; id: string }
  | { type: "addReport"; report: HealthReport }
  | { type: "reportStatus"; id: string; status: HealthReport["transmissionStatus"] }
  | { type: "checkIn"; checkIn: CheckIn }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "toggleSensor"; id: string };

function reducer(s: AstroState, a: Action): AstroState {
  switch (a.type) {
    case "scenario":
      return { ...s, scenario: a.id };
    case "tick": {
      if (!s.settings.sensorSync) return s;
      const targets = SCENARIOS.find((x) => x.id === s.scenario)!.targets;
      const values = { ...s.values };
      const history = { ...s.history };
      METRIC_KEYS.forEach((k) => {
        const d = METRICS[k];
        let target = targets[k] ?? d.nominal;
        if (k === "mood" && s.checkIn) target = s.checkIn.mood * 2;
        const sensor = s.sensors.find((x) => x.id === d.sensorId);
        if (sensor && !sensor.connected) return; // stale reading
        values[k] = values[k] + (target - values[k]) * 0.45 + a.noise[k] * d.amp * 0.6;
        history[k] = [...s.history[k].slice(1), values[k]];
      });
      return {
        ...s, values, history, tick: s.tick + 1, clock: s.clock + 1, syncAge: 0,
        sensors: s.sensors.map((x) => ({ ...x, lastReadingSec: x.connected ? 1 + ((s.tick + x.battery) % 5) : x.lastReadingSec + 3 })),
      };
    }
    case "second":
      return { ...s, syncAge: s.syncAge + 1 };
    case "addEvent":
      return { ...s, events: [a.event, ...s.events].slice(0, 50) };
    case "ackEvent":
      return { ...s, events: s.events.map((e) => (e.id === a.id ? { ...e, acknowledged: true } : e)) };
    case "addReport":
      return { ...s, reports: [a.report, ...s.reports] };
    case "reportStatus":
      return { ...s, reports: s.reports.map((r) => (r.id === a.id ? { ...r, transmissionStatus: a.status } : r)) };
    case "checkIn":
      return { ...s, checkIn: a.checkIn, values: { ...s.values, mood: a.checkIn.mood * 2 } };
    case "settings":
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case "toggleSensor":
      return { ...s, sensors: s.sensors.map((x) => (x.id === a.id ? { ...x, connected: !x.connected, signal: x.connected ? "Poor" : "Good" } : x)) };
  }
}

interface Ctx {
  state: AstroState;
  findings: RiskFinding[];
  score: ReturnType<typeof wellnessScore>;
  worst: Severity;
  setScenario: (id: ScenarioId) => void;
  ackEvent: (id: string) => void;
  transmitReport: (opts?: { auto?: boolean; eventId?: string }) => string;
  submitCheckIn: (c: Omit<CheckIn, "submittedAt">) => void;
  updateSettings: (p: Partial<Settings>) => void;
  toggleSensor: (id: string) => void;
}

const AstroContext = createContext<Ctx | null>(null);

export function AstroProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const findings = useMemo(() => evaluateRisks(state.values, state.history, state.sensors), [state.values, state.history, state.sensors]);
  const score = useMemo(() => wellnessScore(state.values), [state.values]);
  const worst: Severity = findings[0]?.severity ?? "NORMAL";

  // Live telemetry loop
  useEffect(() => {
    const t = setInterval(() => {
      const noise = {} as Record<MetricKey, number>;
      METRIC_KEYS.forEach((k) => (noise[k] = Math.random() * 2 - 1));
      dispatch({ type: "tick", noise });
    }, TICK_MS);
    const s = setInterval(() => dispatch({ type: "second" }), 1000);
    return () => { clearInterval(t); clearInterval(s); };
  }, []);

  // Theme persistence (light by default)
  useEffect(() => {
    const saved = localStorage.getItem("astrogalen-theme");
    if (saved === "dark") dispatch({ type: "settings", patch: { theme: "dark" } });
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.settings.theme === "dark");
    localStorage.setItem("astrogalen-theme", state.settings.theme);
  }, [state.settings.theme]);

  const reportSeq = useRef(2);
  const eventSeq = useRef(1);
  const activeTypes = useRef<Map<string, Severity>>(new Map());
  const lastAuto = useRef<Map<string, number>>(new Map());

  const buildReport = (auto: boolean, eventId?: string): HealthReport => {
    const s = stateRef.current;
    const f = evaluateRisks(s.values, s.history, s.sensors);
    const sc = wellnessScore(s.values);
    const keys: MetricKey[] = ["hr", "spo2", "temp", "resp", "sleep", "stress", "radiation"];
    reportSeq.current += 1;
    return {
      id: `AH-${String(s.settings.missionDay).padStart(4, "0")}-${String(reportSeq.current).padStart(2, "0")}`,
      createdAt: `Day ${s.settings.missionDay} · ${clockLabel(s.clock)}`,
      missionDay: s.settings.missionDay, crewId: s.settings.crewId, score: sc.overall,
      metrics: keys.map((k) => ({ label: METRICS[k].label, value: `${formatValue(k, s.values[k])}${METRICS[k].unit && k !== "sleep" ? " " + METRICS[k].unit : ""}` })),
      risks: f.length ? f.map((x) => ({ title: x.title, severity: x.severity, evidence: x.evidence })) : [{ title: "No active risks", severity: "NORMAL", evidence: ["All monitored indicators within personal baseline."] }],
      recommendations: f.length ? f.map((x) => x.recommendation) : ["Continue scheduled mission activities."],
      sensorSummary: `${s.sensors.filter((x) => x.connected).length} / ${s.sensors.length} sensors connected`,
      transmissionStatus: "Transmitting", auto, eventId,
    };
  };

  const transmitReport: Ctx["transmitReport"] = (opts = {}) => {
    const r = buildReport(!!opts.auto, opts.eventId);
    dispatch({ type: "addReport", report: r });
    setTimeout(() => {
      dispatch({ type: "reportStatus", id: r.id, status: "Sent" });
      if (opts.auto) toast.success("Report transmitted automatically", { description: `${r.id} · ${r.createdAt}` });
      else toast.success("Health report successfully transmitted to Mission Control.", { description: `${r.id} · ${r.createdAt}` });
    }, 1600);
    return r.id;
  };

  // Risk engine side-effects: dedupe by type, escalate, cooldown auto-report
  useEffect(() => {
    const s = stateRef.current;
    const next = new Map<string, Severity>();
    findings.forEach((f) => {
      next.set(f.type, f.severity);
      const prev = activeTypes.current.get(f.type);
      if (prev && sevRank(prev) >= sevRank(f.severity)) return;
      const id = `EVT-${s.settings.missionDay}-${String(eventSeq.current++).padStart(3, "0")}`;
      const high = sevRank(f.severity) >= sevRank("HIGH");
      const last = lastAuto.current.get(f.type);
      const canAuto = high && s.settings.autoReport && (last === undefined || s.tick - last > AUTO_REPORT_COOLDOWN_TICKS);
      dispatch({ type: "addEvent", event: { ...f, id, detectedAt: clockLabel(s.clock), acknowledged: false, autoReported: canAuto } });
      if (s.settings.healthAlerts || high) {
        if (f.severity === "CRITICAL") toast.error(`Critical health signal detected${canAuto ? " — Mission Control notified" : ""}`, { description: f.title });
        else if (f.type === "dataQuality") { if (s.settings.sensorAlerts) toast.error("Sensor connection lost", { description: f.evidence[0] }); }
        else toast.warning(f.title, { description: f.evidence[0] });
      }
      if (canAuto) {
        lastAuto.current.set(f.type, s.tick);
        setTimeout(() => {
          toast.warning("Health risk detected", { description: "An automated health report has been prepared for Mission Control." });
          transmitReport({ auto: true, eventId: id });
        }, 700);
      }
    });
    activeTypes.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findings]);

  const value: Ctx = {
    state, findings, score, worst,
    setScenario: (id) => {
      dispatch({ type: "scenario", id });
      const sc = SCENARIOS.find((x) => x.id === id)!;
      toast.info(`Simulation: ${sc.label}`, { description: sc.summary });
    },
    ackEvent: (id) => dispatch({ type: "ackEvent", id }),
    transmitReport,
    submitCheckIn: (c) => {
      dispatch({ type: "checkIn", checkIn: { ...c, submittedAt: clockLabel(stateRef.current.clock) } });
      toast.success("Check-in submitted", { description: "Self-reported data added to your Insights." });
    },
    updateSettings: (p) => dispatch({ type: "settings", patch: p }),
    toggleSensor: (id) => {
      const sensor = stateRef.current.sensors.find((x) => x.id === id);
      dispatch({ type: "toggleSensor", id });
      if (sensor && !sensor.connected) toast("◌ Sensor synchronization complete", { description: `${sensor.name} reconnected.` });
    },
  };

  return <AstroContext.Provider value={value}>{children}</AstroContext.Provider>;
}

export function useAstro() {
  const c = useContext(AstroContext);
  if (!c) throw new Error("useAstro must be used within AstroProvider");
  return c;
}
