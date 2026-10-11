/** รวมระเบียนตั้งต้นกับข้อมูลใน localStorage (ใช้กับชนิดพันธุ์และการพบ) */
import type { Seeded } from './types';

export interface SeededData<T extends Seeded> {
  /** ช่องที่แก้ของระเบียนตั้งต้น */
  edits: Record<string, Partial<T>>;
  /** ระเบียนที่เพิ่มใหม่ */
  added: T[];
}

export function mergeSeeded<T extends Seeded>(seeds: T[], data: SeededData<T>): T[] {
  const merged = seeds.map((s) => {
    const e = data.edits[s.id];
    return e ? { ...s, ...e, id: s.id, origin: 'seed' as const, edited: true } : s;
  });
  return [...merged, ...data.added];
}

/** รหัสถัดไป เช่น nextId('SP', ['SP-0002']) → 'SP-0003' */
export function nextId(prefix: string, existing: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  const max = existing.reduce((m, id) => {
    const n = re.exec(id);
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}
