/** ตรรกะทะเบียนถ้ำแบบบริสุทธิ์ (ไม่มี React / storage) — ทดสอบได้ */
import { CAVE_TYPES, HYDRO_TYPES, KARST_TYPES, labelOf, MORPHOLOGIES, PROTECTION_STATUSES, THREAT_LEVELS, THREATS, TOURISM_STATUSES } from '../config/inventory-options';
import { districtName, provinceName } from './admin';
import type { CaveRecord, ThreatKey, ThreatLevel } from './types';

/** ส่วนที่เก็บใน localStorage */
export interface RegistryData {
  /** ช่องที่ถูกแก้ของถ้ำตั้งต้น */
  edits: Record<string, Partial<CaveRecord>>;
  /** ถ้ำที่เพิ่มใหม่ */
  added: CaveRecord[];
}

/** ช่องของถ้ำตั้งต้นที่ผู้ใช้แก้ได้ */
export const EDITABLE_KEYS = ['name', 'nameEn', 'lat', 'lon', 'coordsVerified', 'province', 'region', 'inventory'] as const;

/** ตัดให้เหลือเฉพาะช่องของ CaveRecord (ถ้ำตั้งต้นมีข้อมูลเซนเซอร์ติดมา) */
export function toRecord(c: CaveRecord): CaveRecord {
  const { id, name, nameEn, lat, lon, coordsVerified, province, region, hasSensors, origin, edited, inventory } = c;
  return { id, name, nameEn, lat, lon, coordsVerified, province, region, hasSensors, origin, edited, inventory };
}

export function mergeRegistry<T extends CaveRecord>(seeds: T[], data: RegistryData): CaveRecord[] {
  const merged: CaveRecord[] = seeds.map((s) => {
    const e = data.edits[s.id];
    return e ? { ...s, ...e, id: s.id, origin: 'seed', hasSensors: s.hasSensors, edited: true } : s;
  });
  return [...merged, ...data.added];
}

export function nextCaveId(existing: string[]): string {
  const max = existing.reduce((m, id) => {
    const n = /^CAVE-(\d+)$/.exec(id);
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `CAVE-${String(max + 1).padStart(4, '0')}`;
}

const LEVEL_RANK: Record<ThreatLevel, number> = { low: 1, medium: 2, high: 3 };

/** ภัยคุกคามรวมเป็นข้อความ เรียงตามลำดับในรายการภัย */
export function threatSummary(threats: Partial<Record<ThreatKey, ThreatLevel>>): string {
  return THREATS.filter((t) => threats[t.value])
    .map((t) => `${t.label}:${labelOf(THREAT_LEVELS, threats[t.value])}`)
    .join('; ');
}

/** ระดับภัยคุกคามสูงสุดของถ้ำ */
export function maxThreat(threats: Partial<Record<ThreatKey, ThreatLevel>>): ThreatLevel | undefined {
  return Object.values(threats).reduce<ThreatLevel | undefined>((m, l) => (l && (!m || LEVEL_RANK[l] > LEVEL_RANK[m]) ? l : m), undefined);
}

export function csvRows(caves: CaveRecord[]): (string | number | null)[][] {
  const head = [
    'รหัสถ้ำ', 'ชื่อถ้ำ', 'ชื่อภาษาอังกฤษ', 'ประเภทถ้ำ', 'ละติจูด', 'ลองจิจูด', 'ภาค', 'จังหวัด', 'อำเภอ',
    'ภูมิประเทศคาสต์', 'ชนิดหิน', 'ยุคทางธรณีวิทยา', 'หมวดหิน', 'สัณฐานถ้ำ',
    'ความยาว (ม.)', 'ความลึก (ม.)', 'ความสูงจากระดับน้ำทะเล (ม.)', 'จำนวนชั้น', 'ความกว้างปากถ้ำ (ม.)',
    'อุทกวิทยา', 'คำอธิบายอุทกวิทยา', 'สถานภาพการคุ้มครอง', 'หน่วยงานที่ดูแล', 'สถานภาพการท่องเที่ยว', 'นักท่องเที่ยวต่อปี',
    'ภัยคุกคาม', 'เซนเซอร์', 'แผนที่ถ้ำ', 'ทัวร์ 3D', 'แหล่งข้อมูล', 'หมายเหตุ',
  ];
  const rows = caves.map((c) => {
    const i = c.inventory;
    return [
      c.id, c.name, c.nameEn ?? '', labelOf(CAVE_TYPES, i.caveType), c.lat, c.lon, c.region, provinceName(i.admin.provinceCode), districtName(i.admin.districtCode),
      labelOf(KARST_TYPES, i.karst), i.geology.rockType ?? '', i.geology.era ?? '', i.geology.formation ?? '',
      i.morphology.map((m) => labelOf(MORPHOLOGIES, m)).join('; '),
      i.dimensions.lengthM ?? null, i.dimensions.depthM ?? null, i.dimensions.elevationM ?? null, i.dimensions.levels ?? null, i.dimensions.entranceWidthM ?? null,
      labelOf(HYDRO_TYPES, i.hydrology.type), i.hydrology.note ?? '', labelOf(PROTECTION_STATUSES, i.protection.status), i.protection.agency ?? '',
      labelOf(TOURISM_STATUSES, i.tourism.status), i.tourism.visitorsPerYear ?? null,
      threatSummary(i.threats), c.hasSensors ? 'มี' : 'ไม่มี', i.mapImage ?? '', i.tourUrl ?? '', i.source ?? '', i.note ?? '',
    ];
  });
  return [head, ...rows];
}

export function exportJson(caves: CaveRecord[], now = new Date()): string {
  return JSON.stringify({ exportedAt: now.toISOString(), caves: caves.map(toRecord) }, null, 2);
}
