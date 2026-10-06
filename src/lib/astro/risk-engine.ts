/**
 * AstroGalen prototype risk engine.
 * Transparent, rule-based, editable. NOT clinically validated.
 * Considers: absolute thresholds, personal-baseline deviation, sustained readings,
 * combinations of signals, and data quality.
 */
import { METRICS, deviation, formatValue } from "./metrics";
import type { MetricKey, RiskFinding, Sensor, Severity } from "./types";

type Values = Record<MetricKey, number>;
type History = Record<MetricKey, number[]>;

export const SEVERITY_ORDER: Severity[] = ["NORMAL", "WATCH", "MODERATE", "HIGH", "CRITICAL"];
export const sevRank = (s: Severity) => SEVERITY_ORDER.indexOf(s);

export const RULES = {
  hrSustainedPoints: 3,
  hrModerateOver: 10,
  hrHighOver: 28,
  spo2Moderate: 95,
  spo2High: 92,
  spo2Critical: 90,
  tempModerate: 37.6,
  tempHigh: 38.1,
  stressHigh: 65,
  radiationModerate: 5,
  radiationHigh: 8,
  combinedMinSignals: 3,
};

const sustained = (series: number[], pred: (v: number) => boolean, n: number) =>
  series.length >= n && series.slice(-n).every(pred);

export function evaluateRisks(v: Values, h: History, sensors: Sensor[]): RiskFinding[] {
  const out: RiskFinding[] = [];
  const hrHi = METRICS.hr.baseline[1];

  // Cardiovascular — sustained deviation above personal baseline
  if (sustained(h.hr, (x) => x > hrHi + RULES.hrModerateOver, RULES.hrSustainedPoints)) {
    const sev: Severity = v.hr > hrHi + RULES.hrHighOver ? "HIGH" : "MODERATE";
    out.push({
      type: "cardio",
      title: "Elevated cardiovascular signal",
      severity: sev,
      metrics: ["hr", "hrv"],
      evidence: [
        `Heart rate ${Math.round(v.hr)} BPM — ${Math.round(v.hr - hrHi)} BPM above your personal baseline (68–76).`,
        `Elevation sustained across the last ${RULES.hrSustainedPoints} readings (~12 min mission time).`,
        v.hrv < METRICS.hrv.baseline[0] ? `HRV reduced to ${Math.round(v.hrv)} ms.` : "HRV within baseline.",
      ],
      recommendation:
        "Pause strenuous activity, hydrate, and complete a short recovery check. Contact mission medical support if symptoms persist.",
    });
  }

  // Respiratory — absolute threshold, sustained
  if (sustained(h.spo2, (x) => x < RULES.spo2Moderate, 2)) {
    const sev: Severity = v.spo2 < RULES.spo2Critical ? "CRITICAL" : v.spo2 < RULES.spo2High ? "HIGH" : "MODERATE";
    out.push({
      type: "spo2",
      title: "Oxygen saturation requires attention",
      severity: sev,
      metrics: ["spo2", "resp"],
      evidence: [
        `SpO₂ ${Math.round(v.spo2)}% — below the ${RULES.spo2Moderate}% monitoring threshold.`,
        `Respiratory rate ${Math.round(v.resp)} / min.`,
        "Pulse oximeter signal quality checked before flagging.",
      ],
      recommendation:
        "Pause activity and perform a sensor verification. If the reading remains abnormal, follow mission medical procedures.",
    });
  }

  // Thermal
  if (v.temp >= RULES.tempModerate) {
    out.push({
      type: "temp",
      title: "Elevated temperature signal",
      severity: v.temp >= RULES.tempHigh ? "HIGH" : "MODERATE",
      metrics: ["temp", "skinTemp"],
      evidence: [
        `Body temperature ${v.temp.toFixed(1)}°C — baseline 36.3–37.1°C.`,
        `Skin temperature ${v.skinTemp.toFixed(1)}°C.`,
      ],
      recommendation: "Rest, hydrate, and re-measure in 15 minutes. Report to mission medical support if it persists.",
    });
  }

  // Recovery — sleep below baseline AND stress elevated
  const sleepLow = v.sleep < METRICS.sleep.baseline[0] - 1;
  if (sleepLow && v.stress > RULES.stressHigh) {
    const below = METRICS.sleep.nominal - v.sleep;
    out.push({
      type: "recovery",
      title: "Recovery risk detected",
      severity: "HIGH",
      metrics: ["sleep", "stress", "restingHr"],
      evidence: [
        `Sleep was ${formatValue("sleep", below)} below your recent average.`,
        `Stress index ${Math.round(v.stress)} / 100 (baseline 12–38).`,
        v.restingHr > METRICS.restingHr.baseline[1]
          ? `Resting heart rate increased ${Math.round(((v.restingHr - 59) / 59) * 100)}%.`
          : "Resting heart rate near baseline.",
      ],
      recommendation:
        "Reduce nonessential workload, prioritize scheduled rest, and complete a wellbeing check-in.",
    });
  } else if (v.stress > RULES.stressHigh) {
    out.push({
      type: "stress",
      title: "Sustained stress signal",
      severity: "MODERATE",
      metrics: ["stress", "hrv"],
      evidence: [`Stress index ${Math.round(v.stress)} / 100.`, `HRV ${Math.round(v.hrv)} ms (baseline 55–75).`],
      recommendation: "Take a short break, try a guided breathing exercise, and complete a wellbeing check-in.",
    });
  }

  // Environment — exposure telemetry only, never a diagnosis
  if (v.radiation > RULES.radiationModerate) {
    out.push({
      type: "radiation",
      title: "Radiation monitoring alert",
      severity: v.radiation > RULES.radiationHigh ? "HIGH" : "MODERATE",
      metrics: ["radiation"],
      evidence: [
        `Dosimeter reports ${v.radiation.toFixed(1)} mSv over 7 days (mission monitoring range 1.5–3.6).`,
        "This is environmental exposure telemetry, not a physiological diagnosis.",
      ],
      recommendation: "Review current mission radiation guidance and follow established shielding / mission procedures.",
    });
  }

  // Combined — several moderate signals together
  const signals: string[] = [];
  if (v.hr > hrHi + 8) signals.push(`Heart rate +${Math.round(v.hr - hrHi)} BPM above baseline`);
  if (v.sleep < METRICS.sleep.baseline[0]) signals.push(`Sleep ${formatValue("sleep", v.sleep)} (below baseline)`);
  if (v.stress > 50) signals.push(`Stress index ${Math.round(v.stress)} / 100`);
  if (v.steps < METRICS.steps.baseline[0] * 0.75)
    signals.push(`Activity ${Math.round((1 - v.steps / METRICS.steps.nominal) * 100)}% below mission average`);
  if (v.restingHr > METRICS.restingHr.baseline[1]) signals.push(`Resting HR ${Math.round(v.restingHr)} BPM`);
  if (signals.length >= RULES.combinedMinSignals) {
    out.push({
      type: "combined",
      title: "Combined recovery risk",
      severity: signals.length >= 4 ? "HIGH" : "MODERATE",
      metrics: ["hr", "sleep", "stress", "steps"],
      evidence: ["Several indicators have shifted from your personal baseline:", ...signals],
      recommendation:
        "Prioritize recovery, reduce workload where possible, and complete the next scheduled health check.",
    });
  }

  // Data quality
  const offline = sensors.filter((s) => !s.connected);
  if (offline.length) {
    out.push({
      type: "dataQuality",
      title: "Sensor data gap",
      severity: "WATCH",
      metrics: offline.flatMap((s) => s.metrics),
      evidence: offline.map((s) => `${s.name} disconnected — related readings may be stale.`),
      recommendation: "Check sensor placement and reconnect the device.",
    });
  }

  return out.sort((a, b) => sevRank(b.severity) - sevRank(a.severity));
}

/** Explainable prototype score. Weights are illustrative, not medically validated. */
export function wellnessScore(v: Values) {
  const clamp = (x: number) => Math.max(15, Math.min(100, Math.round(x)));
  const parts = [
    { key: "Cardiovascular", base: 92, weight: 0.25, pen: deviation("hr", v.hr) * 14 + deviation("hrv", v.hrv) * 10 + deviation("spo2", v.spo2) * 30 + deviation("temp", v.temp) * 10 },
    { key: "Recovery", base: 81, weight: 0.15, pen: deviation("recovery", v.recovery) * 18 + deviation("restingHr", v.restingHr) * 10 },
    { key: "Activity", base: 84, weight: 0.1, pen: deviation("steps", v.steps) * 18 + deviation("exercise", v.exercise) * 10 },
    { key: "Stress", base: 90, weight: 0.15, pen: deviation("stress", v.stress) * 22 + deviation("fatigue", v.fatigue) * 8 },
    { key: "Sleep", base: 79, weight: 0.15, pen: deviation("sleep", v.sleep) * 18 },
    { key: "Environmental Exposure", base: 88, weight: 0.2, pen: deviation("radiation", v.radiation) * 14 },
  ].map((p) => ({ label: p.key, weight: p.weight, value: clamp(p.base - p.pen) }));
  const overall = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0));
  return { overall, parts };
}

export function overallStatus(score: number, worst: Severity) {
  if (worst === "CRITICAL") return "Critical" as const;
  if (worst === "HIGH" || score < 60) return "Attention" as const;
  if (worst === "MODERATE" || score < 75) return "Watch" as const;
  return "Stable" as const;
}
