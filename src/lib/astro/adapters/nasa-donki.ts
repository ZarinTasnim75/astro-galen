/**
 * External data adapter: NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information).
 * Real public API. Provides space-environment context only — never physiological data.
 * Swap DEMO_KEY for a project key in production.
 */
export interface SpaceWeatherSummary {
  flares: { id: string; classType: string; peakTime: string }[];
  sepCount: number;
  fetchedAt: string;
}

const BASE = "https://api.nasa.gov/DONKI";

function range(days: number) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return `startDate=${f(start)}&endDate=${f(end)}`;
}

export async function fetchSpaceWeather(): Promise<SpaceWeatherSummary> {
  const q = range(30);
  const [flr, sep] = await Promise.all([
    fetch(`${BASE}/FLR?${q}&api_key=DEMO_KEY`).then((r) => (r.ok ? r.json() : [])),
    fetch(`${BASE}/SEP?${q}&api_key=DEMO_KEY`).then((r) => (r.ok ? r.json() : [])),
  ]);
  const flares = (Array.isArray(flr) ? flr : [])
    .map((x: { flrID: string; classType: string; peakTime: string }) => ({ id: x.flrID, classType: x.classType, peakTime: x.peakTime }))
    .reverse();
  return { flares, sepCount: Array.isArray(sep) ? sep.length : 0, fetchedAt: new Date().toISOString() };
}
