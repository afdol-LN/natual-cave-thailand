import { CAVE_TYPES, labelOf, PROTECTION_STATUSES } from '../../config/inventory-options';
import { districtName } from '../../domain/admin';
import type { CaveRecord } from '../../domain/types';

/** สรุปข้อมูลทะเบียนสั้น ๆ ใช้แทนค่าเซนเซอร์สำหรับถ้ำที่ไม่มีเซนเซอร์ */
export default function InventorySummary({ cave, compact = false }: { cave: CaveRecord; compact?: boolean }) {
  const i = cave.inventory;
  const rows: [string, string][] = [
    ['ประเภทถ้ำ', labelOf(CAVE_TYPES, i.caveType)],
    ['อำเภอ', districtName(i.admin.districtCode)],
    ['การคุ้มครอง', labelOf(PROTECTION_STATUSES, i.protection.status)],
  ];
  return (
    <dl className={compact ? 'inv-summary inv-summary--compact' : 'readings'}>
      {rows.map(([k, v]) => (
        <div key={k} className={compact ? undefined : 'readings__row'}>
          <dt>{k}</dt>
          <dd>{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
