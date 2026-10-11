/**
 * ชั้นข้อมูล: UI เรียกผ่าน hooks/queries.ts → ไฟล์นี้เท่านั้น
 * ต่อ API จริงได้โดยแก้เฉพาะโฟลเดอร์ api/ (ลายเซ็นฟังก์ชันคงเดิม)
 */
import { SENSOR_CAVES, getSensorCave } from '../config/caves';
import { getBioSnapshot } from '../biodb';
import type { CaveAlert, CaveId, Device, Latest, RangeKey, Reading, Scenario, SensorKey } from '../domain/types';
import * as an from './analytics';
import * as sim from './simulator';

/** จุดยึดของข้อมูลจำลอง: เวลาเปิดแอป */
export const SIM_START = Date.now();

const LATENCY = 120;
function respond<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fn()), LATENCY));
}

// alert scan ค่อนข้างหนัก → แคชตามช่วง 1 นาที
let alertCache: { bucket: number; data: CaveAlert[] } | null = null;
function computeAlerts(now: number): CaveAlert[] {
  const bucket = Math.floor(now / 60_000);
  if (!alertCache || alertCache.bucket !== bucket) alertCache = { bucket, data: sim.alerts(now, SIM_START) };
  return alertCache.data;
}

export function getLatest(caveId?: CaveId): Promise<Latest[]> {
  return respond(() => {
    const all = sim.allLatest(Date.now(), SIM_START);
    return caveId ? all.filter((l) => l.caveId === caveId) : all;
  });
}

export function getSeries(caveId: CaveId, sensor: SensorKey, range: RangeKey): Promise<Reading[]> {
  return respond(() => sim.series(caveId, sensor, range, Date.now(), SIM_START));
}

export function getDevices(caveId?: CaveId): Promise<Device[]> {
  return respond(() => {
    const all = sim.devices(Date.now(), SIM_START);
    return caveId ? all.filter((d) => d.caveId === caveId) : all;
  });
}

export function getAlerts(caveId?: CaveId): Promise<CaveAlert[]> {
  return respond(() => {
    const all = computeAlerts(Date.now());
    return caveId ? all.filter((a) => a.caveId === caveId) : all;
  });
}

export interface CaveAnalytics {
  caveId: CaveId;
  health: number;
  vulnerability: an.VulnerabilityResult;
  refugia: ReturnType<typeof an.climateRefugia>;
  speciesRisk: an.SpeciesRisk[];
  /** ดัชนี 7 มิติ 0..1 สำหรับ radar */
  indices: an.CaveIndices;
}

function analyticsFor(caveId: CaveId, latest: Latest[], bio: ReturnType<typeof getBioSnapshot>): CaveAnalytics {
  const own = latest.filter((l) => l.caveId === caveId);
  const health = an.healthIndex(own);
  const vulnerability = an.vulnerability(caveId, health);
  const refugia = an.climateRefugia(vulnerability, getSensorCave(caveId).mockIndices.buffering);
  const speciesRisk = an.speciesRisk(caveId, own, bio.species, bio.occurrences);
  return {
    caveId,
    health,
    vulnerability,
    refugia,
    speciesRisk,
    indices: an.caveIndices(caveId, health, vulnerability, refugia.score, speciesRisk),
  };
}

export function getAnalytics(): Promise<CaveAnalytics[]> {
  return respond(() => {
    const latest = sim.allLatest(Date.now(), SIM_START);
    const bio = getBioSnapshot();
    return SENSOR_CAVES.map((c) => analyticsFor(c.id, latest, bio));
  });
}

export function getDailyAnomalies(days = 7): Promise<an.DailyCount[]> {
  return respond(() => {
    const now = Date.now();
    return an.dailyAnomalies(computeAlerts(now), now, days);
  });
}

export function getForecast(caveId: CaveId, sensor: SensorKey): Promise<Record<Scenario, an.ForecastPoint[]>> {
  return respond(() => ({
    low: an.forecastSeries(caveId, sensor, 'low'),
    mid: an.forecastSeries(caveId, sensor, 'mid'),
    high: an.forecastSeries(caveId, sensor, 'high'),
  }));
}
