/** ผลวิเคราะห์เชิงตัดสินใจ (mock) คำนวณจากข้อมูลล่าสุด + ค่าตั้งต้นใน config */
import { getSensorCave, SENSOR_CAVES } from '../config/caves';
import { SENSORS } from '../config/sensors';
import type { CaveAlert, CaveId, Latest, Scenario, SensorKey, Species, SpeciesOccurrence, Status } from '../domain/types';

const STATUS_PENALTY: Record<Status, number> = { normal: 0, watch: 15, critical: 35, offline: 8 };

/** ดัชนีสุขภาพถ้ำ 0–100 */
export function healthIndex(latest: Latest[]): number {
  if (latest.length === 0) return 0;
  let score = 100;
  for (const l of latest) {
    score -= STATUS_PENALTY[l.status];
    if (l.status === 'normal' && l.value != null) {
      const [lo, hi] = SENSORS[l.sensor].normal;
      const half = (hi - lo) / 2;
      score -= (Math.abs(l.value - (lo + half)) / half) * 3;
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export interface VulnerabilityResult {
  exposure: number;
  sensitivity: number;
  adaptiveCapacity: number;
  /** 0..1 สูง = เปราะบาง */
  index: number;
}

export function vulnerability(caveId: CaveId, health: number): VulnerabilityResult {
  const v = getSensorCave(caveId).vulnerability;
  const exposure = Math.min(1, v.exposure + ((100 - health) / 100) * 0.3);
  const index = (exposure + v.sensitivity + (1 - v.adaptiveCapacity)) / 3;
  return { exposure, sensitivity: v.sensitivity, adaptiveCapacity: v.adaptiveCapacity, index };
}

export type RefugiaLevel = 'yes' | 'maybe' | 'no';
/** Climate Refugia (mock): ครึ่งหนึ่งจากความไม่เปราะบาง อีกครึ่งจากความสามารถบัฟเฟอร์ภูมิอากาศ */
export function climateRefugia(vuln: VulnerabilityResult, buffering: number): { level: RefugiaLevel; label: string; score: number } {
  const score = 0.5 * (1 - vuln.index) + 0.5 * buffering;
  if (score >= 0.6) return { level: 'yes', label: 'Climate Refugia: ศักยภาพสูง', score };
  if (score >= 0.45) return { level: 'maybe', label: 'Climate Refugia: อาจเป็นได้', score };
  return { level: 'no', label: 'ไม่ใช่ Climate Refugia', score };
}

// ───────────── forecast ─────────────

/** อัตราเปลี่ยนต่อปีตาม scenario (สมมติ) */
const TREND: Record<SensorKey, Record<Scenario, number>> = {
  temp: { low: 0.012, mid: 0.025, high: 0.045 },
  humidity: { low: -0.03, mid: -0.07, high: -0.13 },
  co2: { low: 3, mid: 6, high: 11 },
  o2: { low: -0.002, mid: -0.004, high: -0.008 },
  water: { low: 0.15, mid: 0.4, high: 0.8 },
};
const UNCERT: Record<SensorKey, number> = { temp: 0.6, humidity: 3, co2: 180, o2: 0.15, water: 10 };

export const FORECAST_START = 2026;
export const FORECAST_END = 2060;

export interface ForecastPoint {
  year: number;
  mean: number;
  lo: number;
  hi: number;
}

export function forecastSeries(caveId: CaveId, sensor: SensorKey, scenario: Scenario): ForecastPoint[] {
  const base = getSensorCave(caveId).baseline[sensor];
  const sens = getSensorCave(caveId).vulnerability.sensitivity;
  const rate = TREND[sensor][scenario] * (0.7 + sens * 0.6);
  const out: ForecastPoint[] = [];
  for (let y = FORECAST_START; y <= FORECAST_END; y++) {
    const n = y - FORECAST_START;
    const mean = base + rate * n;
    const u = UNCERT[sensor] * Math.sqrt(n / (FORECAST_END - FORECAST_START)) * (scenario === 'high' ? 1.3 : 1);
    out.push({ year: y, mean, lo: mean - u, hi: mean + u });
  }
  return out;
}

// ───────────── species ─────────────

export type RiskLevel = 'low' | 'medium' | 'high';
export interface SpeciesRisk {
  species: Species;
  occurrence: SpeciesOccurrence;
  score: number;
  level: RiskLevel;
  driver: SensorKey | null;
}

const STRESS: Record<Status, number> = { normal: 0.15, watch: 0.6, critical: 1, offline: 0.35 };

export function speciesRisk(caveId: CaveId, latest: Latest[], allSpecies: Species[], occurrences: SpeciesOccurrence[]): SpeciesRisk[] {
  const stress = new Map<SensorKey, number>(latest.filter((l) => l.caveId === caveId).map((l) => [l.sensor, STRESS[l.status]]));
  const byId = new Map(allSpecies.map((s) => [s.id, s]));
  return occurrences
    .filter((o) => o.caveId === caveId && byId.has(o.speciesId))
    .map((occurrence) => {
      const species = byId.get(occurrence.speciesId)!;
      let score = 0;
      let driver: SensorKey | null = null;
      for (const [k, sens] of Object.entries(species.sensitivity) as [SensorKey, number][]) {
        const v = sens * (stress.get(k) ?? 0.15);
        if (v > score) {
          score = v;
          driver = k;
        }
      }
      if (species.endemism !== 'none') score += 0.1;
      if (occurrence.abundance === 'rare') score += 0.05;
      score = Math.min(1, score);
      const level: RiskLevel = score >= 0.6 ? 'high' : score >= 0.3 ? 'medium' : 'low';
      return { species, occurrence, score, level, driver };
    })
    .sort((a, b) => b.score - a.score);
}

export const RISK_LABEL: Record<RiskLevel, string> = { low: 'ต่ำ', medium: 'ปานกลาง', high: 'สูง' };

// ───────────── anomalies ─────────────

export interface DailyCount {
  day: number;
  counts: Record<CaveId, number>;
}

/** จำนวนเหตุการณ์ผิดปกติ (ไม่นับออฟไลน์) ที่เริ่มในแต่ละวัน ย้อนหลัง n วัน (เวลาท้องถิ่น UTC+7) */
export function dailyAnomalies(alerts: CaveAlert[], now: number, days = 7): DailyCount[] {
  const TZ = 7 * 3600_000;
  const DAY = 86_400_000;
  const today = Math.floor((now + TZ) / DAY);
  const out: DailyCount[] = [];
  for (let d = today - days + 1; d <= today; d++) {
    out.push({ day: d * DAY - TZ, counts: Object.fromEntries(SENSOR_CAVES.map((c) => [c.id, 0])) });
  }
  for (const a of alerts) {
    if (a.level === 'offline') continue;
    const d = Math.floor((a.start + TZ) / DAY);
    const row = out[d - (today - days + 1)];
    if (row) row.counts[a.caveId] += 1;
  }
  return out;
}

// ───────────── 7-dimension cave indices (radar) ─────────────

export const INDEX_KEYS = ['chi', 'cvi', 'cbi', 'esi', 'bii', 'sva', 'cra'] as const;
export type IndexKey = (typeof INDEX_KEYS)[number];

export interface IndexDef {
  abbr: string;
  name: string;
  th: string;
  /** false = ค่าสูงหมายถึงแย่ (เปราะบาง) */
  higherIsBetter: boolean;
  mock: boolean;
}

export const INDEX_DEF: Record<IndexKey, IndexDef> = {
  chi: { abbr: 'CHI', name: 'Cave Health Index', th: 'ดัชนีสุขภาพถ้ำ (จากเซนเซอร์ทั้ง 5)', higherIsBetter: true, mock: false },
  cvi: { abbr: 'CVI', name: 'Climate Vulnerability Index', th: 'ความเปราะบางต่อภูมิอากาศ', higherIsBetter: false, mock: true },
  cbi: { abbr: 'CBI', name: 'Climate Buffering Index', th: 'ความสามารถบัฟเฟอร์ภูมิอากาศ', higherIsBetter: true, mock: true },
  esi: { abbr: 'ESI', name: 'Ecosystem Stability Index', th: 'เสถียรภาพระบบนิเวศ', higherIsBetter: true, mock: true },
  bii: { abbr: 'BII', name: 'Biodiversity Integrity Index', th: 'ความสมบูรณ์ความหลากหลายทางชีวภาพ', higherIsBetter: true, mock: true },
  sva: { abbr: 'SVA', name: 'Species Vulnerability Assessment', th: 'ความเปราะบางของชนิดพันธุ์', higherIsBetter: false, mock: true },
  cra: { abbr: 'CRA', name: 'Climate Refugia Assessment', th: 'ศักยภาพเป็นพื้นที่หลบภัยภูมิอากาศ', higherIsBetter: true, mock: true },
};

export type CaveIndices = Record<IndexKey, number>;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** ดัชนี 7 มิติ ทุกค่า normalize เป็น 0..1 */
export function caveIndices(caveId: CaveId, health: number, vuln: VulnerabilityResult, refugiaScore: number, risks: SpeciesRisk[]): CaveIndices {
  const m = getSensorCave(caveId).mockIndices;
  return {
    chi: clamp01(health / 100),
    cvi: clamp01(vuln.index),
    cbi: clamp01(m.buffering),
    esi: clamp01(m.stability),
    bii: clamp01(m.biodiversity),
    sva: clamp01(risks.length ? risks.reduce((s, r) => s + r.score, 0) / risks.length : 0),
    cra: clamp01(refugiaScore),
  };
}
