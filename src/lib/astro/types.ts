export type MetricKey =
  | "hr"
  | "hrv"
  | "bpSys"
  | "spo2"
  | "resp"
  | "temp"
  | "skinTemp"
  | "sleep"
  | "recovery"
  | "restingHr"
  | "steps"
  | "exercise"
  | "inactivity"
  | "stress"
  | "fatigue"
  | "mood"
  | "cognitive"
  | "radiation";

export type DataSource =
  | "Wearable Sensor"
  | "Simulated Sensor"
  | "NASA Data"
  | "Self Report"
  | "Derived Metric"
  | "Environmental Telemetry";

export type Severity = "NORMAL" | "WATCH" | "MODERATE" | "HIGH" | "CRITICAL";

export type MetricGroup =
  | "Cardiovascular"
  | "Respiratory"
  | "Thermal"
  | "Recovery"
  | "Activity"
  | "Behavioral Wellbeing"
  | "Environment";

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  baseline: [number, number];
  nominal: number;
  decimals: number;
  source: DataSource;
  sensorId?: string;
  amp: number;
  worse: "high" | "low" | "both";
  group: MetricGroup;
  format?: (v: number) => string;
}

export interface HealthReading {
  metric: MetricKey;
  value: number;
  unit: string;
  timestamp: string;
  source: DataSource;
  sensorId?: string;
  confidence: number;
  baseline: [number, number];
  status: "Within baseline" | "Above baseline" | "Below baseline";
}

export interface RiskFinding {
  type: string;
  title: string;
  severity: Severity;
  metrics: MetricKey[];
  evidence: string[];
  recommendation: string;
}

export interface RiskEvent extends RiskFinding {
  id: string;
  detectedAt: string;
  acknowledged: boolean;
  autoReported: boolean;
}

export type TransmissionStatus = "Draft" | "Transmitting" | "Sent";

export interface HealthReport {
  id: string;
  createdAt: string;
  missionDay: number;
  crewId: string;
  score: number;
  metrics: { label: string; value: string }[];
  risks: { title: string; severity: Severity; evidence: string[] }[];
  recommendations: string[];
  sensorSummary: string;
  transmissionStatus: TransmissionStatus;
  auto: boolean;
  eventId?: string;
}

export interface Sensor {
  id: string;
  name: string;
  connected: boolean;
  battery: number;
  signal: "Excellent" | "Good" | "Fair" | "Poor";
  lastReadingSec: number;
  metrics: MetricKey[];
}

export interface CheckIn {
  feeling: "Great" | "Good" | "Okay" | "Tired" | "Unwell";
  energy: number;
  stress: number;
  mood: number;
  sleepQuality: number;
  submittedAt: string;
}

export interface Settings {
  theme: "light" | "dark";
  healthAlerts: boolean;
  autoReport: boolean;
  sensorAlerts: boolean;
  nasaSync: boolean;
  sensorSync: boolean;
  simulationMode: boolean;
  localData: boolean;
  retentionDays: number;
  missionDay: number;
  crewId: string;
  missionName: string;
}
