import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SENSORS } from '../config/sensors';
import { fmtValue, RANGE_LABEL } from '../domain/format';
import { STATUS_LABEL } from '../domain/status';
import type { CaveId, RangeKey, Reading, SensorKey, Status } from '../domain/types';
import type { IconType } from 'react-icons';
import { LuCloud, LuDroplets, LuThermometer, LuTriangleAlert, LuWaves, LuWind } from 'react-icons/lu';
import { useCaveList } from '../registry';
import { useUi } from '../store';

/**
 * สีสำหรับ SVG/Recharts — อ้างตัวแปรจาก tokens.css เท่านั้น
 * สถานะแยกด้วย "รูปทรง" ไม่ใช่เฉดสี (SPEC §1)
 */
export const C = {
  bg: 'var(--c-bg)',
  surface: 'var(--c-surface)',
  surface2: 'var(--c-surface-2)',
  line: 'var(--c-line)',
  lineStrong: 'var(--c-line-strong)',
  text: 'var(--c-text)',
  accent: 'var(--c-accent)',
  muted: 'var(--c-text-muted)',
  faint: 'var(--c-text-faint)',
} as const;

/** รูปแบบเส้นแยก series (ทึบ / dashed / dotted) */
export const SERIES_DASH = ['0', '7 4', '2 3'] as const;
export const SERIES_MARKER = ['circle', 'square', 'diamond'] as const;
export type MarkerShape = (typeof SERIES_MARKER)[number];

// ───────────────────────── Status ─────────────────────────

/** รูปทรงสถานะ: ● ปกติ / ○ เฝ้าระวัง / ▲ วิกฤต / ⊘ ออฟไลน์ */
export function StatusGlyph({ status, size = 12, pulse = true }: { status: Status; size?: number; pulse?: boolean }) {
  const s = size;
  const r = s / 2;
  return (
    <svg
      className={`glyph glyph--${status}${pulse && status === 'critical' ? ' pulse' : ''}`}
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      aria-hidden="true"
    >
      {status === 'normal' && <circle cx={r} cy={r} r={r - 1} fill={C.accent} />}
      {status === 'watch' && <circle cx={r} cy={r} r={r - 1.5} fill="none" stroke={C.accent} strokeWidth={2} />}
      {status === 'critical' && <polygon points={`${r},1 ${s - 1},${s - 1} 1,${s - 1}`} fill="currentColor" />}
      {status === 'offline' && (
        <>
          <circle cx={r} cy={r} r={r - 1.5} fill="none" stroke={C.faint} strokeWidth={1.5} />
          <line x1={2} y1={s - 2} x2={s - 2} y2={2} stroke={C.faint} strokeWidth={1.5} />
        </>
      )}
    </svg>
  );
}

/** criticalIcon: แสดงสถานะวิกฤตเป็นไอคอนเตือนแทนข้อความ (ข้อความยังอยู่สำหรับ screen reader) */
/** ป้ายสำหรับถ้ำที่ยังไม่มีเซนเซอร์ (ถ้ำที่เพิ่มในทะเบียน) */
export function NoSensorBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`badge badge--nosensor${compact ? ' badge--compact' : ''}`}>
      <span className="nosensor-dot" aria-hidden="true" />
      <span className="badge__label">ไม่มีเซนเซอร์</span>
    </span>
  );
}

export function StatusBadge({ status, compact = false, criticalIcon = false }: { status: Status; compact?: boolean; criticalIcon?: boolean }) {
  if (criticalIcon && status === 'critical') {
    return (
      <span className="badge badge--critical badge--icon" role="status" aria-label={STATUS_LABEL[status]} title={STATUS_LABEL[status]}>
        <LuTriangleAlert size={compact ? 16 : 18} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={`badge badge--${status}${compact ? ' badge--compact' : ''}`} role="status">
      <StatusGlyph status={status} size={compact ? 10 : 12} />
      <span className="badge__label">{STATUS_LABEL[status]}</span>
    </span>
  );
}

/** จุดบนกราฟ: วาดเฉพาะจุดที่ไม่ปกติ ตามรูปทรงสถานะ */
export function StatusDot(props: { cx?: number; cy?: number; status?: Status; size?: number }) {
  const { cx, cy, status, size = 10 } = props;
  if (cx == null || cy == null || !status || status === 'normal') return null;
  const r = size / 2;
  if (status === 'critical')
    return <polygon points={`${cx},${cy - r} ${cx + r},${cy + r * 0.8} ${cx - r},${cy + r * 0.8}`} fill={C.accent} stroke={C.bg} strokeWidth={1} />;
  if (status === 'watch') return <circle cx={cx} cy={cy} r={r - 1} fill={C.bg} stroke={C.accent} strokeWidth={2} />;
  return <circle cx={cx} cy={cy} r={r - 2} fill={C.bg} stroke={C.faint} strokeWidth={1.5} />;
}

export function SeriesMarker({ cx, cy, shape, size = 7, filled = true }: { cx?: number; cy?: number; shape: MarkerShape; size?: number; filled?: boolean }) {
  if (cx == null || cy == null) return null;
  const r = size / 2;
  const fill = filled ? C.accent : C.bg;
  if (shape === 'square') return <rect x={cx - r} y={cy - r} width={size} height={size} fill={fill} stroke={C.accent} strokeWidth={1.5} />;
  if (shape === 'diamond')
    return <polygon points={`${cx},${cy - r - 1} ${cx + r + 1},${cy} ${cx},${cy + r + 1} ${cx - r - 1},${cy}`} fill={fill} stroke={C.accent} strokeWidth={1.5} />;
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={C.accent} strokeWidth={1.5} />;
}

export function LegendSwatch({ index, label }: { index: number; label: string }) {
  return (
    <span className="legend-item">
      <svg width={30} height={12} aria-hidden="true">
        <line x1={0} y1={6} x2={30} y2={6} stroke={C.accent} strokeWidth={2} strokeDasharray={SERIES_DASH[index % 3]} />
        <SeriesMarker cx={15} cy={6} shape={SERIES_MARKER[index % 3]} size={6} />
      </svg>
      {label}
    </span>
  );
}

/** ไอคอนประจำตัวแปร (Lucide ผ่าน react-icons) */
const SENSOR_ICON: Record<SensorKey, IconType> = {
  temp: LuThermometer,
  humidity: LuDroplets,
  co2: LuCloud,
  o2: LuWind,
  water: LuWaves,
};

export function SensorIcon({ sensor, size = 28, className }: { sensor: SensorKey; size?: number; className?: string }) {
  const Icon = SENSOR_ICON[sensor];
  return <Icon size={size} className={className} aria-hidden="true" />;
}

// ───────────────────────── Layout primitives ─────────────────────────

export function Panel({
  title,
  overline,
  actions,
  children,
  className = '',
  id,
}: {
  title?: ReactNode;
  overline?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`panel ${className}`} id={id}>
      {(title || overline || actions) && (
        <header className="panel__head">
          <div>
            {overline && <div className="overline">{overline}</div>}
            {title && <h2 className="panel__title">{title}</h2>}
          </div>
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, unit, sub, status }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; status?: Status }) {
  return (
    <div className={`kpi${status ? ` kpi--${status}` : ''}`}>
      <div className="overline">{label}</div>
      <div className="kpi__value">
        <span className="num">{value}</span>
        {unit && <span className="kpi__unit">{unit}</span>}
      </div>
      {sub && <div className="kpi__sub">{sub}</div>}
    </div>
  );
}

export function Loading({ label = 'กำลังโหลดข้อมูล…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="loading__bar" />
      {label}
    </div>
  );
}

// ───────────────────────── Controls ─────────────────────────

export function CaveSwitcher({
  value,
  onChange,
  includeAll = false,
  statuses,
}: {
  value: CaveId | 'all';
  onChange: (v: CaveId | 'all') => void;
  includeAll?: boolean;
  statuses?: Partial<Record<CaveId, Status>>;
}) {
  const caves = useCaveList();
  const items: { id: CaveId | 'all'; label: string; sub?: string }[] = [
    ...(includeAll ? [{ id: 'all' as const, label: 'ภาพรวมทั้งหมด' }] : []),
    ...caves.map((c) => ({ id: c.id, label: c.name, sub: c.province })),
  ];
  return (
    <div className="seg" role="tablist" aria-label="เลือกถ้ำ">
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={value === it.id}
          className={`seg__btn${value === it.id ? ' is-active' : ''}`}
          onClick={() => onChange(it.id)}
        >
          {it.id !== 'all' && statuses?.[it.id] && <StatusGlyph status={statuses[it.id]!} size={10} />}
          <span>{it.label}</span>
          {it.sub && <span className="seg__sub">{it.sub}</span>}
        </button>
      ))}
    </div>
  );
}

export function RangePicker({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  const opts: RangeKey[] = ['1h', '24h', '7d', '30d'];
  return (
    <div className="seg seg--small" role="radiogroup" aria-label="ช่วงเวลา">
      {opts.map((r) => (
        <button key={r} role="radio" aria-checked={value === r} className={`seg__btn${value === r ? ' is-active' : ''}`} onClick={() => onChange(r)}>
          {RANGE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}

/** แถบแสดงตำแหน่งค่าเทียบช่วงปกติ/เฝ้าระวัง */
export function RangeBar({ sensor, value }: { sensor: SensorKey; value: number | null }) {
  const def = SENSORS[sensor];
  const [d0, d1] = def.domain;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - d0) / (d1 - d0)) * 100))}%`;
  const left = (v: number) => Math.max(0, Math.min(100, ((v - d0) / (d1 - d0)) * 100));
  return (
    <div className="rangebar" aria-label={`ช่วงปกติ ${def.normal[0]}–${def.normal[1]} ${def.unit}`}>
      <div className="rangebar__track">
        <div className="rangebar__watch" style={{ left: pct(def.watch[0]), width: `${left(def.watch[1]) - left(def.watch[0])}%` }} />
        <div className="rangebar__normal" style={{ left: pct(def.normal[0]), width: `${left(def.normal[1]) - left(def.normal[0])}%` }} />
        {value != null && <div className="rangebar__marker" style={{ left: pct(value) }} />}
      </div>
      <div className="rangebar__scale num">
        <span>{d0}</span>
        <span>
          ปกติ {def.normal[0]}–{def.normal[1]}
        </span>
        <span>{d1}</span>
      </div>
    </div>
  );
}

export function Sparkline({ data, sensor, height = 40 }: { data: Reading[] | undefined; sensor: SensorKey; height?: number }) {
  const W = 200;
  const pts = (data ?? []).filter((d) => d.value != null) as { ts: number; value: number }[];
  if (pts.length < 2) return <div className="sparkline sparkline--empty" style={{ height }} />;
  const def = SENSORS[sensor];
  const vals = pts.map((p) => p.value);
  const lo = Math.min(...vals, def.normal[0]);
  const hi = Math.max(...vals, Math.min(def.normal[1], Math.max(...vals) * 1.05));
  const t0 = pts[0].ts;
  const t1 = pts[pts.length - 1].ts;
  const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * W;
  const y = (v: number) => height - 3 - ((v - lo) / (hi - lo || 1)) * (height - 6);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.ts).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const ny0 = y(Math.min(hi, def.normal[1]));
  const ny1 = y(Math.max(lo, def.normal[0]));
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
      <rect x={0} y={ny0} width={W} height={Math.max(0, ny1 - ny0)} fill={C.line} opacity={0.6} />
      <path d={d} fill="none" stroke={C.accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function ValueText({ sensor, value }: { sensor: SensorKey; value: number | null }) {
  return (
    <>
      <span className="num">{fmtValue(sensor, value)}</span> <span className="unit">{SENSORS[sensor].unit}</span>
    </>
  );
}

// ───────────────────────── Routing ─────────────────────────

/**
 * ถ้ำที่เลือกใน URL ↔ store (ให้ 3 หน้าตรงกัน)
 * URL ไม่มีถ้ำ → redirect ไปถ้ำที่จำไว้ใน store
 */
export function useCaveRoute(base: '/sensors' | '/dashboard', allowAll: boolean): [CaveId | 'all' | null, (v: CaveId | 'all') => void] {
  const { caveId: param } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const stored = useUi((s) => s.caveId);
  const setCave = useUi((s) => s.setCave);
  const caves = useCaveList();
  const exists = (id: string | null | undefined): id is CaveId => !!id && caves.some((c) => c.id === id);

  const valid: CaveId | 'all' | null = exists(param) ? param : allowAll && param === 'all' ? 'all' : null;
  // ถ้ำที่จำไว้อาจถูกลบไปแล้ว → ไม่ใช้ (กัน redirect วน)
  const fallback = exists(stored) ? stored : allowAll ? 'all' : caves[0].id;

  useEffect(() => {
    if (valid === null) {
      navigate(`${base}/${fallback}`, { replace: true });
    } else if (valid !== 'all' && valid !== stored) {
      setCave(valid);
    }
  }, [valid, stored, fallback, base, navigate, setCave]);

  const select = (v: CaveId | 'all') => {
    setCave(v === 'all' ? null : v);
    // คง query (เช่นแท็บ ?view=) ไว้เมื่อสลับถ้ำ
    navigate({ pathname: `${base}/${v}`, search });
  };
  return [valid, select];
}

export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map((r) => r.map((c) => (c == null ? '' : /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
