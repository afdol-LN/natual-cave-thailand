import type { RefugiaLevel, RiskLevel } from '../../api/analytics';
import { C } from '../../shared/ui';

const REFUGIA_TEXT: Record<RefugiaLevel, [string, string]> = {
  yes: ['Climate Refugia: ศักยภาพสูง', 'ศักยภาพสูง'],
  maybe: ['Climate Refugia: อาจเป็นได้', 'อาจเป็นได้'],
  no: ['ไม่ใช่ Climate Refugia', 'ไม่ใช่'],
};

/** ป้าย Refugia: แยกระดับด้วยรูปแบบขอบ (ทึบ/dashed/ไม่มี) */
export function RefugiaTag({ level, short = false }: { level: RefugiaLevel; short?: boolean }) {
  return (
    <span className={`refugia refugia--${level}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M7 1 L13 5 L13 13 L1 13 L1 5 Z" fill={level === 'yes' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeDasharray={level === 'maybe' ? '2 2' : undefined} />
      </svg>
      {REFUGIA_TEXT[level][short ? 1 : 0]}
    </span>
  );
}

/** ระดับความเสี่ยง: จำนวนช่องทึบ 1–3 */
export function RiskPips({ level }: { level: RiskLevel }) {
  const n = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true" className="pips">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={i * 12 + 0.5} y={0.5} width={9} height={9} rx={1.5} fill={i < n ? C.text : 'none'} stroke={i < n ? C.text : C.faint} />
      ))}
    </svg>
  );
}

/** เกจครึ่งวงกลม 0–100 */
export function Gauge({ value, label }: { value: number | null; label: string }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const R = 80;
  const cx = 100;
  const cy = 96;
  const angle = Math.PI * (1 - v / 100);
  const x = cx + R * Math.cos(angle);
  const y = cy - R * Math.sin(angle);
  const large = 0;
  const ticks = [0, 25, 50, 75, 100];
  return (
    <svg viewBox="0 0 200 120" className="gauge" role="img" aria-label={`${label} ${value ?? '—'} จาก 100`}>
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke={C.line} strokeWidth={14} strokeLinecap="round" />
      {value != null && v > 0 && <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 ${large} 1 ${x} ${y}`} fill="none" stroke={C.text} strokeWidth={14} strokeLinecap="round" />}
      {ticks.map((t) => {
        const a = Math.PI * (1 - t / 100);
        return <line key={t} x1={cx + (R - 12) * Math.cos(a)} y1={cy - (R - 12) * Math.sin(a)} x2={cx + (R - 18) * Math.cos(a)} y2={cy - (R - 18) * Math.sin(a)} stroke={C.faint} strokeWidth={1.5} />;
      })}
      <text x={cx} y={cy - 12} textAnchor="middle" className="gauge__value">
        {value ?? '—'}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="gauge__label">
        {label}
      </text>
    </svg>
  );
}
