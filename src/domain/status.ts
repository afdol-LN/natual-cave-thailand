import { SENSORS } from '../config/sensors';
import type { SensorKey, Status } from './types';

/** ข้อมูลเก่ากว่านี้ถือว่าอุปกรณ์ออฟไลน์ */
export const OFFLINE_AFTER_MS = 15 * 60 * 1000;

const SEVERITY: Record<Status, number> = { normal: 0, offline: 1, watch: 2, critical: 3 };

/** จุดเดียวที่ตัดสินสถานะของค่าเซนเซอร์ ทุกหน้าต้องเรียกฟังก์ชันนี้ */
export function statusOf(
  sensor: SensorKey,
  value: number | null | undefined,
  opts: { ts?: number; now?: number } = {},
): Status {
  if (value == null || Number.isNaN(value)) return 'offline';
  if (opts.ts != null && opts.now != null && opts.now - opts.ts > OFFLINE_AFTER_MS) return 'offline';
  const def = SENSORS[sensor];
  if (value >= def.normal[0] && value <= def.normal[1]) return 'normal';
  if (value >= def.watch[0] && value <= def.watch[1]) return 'watch';
  return 'critical';
}

export function severity(s: Status): number {
  return SEVERITY[s];
}

/** สถานะที่แย่ที่สุดในรายการ (ออฟไลน์ทั้งหมด = offline) */
export function worstStatus(list: Status[]): Status {
  if (list.length === 0) return 'offline';
  if (list.every((s) => s === 'offline')) return 'offline';
  return list.reduce<Status>((a, b) => (severity(b) > severity(a) ? b : a), 'normal');
}

export const STATUS_LABEL: Record<Status, string> = {
  normal: 'ปกติ',
  watch: 'เฝ้าระวัง',
  critical: 'วิกฤต',
  offline: 'ออฟไลน์',
};
