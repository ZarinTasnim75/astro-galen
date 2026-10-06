import type { MetricKey } from "./types";

export type ScenarioId =
  | "normal"
  | "elevatedHr"
  | "lowSpo2"
  | "highTemp"
  | "sleepDep"
  | "highStress"
  | "radiation"
  | "multi";

export interface Scenario {
  id: ScenarioId;
  label: string;
  summary: string;
  targets: Partial<Record<MetricKey, number>>;
}

export const SCENARIOS: Scenario[] = [
  { id: "normal", label: "Normal State", summary: "All indicators near personal baseline.", targets: {} },
  { id: "elevatedHr", label: "Elevated Heart Rate", summary: "HR rises from 72 → 112 BPM and stays elevated.", targets: { hr: 112, stress: 46, hrv: 48, resp: 19 } },
  { id: "lowSpo2", label: "Low SpO₂", summary: "Oxygen saturation drifts below threshold.", targets: { spo2: 89, resp: 20, hr: 84 } },
  { id: "highTemp", label: "High Temperature", summary: "Core and skin temperature increase.", targets: { temp: 38.4, skinTemp: 35.7, hr: 88 } },
  { id: "sleepDep", label: "Sleep Deprivation", summary: "4h 52m sleep, high stress, elevated resting HR.", targets: { sleep: 4.87, stress: 72, restingHr: 68, recovery: 58, fatigue: 70, cognitive: 84 } },
  { id: "highStress", label: "High Stress", summary: "Sustained stress with reduced HRV.", targets: { stress: 82, hrv: 38, hr: 86, fatigue: 52 } },
  { id: "radiation", label: "Radiation Alert", summary: "Environmental dose rises (e.g. solar particle event).", targets: { radiation: 9.8 } },
  { id: "multi", label: "Multiple Risk Event", summary: "Elevated HR + poor sleep + high stress + low activity.", targets: { hr: 92, sleep: 5.2, stress: 76, steps: 3100, restingHr: 67, recovery: 55, fatigue: 68, exercise: 40 } },
];
