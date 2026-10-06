import type { MetricDef, MetricKey } from "./types";

const fmtSleep = (h: number) => {
  const hrs = Math.floor(h);
  const m = Math.round((h - hrs) * 60);
  return `${hrs}h ${String(m).padStart(2, "0")}m`;
};

export const METRICS: Record<MetricKey, MetricDef> = {
  hr: { key: "hr", label: "Heart Rate", unit: "BPM", baseline: [68, 76], nominal: 72, decimals: 0, source: "Wearable Sensor", sensorId: "ECG-02", amp: 2.5, worse: "high", group: "Cardiovascular" },
  hrv: { key: "hrv", label: "Heart Rate Variability", unit: "ms", baseline: [55, 75], nominal: 64, decimals: 0, source: "Derived Metric", sensorId: "ECG-02", amp: 3, worse: "low", group: "Cardiovascular" },
  bpSys: { key: "bpSys", label: "Blood Pressure", unit: "mmHg", baseline: [108, 124], nominal: 117, decimals: 0, source: "Simulated Sensor", sensorId: "BIO-01", amp: 2, worse: "both", group: "Cardiovascular", format: (v) => `${Math.round(v)}/${Math.round(v * 0.65)}` },
  spo2: { key: "spo2", label: "SpO₂", unit: "%", baseline: [96, 99.5], nominal: 98, decimals: 0, source: "Wearable Sensor", sensorId: "OXI-03", amp: 0.4, worse: "low", group: "Respiratory" },
  resp: { key: "resp", label: "Respiratory Rate", unit: "/ min", baseline: [12, 18], nominal: 15, decimals: 0, source: "Wearable Sensor", sensorId: "BIO-01", amp: 0.7, worse: "both", group: "Respiratory" },
  temp: { key: "temp", label: "Body Temperature", unit: "°C", baseline: [36.3, 37.1], nominal: 36.7, decimals: 1, source: "Wearable Sensor", sensorId: "TMP-04", amp: 0.08, worse: "high", group: "Thermal" },
  skinTemp: { key: "skinTemp", label: "Skin Temperature", unit: "°C", baseline: [33, 34.6], nominal: 33.8, decimals: 1, source: "Wearable Sensor", sensorId: "TMP-04", amp: 0.15, worse: "high", group: "Thermal" },
  sleep: { key: "sleep", label: "Sleep", unit: "", baseline: [6.8, 8], nominal: 7.4, decimals: 1, source: "Wearable Sensor", sensorId: "BIO-01", amp: 0, worse: "low", group: "Recovery", format: fmtSleep },
  recovery: { key: "recovery", label: "Recovery Score", unit: "/ 100", baseline: [74, 92], nominal: 82, decimals: 0, source: "Derived Metric", amp: 1, worse: "low", group: "Recovery" },
  restingHr: { key: "restingHr", label: "Resting Heart Rate", unit: "BPM", baseline: [55, 62], nominal: 59, decimals: 0, source: "Wearable Sensor", sensorId: "ECG-02", amp: 0.6, worse: "high", group: "Recovery" },
  steps: { key: "steps", label: "Movement", unit: "units", baseline: [6000, 8200], nominal: 6420, decimals: 0, source: "Wearable Sensor", sensorId: "ACT-06", amp: 60, worse: "low", group: "Activity", format: (v) => Math.round(v).toLocaleString("en-US") },
  exercise: { key: "exercise", label: "Exercise Duration", unit: "min", baseline: [100, 150], nominal: 118, decimals: 0, source: "Wearable Sensor", sensorId: "ACT-06", amp: 1, worse: "low", group: "Activity" },
  inactivity: { key: "inactivity", label: "Longest Inactive Period", unit: "min", baseline: [20, 75], nominal: 48, decimals: 0, source: "Derived Metric", sensorId: "ACT-06", amp: 2, worse: "high", group: "Activity" },
  stress: { key: "stress", label: "Stress Index", unit: "/ 100", baseline: [12, 38], nominal: 22, decimals: 0, source: "Derived Metric", amp: 2, worse: "high", group: "Behavioral Wellbeing" },
  fatigue: { key: "fatigue", label: "Fatigue", unit: "/ 100", baseline: [10, 38], nominal: 24, decimals: 0, source: "Derived Metric", amp: 1.5, worse: "high", group: "Behavioral Wellbeing" },
  mood: { key: "mood", label: "Mood", unit: "/ 10", baseline: [6, 9], nominal: 7.5, decimals: 1, source: "Self Report", amp: 0, worse: "low", group: "Behavioral Wellbeing" },
  cognitive: { key: "cognitive", label: "Cognitive Check-In", unit: "% accuracy", baseline: [90, 99], nominal: 95, decimals: 0, source: "Self Report", amp: 0, worse: "low", group: "Behavioral Wellbeing" },
  radiation: { key: "radiation", label: "Radiation Exposure", unit: "mSv / 7 days", baseline: [1.5, 3.6], nominal: 2.4, decimals: 1, source: "Environmental Telemetry", sensorId: "DOS-05", amp: 0.03, worse: "high", group: "Environment" },
};

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

export function formatValue(key: MetricKey, v: number) {
  const def = METRICS[key];
  if (def.format) return def.format(v);
  return v.toFixed(def.decimals);
}

/** How far a value sits outside the personal baseline, normalised by the band width (0 = inside). */
export function deviation(key: MetricKey, v: number) {
  const { baseline: [lo, hi], worse } = METRICS[key];
  const w = hi - lo || 1;
  if (v > hi && worse !== "low") return (v - hi) / w;
  if (v < lo && worse !== "high") return (lo - v) / w;
  return 0;
}

export function baselineStatus(key: MetricKey, v: number) {
  const [lo, hi] = METRICS[key].baseline;
  if (v > hi) return "Above baseline" as const;
  if (v < lo) return "Below baseline" as const;
  return "Within baseline" as const;
}

/** Signed distance from the nearest baseline edge, e.g. "+18 BPM from baseline". */
export function baselineDelta(key: MetricKey, v: number) {
  const def = METRICS[key];
  const [lo, hi] = def.baseline;
  const d = v > hi ? v - hi : v < lo ? v - lo : 0;
  if (d === 0) return null;
  const sign = d > 0 ? "+" : "−";
  const abs = Math.abs(d);
  const txt = key === "sleep" ? def.format!(abs) : abs.toFixed(def.decimals);
  return `${sign}${txt}${def.unit && key !== "sleep" ? " " + def.unit : ""} from baseline`;
}

export function trendOf(series: number[]) {
  if (series.length < 8) return "Stable" as const;
  const recent = series.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const prior = series.slice(-10, -4).reduce((a, b) => a + b, 0) / 6;
  const rel = (recent - prior) / (Math.abs(prior) || 1);
  if (rel > 0.04) return "Rising" as const;
  if (rel < -0.04) return "Falling" as const;
  return "Stable" as const;
}
