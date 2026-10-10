import { SENSORS } from '../config/sensors';
import type { RangeKey, SensorKey } from './types';

const nf = new Map<number, Intl.NumberFormat>();
function numberFormat(decimals: number) {
  let f = nf.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    nf.set(decimals, f);
  }
  return f;
}

export function fmtNum(v: number | null | undefined, decimals = 0): string {
  if (v == null || Number.isNaN(v)) return '—';
  return numberFormat(decimals).format(v);
}

export function fmtValue(sensor: SensorKey, v: number | null | undefined): string {
  return fmtNum(v, SENSORS[sensor].decimals);
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtDay(ts: number): string {
  return new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

export function fmtAxisTime(ts: number, range: RangeKey): string {
  return range === '1h' || range === '24h' ? fmtTime(ts) : fmtDay(ts);
}

export function fmtAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s} วินาทีที่แล้ว`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} ชม.ที่แล้ว`;
  return `${Math.round(h / 24)} วันที่แล้ว`;
}

export function fmtDuration(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} นาที`;
  const h = Math.floor(m / 60);
  return `${h} ชม. ${m % 60} นาที`;
}

export const RANGE_LABEL: Record<RangeKey, string> = { '1h': '1 ชม.', '24h': '24 ชม.', '7d': '7 วัน', '30d': '30 วัน' };
