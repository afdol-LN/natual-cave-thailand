/**
 * ข้อมูลจำลอง: ทุกค่าคือฟังก์ชันของ (ถ้ำ, เซนเซอร์, เวลา, เวลาเริ่มจำลอง)
 * ไม่มี Math.random → ผลลัพธ์ deterministic ทดสอบได้
 * เวลาเริ่มจำลอง (start) ใช้เป็นจุดยึดของเหตุการณ์ที่เขียนสคริปต์ไว้ให้เห็น alert ตอนเปิดแอป
 */
import { SENSOR_CAVES, getSensorCave } from '../config/caves';
import { SENSOR_KEYS, SENSORS } from '../config/sensors';
import { severity, statusOf } from '../domain/status';
import type { CaveAlert, CaveId, Device, Latest, RangeKey, Reading, SensorKey, Status } from '../domain/types';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// ───────────────────────── deterministic noise ─────────────────────────

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 หนึ่งรอบ → [0, 1) */
export function rand(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function lattice(key: number, i: number): number {
  return rand((key + Math.imul(i, 374761393)) | 0) * 2 - 1;
}

/** value noise ต่อเนื่อง [-1, 1] */
function noise1(key: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lattice(key, i) * (1 - u) + lattice(key, i + 1) * u;
}

// ───────────────────────── signal model ─────────────────────────

const AMP: Record<SensorKey, { diurnal: number; noise: number; slow: number }> = {
  temp: { diurnal: 0.4, noise: 0.3, slow: 0.3 },
  humidity: { diurnal: 1.5, noise: 1.5, slow: 1 },
  co2: { diurnal: 70, noise: 50, slow: 40 },
  o2: { diurnal: 0.08, noise: 0.07, slow: 0.05 },
  water: { diurnal: 2, noise: 3, slow: 5 },
};

/** ทิศทางที่ค่าจะ "แย่ลง" ของแต่ละตัวแปร */
const WORSE_DIR: Record<SensorKey, 1 | -1> = { temp: 1, humidity: -1, co2: 1, o2: -1, water: 1 };

interface Envelope {
  rampStart: number;
  peakStart: number;
  holdEnd: number;
  decayEnd: number;
}

function envelope(t: number, e: Envelope): number {
  if (t <= e.rampStart || t >= e.decayEnd) return 0;
  if (t < e.peakStart) return (t - e.rampStart) / (e.peakStart - e.rampStart);
  if (t <= e.holdEnd) return 1;
  return 1 - (t - e.holdEnd) / (e.decayEnd - e.holdEnd);
}

interface ScriptedEvent {
  caveId: CaveId;
  sensor: SensorKey;
  delta: number;
  /** เวลาเทียบกับ start (ms) */
  rel: Envelope;
}

/** เหตุการณ์ที่เขียนสคริปต์ไว้ (SPEC §8 ข้อ 9) */
export const SCRIPTED_EVENTS: ScriptedEvent[] = [
  // ตรัง: CO₂ พุ่งถึงระดับวิกฤต
  { caveId: 'TRG-001', sensor: 'co2', delta: 1750, rel: { rampStart: -90 * MIN, peakStart: -30 * MIN, holdEnd: 4 * HOUR, decayEnd: 5 * HOUR } },
  // กาญจนบุรี: ระดับน้ำสูง (เฝ้าระวัง)
  { caveId: 'KRI-001', sensor: 'water', delta: 57, rel: { rampStart: -6 * HOUR, peakStart: -1 * HOUR, holdEnd: 6 * HOUR, decayEnd: 8 * HOUR } },
  // เชียงดาว: ความชื้นลดลง (เฝ้าระวัง)
  { caveId: 'CNX-001', sensor: 'humidity', delta: -15, rel: { rampStart: -3 * HOUR, peakStart: -1 * HOUR, holdEnd: 5 * HOUR, decayEnd: 7 * HOUR } },
];

/** อุปกรณ์ที่ขาดการติดต่อ (แสดงสถานะออฟไลน์) */
export const OFFLINE_DEVICES: { caveId: CaveId; sensor: SensorKey; sinceRel: number }[] = [
  { caveId: 'KRI-001', sensor: 'o2', sinceRel: -(2 * HOUR + 20 * MIN) },
];

function offlineSince(caveId: CaveId, sensor: SensorKey, start: number): number | null {
  const d = OFFLINE_DEVICES.find((o) => o.caveId === caveId && o.sensor === sensor);
  return d ? start + d.sinceRel : null;
}

/** เหตุการณ์ผิดปกติย้อนหลังแบบสุ่มเทียม (ใช้ทำกราฟเหตุการณ์รายวัน) */
function historicalDelta(caveId: CaveId, sensor: SensorKey, t: number, start: number): number {
  const key = hashStr(`${caveId}|${sensor}|hist`);
  const def = SENSORS[sensor];
  const base = getSensorCave(caveId).baseline[sensor];
  const dir = WORSE_DIR[sensor];
  const day = Math.floor(t / DAY);
  let total = 0;
  for (const d of [day - 1, day]) {
    const r = rand((key ^ Math.imul(d, 2654435761)) | 0);
    if (r >= 0.09) continue;
    const s0 = d * DAY + Math.floor(rand((key + d * 7919) | 0) * 24) * HOUR;
    const dur = (2 + Math.floor(rand((key + d * 104729) | 0) * 3)) * HOUR;
    const e: Envelope = { rampStart: s0, peakStart: s0 + 40 * MIN, holdEnd: s0 + dur, decayEnd: s0 + dur + 40 * MIN };
    // ไม่ให้ทับช่วงเหตุการณ์สคริปต์รอบเวลาเปิดแอป
    if (e.decayEnd > start - 12 * HOUR && e.rampStart < start + 12 * HOUR) continue;
    const critical = r < 0.015;
    const normalEdge = dir > 0 ? def.normal[1] : def.normal[0];
    const watchEdge = dir > 0 ? def.watch[1] : def.watch[0];
    const target = critical ? watchEdge + dir * Math.abs(watchEdge - normalEdge) * 0.35 : (normalEdge + watchEdge) / 2;
    total += (target - base) * envelope(t, e);
  }
  return total;
}

function scriptedDelta(caveId: CaveId, sensor: SensorKey, t: number, start: number): number {
  let total = 0;
  for (const ev of SCRIPTED_EVENTS) {
    if (ev.caveId !== caveId || ev.sensor !== sensor) continue;
    const r = ev.rel;
    total +=
      ev.delta *
      envelope(t, {
        rampStart: start + r.rampStart,
        peakStart: start + r.peakStart,
        holdEnd: start + r.holdEnd,
        decayEnd: start + r.decayEnd,
      });
  }
  return total;
}

/** ค่าที่เซนเซอร์อ่านได้ ณ เวลา t (null = ไม่มีข้อมูล) */
export function valueAt(caveId: CaveId, sensor: SensorKey, t: number, start: number): number | null {
  const off = offlineSince(caveId, sensor, start);
  if (off != null && t >= off) return null;

  const base = getSensorCave(caveId).baseline[sensor];
  const a = AMP[sensor];
  const key = hashStr(`${caveId}|${sensor}`);
  const localHour = ((t / HOUR + 7) % 24 + 24) % 24; // UTC+7
  const diurnal = a.diurnal * Math.sin((2 * Math.PI * (localHour - 8)) / 24);
  const noise = a.noise * (0.7 * noise1(key, t / (3 * HOUR)) + 0.3 * noise1(key + 1, t / (20 * MIN)));
  const slow = a.slow * noise1(key + 2, t / (5 * DAY));

  let v = base + diurnal + noise + slow + scriptedDelta(caveId, sensor, t, start) + historicalDelta(caveId, sensor, t, start);
  if (sensor === 'humidity') v = Math.min(100, v);
  v = Math.max(0, v);
  const p = 10 ** SENSORS[sensor].decimals;
  return Math.round(v * p) / p;
}

// ───────────────────────── derived data ─────────────────────────

export const RANGE_SPEC: Record<RangeKey, { span: number; step: number }> = {
  '1h': { span: HOUR, step: MIN },
  '24h': { span: DAY, step: 15 * MIN },
  '7d': { span: 7 * DAY, step: HOUR },
  '30d': { span: 30 * DAY, step: 6 * HOUR },
};

export function series(caveId: CaveId, sensor: SensorKey, range: RangeKey, now: number, start: number): Reading[] {
  const { span, step } = RANGE_SPEC[range];
  const end = Math.floor(now / step) * step;
  const out: Reading[] = [];
  for (let t = end - span; t <= end; t += step) out.push({ ts: t, value: valueAt(caveId, sensor, t, start) });
  // จุดสุดท้ายเป็นค่าปัจจุบันเสมอ
  if (end < now) out.push({ ts: now, value: valueAt(caveId, sensor, now, start) });
  return out;
}

/** เวลาที่อุปกรณ์ส่งข้อมูลล่าสุด (ทุก 5 วินาที) */
function lastReportTs(caveId: CaveId, sensor: SensorKey, now: number, start: number): number {
  const off = offlineSince(caveId, sensor, start);
  if (off != null && now >= off) return off - 5000;
  return Math.floor(now / 5000) * 5000;
}

export function latest(caveId: CaveId, sensor: SensorKey, now: number, start: number): Latest {
  const ts = lastReportTs(caveId, sensor, now, start);
  const value = valueAt(caveId, sensor, ts, start);
  return { caveId, sensor, value, ts, status: statusOf(sensor, value, { ts, now }) };
}

export function allLatest(now: number, start: number): Latest[] {
  return SENSOR_CAVES.flatMap((c) => SENSOR_KEYS.map((s) => latest(c.id, s, now, start)));
}

const MODELS: Record<SensorKey, string> = {
  temp: 'CaveSense T-200',
  humidity: 'CaveSense H-210',
  co2: 'NDIR-CO2 S8',
  o2: 'EC-O2 Z4',
  water: 'Ultrasonic WL-60',
};

export function devices(now: number, start: number): Device[] {
  return SENSOR_CAVES.flatMap((c) =>
    SENSOR_KEYS.map((s) => {
      const k = hashStr(`${c.id}|${s}|dev`);
      const isOff = offlineSince(c.id, s, start) != null;
      const l = latest(c.id, s, now, start);
      const drain = ((now - start) / DAY) * 0.5;
      const battery = isOff ? 4 : Math.max(5, Math.round(38 + rand(k) * 60 - drain));
      return {
        id: `${c.id}-${s.toUpperCase()}`,
        caveId: c.id,
        sensor: s,
        model: MODELS[s],
        firmware: `v2.${Math.floor(rand(k + 1) * 4)}.${Math.floor(rand(k + 2) * 10)}`,
        battery,
        signal: isOff ? -110 : Math.round(-62 - rand(k + 3) * 30),
        lastSeen: l.ts,
        status: l.status,
      };
    }),
  );
}

const ALERT_STEP = 10 * MIN;
const ALERT_WINDOW = 7 * DAY;

function alertMessage(sensor: SensorKey, level: Exclude<Status, 'normal'>, peak: number | null): string {
  const def = SENSORS[sensor];
  if (level === 'offline') return `อุปกรณ์${def.label}ขาดการติดต่อ`;
  const dir = WORSE_DIR[sensor] > 0 ? 'สูงเกินเกณฑ์' : 'ต่ำกว่าเกณฑ์';
  const v = peak == null ? '' : ` (${peak.toFixed(def.decimals)} ${def.unit})`;
  return `${def.label}${dir}${level === 'critical' ? 'ระดับวิกฤต' : ''}${v}`;
}

/** สแกนข้อมูลย้อนหลัง 7 วัน รวมช่วงที่ไม่ปกติต่อเนื่องเป็น alert หนึ่งรายการ */
export function alerts(now: number, start: number): CaveAlert[] {
  const end = Math.floor(now / ALERT_STEP) * ALERT_STEP;
  const out: CaveAlert[] = [];
  for (const c of SENSOR_CAVES) {
    for (const s of SENSOR_KEYS) {
      let cur: { start: number; level: Exclude<Status, 'normal'>; peak: number | null } | null = null;
      const flush = (endTs: number | null) => {
        if (!cur) return;
        out.push({
          id: `${c.id}:${s}:${cur.start}`,
          caveId: c.id,
          sensor: s,
          level: cur.level,
          start: cur.start,
          end: endTs,
          peak: cur.peak,
          message: alertMessage(s, cur.level, cur.peak),
        });
        cur = null;
      };
      for (let t = end - ALERT_WINDOW; t <= end; t += ALERT_STEP) {
        const v = valueAt(c.id, s, t, start);
        const st = statusOf(s, v);
        if (st === 'normal') {
          flush(t);
          continue;
        }
        if (!cur) cur = { start: t, level: st, peak: v };
        else {
          if (severity(st) > severity(cur.level)) cur.level = st;
          if (v != null && (cur.peak == null || (v - cur.peak) * WORSE_DIR[s] > 0)) cur.peak = v;
        }
      }
      flush(null);
    }
  }
  return out.sort((a, b) => b.start - a.start);
}

export const SIM_CONST = { MIN, HOUR, DAY };
