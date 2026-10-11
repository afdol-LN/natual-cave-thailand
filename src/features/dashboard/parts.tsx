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
        <rect key={i} x={i * 12 + 0.5} y={0.5} width={9} height={9} rx={1.5} fill={i < n ? C.accent : 'none'} stroke={i < n ? C.accent : C.faint} />
      ))}
    </svg>
  );
}
