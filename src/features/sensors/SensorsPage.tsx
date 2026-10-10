import { useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getCaveConfig } from '../../config/caves';
import { SENSOR_KEYS, SENSORS } from '../../config/sensors';
import { fmtAgo, fmtAxisTime, fmtDateTime, fmtValue, RANGE_LABEL } from '../../domain/format';
import { statusOf, worstStatus } from '../../domain/status';
import type { CaveId, Device, Latest, RangeKey, SensorKey, Status } from '../../domain/types';
import { useDevices, useLatest, useSeries } from '../../hooks/queries';
import {
  C,
  CaveSwitcher,
  downloadCsv,
  Loading,
  Panel,
  RangeBar,
  RangePicker,
  Sparkline,
  StatusBadge,
  StatusDot,
  StatusGlyph,
  useCaveRoute,
} from '../../shared/ui';
import { useUi } from '../../store';

export default function SensorsPage() {
  const [route, select] = useCaveRoute('/sensors', false);
  const { data: allLatest } = useLatest();
  const statuses = useMemo(() => {
    const m: Partial<Record<CaveId, Status>> = {};
    for (const l of allLatest ?? []) m[l.caveId] = worstStatus([...(m[l.caveId] ? [m[l.caveId]!] : []), l.status]);
    return m;
  }, [allLatest]);

  if (!route || route === 'all') return <Loading />;
  return <SensorsView caveId={route} onSelect={(v) => select(v)} statuses={statuses} latest={(allLatest ?? []).filter((l) => l.caveId === route)} />;
}

function SensorsView({
  caveId,
  onSelect,
  statuses,
  latest,
}: {
  caveId: CaveId;
  onSelect: (v: CaveId) => void;
  statuses: Partial<Record<CaveId, Status>>;
  latest: Latest[];
}) {
  const range = useUi((s) => s.range);
  const setRange = useUi((s) => s.setRange);
  const [open, setOpen] = useState<SensorKey | null>(null);
  const { data: devices } = useDevices(caveId);
  const cave = getCaveConfig(caveId);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="overline">IoT Sensors · {cave.id}</div>
          <h1 className="page__title">{cave.name}</h1>
          <p className="muted">
            {cave.province} · เซนเซอร์ 5 ตัว · อัปเดตทุก 3 วินาที
          </p>
        </div>
      </div>
      <div className="toolbar">
        <CaveSwitcher value={caveId} onChange={(v) => v !== 'all' && onSelect(v)} statuses={statuses} />
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="sensor-grid">
        {SENSOR_KEYS.map((k) => (
          <SensorCard
            key={k}
            caveId={caveId}
            sensor={k}
            range={range}
            latest={latest.find((l) => l.sensor === k)}
            device={devices?.find((d) => d.sensor === k)}
            active={open === k}
            onOpen={() => setOpen(open === k ? null : k)}
          />
        ))}
      </div>

      {open && <SensorChart caveId={caveId} sensor={open} range={range} onClose={() => setOpen(null)} />}

      <Panel overline="Devices" title="สถานะอุปกรณ์">
        <DeviceTable devices={devices} />
      </Panel>
    </div>
  );
}

function SensorCard({
  caveId,
  sensor,
  range,
  latest,
  device,
  active,
  onOpen,
}: {
  caveId: CaveId;
  sensor: SensorKey;
  range: RangeKey;
  latest?: Latest;
  device?: Device;
  active: boolean;
  onOpen: () => void;
}) {
  const def = SENSORS[sensor];
  const { data } = useSeries(caveId, sensor, range);
  const status = latest?.status ?? 'offline';
  return (
    <button className={`sensorcard sensorcard--${status}${active ? ' is-active' : ''}`} onClick={onOpen} aria-expanded={active}>
      <div className="sensorcard__head">
        <span className="sensorcard__label">{def.label}</span>
        <StatusBadge status={status} compact />
      </div>
      <div className="sensorcard__value">
        <span className="num">{fmtValue(sensor, latest?.value)}</span>
        <span className="unit">{def.unit}</span>
      </div>
      <RangeBar sensor={sensor} value={latest?.value ?? null} />
      <Sparkline data={data} sensor={sensor} />
      <div className="sensorcard__foot">
        <span title="แบตเตอรี่">
          <BatteryIcon pct={device?.battery ?? 0} /> <span className="num">{device ? `${device.battery}%` : '—'}</span>
        </span>
        <span>{latest ? `รับข้อมูล ${fmtAgo(latest.ts)}` : '—'}</span>
      </div>
      <span className="sensorcard__cta">{active ? 'ซ่อนกราฟ' : `ดูกราฟ ${RANGE_LABEL[range]}`}</span>
    </button>
  );
}

function BatteryIcon({ pct }: { pct: number }) {
  const w = Math.max(0, Math.min(14, (pct / 100) * 14));
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true" className="battery">
      <rect x="0.5" y="0.5" width="17" height="9" rx="2" fill="none" stroke={C.text} />
      <rect x="18" y="3" width="2" height="4" fill={C.text} />
      <rect x="2" y="2" width={w} height="6" fill={pct < 15 ? 'none' : C.text} stroke={pct < 15 ? C.text : 'none'} strokeDasharray="2 1" />
    </svg>
  );
}

function SensorChart({ caveId, sensor, range, onClose }: { caveId: CaveId; sensor: SensorKey; range: RangeKey; onClose: () => void }) {
  const def = SENSORS[sensor];
  const cave = getCaveConfig(caveId);
  const { data, isLoading } = useSeries(caveId, sensor, range);
  const rows = useMemo(() => (data ?? []).map((r) => ({ ...r, status: statusOf(sensor, r.value) })), [data, sensor]);
  const vals = rows.filter((r) => r.value != null).map((r) => r.value!);
  const lo = Math.min(def.watch[0], ...vals);
  const hi = Math.max(def.watch[1], ...vals);
  const pad = (hi - lo) * 0.08;
  const yDomain: [number, number] = [Math.max(def.domain[0], lo - pad), Math.min(def.domain[1] * 1.2, hi + pad)];
  const abnormal = rows.filter((r) => r.status === 'watch' || r.status === 'critical').length;

  const csv = () =>
    downloadCsv(`${caveId}_${sensor}_${range}.csv`, [
      ['timestamp_iso', 'cave_id', 'sensor', 'value', 'unit', 'status'],
      ...rows.map((r) => [new Date(r.ts).toISOString(), caveId, sensor, r.value, def.unit, r.status]),
    ]);

  return (
    <Panel
      overline={`${cave.name} · ${RANGE_LABEL[range]}`}
      title={`${def.label} (${def.unit})`}
      className="chartpanel"
      actions={
        <>
          <button className="btn btn--pill btn--sm" onClick={csv} disabled={!rows.length}>
            ↓ ดาวน์โหลด CSV
          </button>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="ปิดกราฟ">
            ✕
          </button>
        </>
      }
    >
      <div className="chart-legend">
        <span className="legend-item">
          <span className="swatch swatch--band" /> ช่วงปกติ {def.normal[0]}–{def.normal[1]}
        </span>
        <span className="legend-item">
          <span className="swatch swatch--dash" /> เกณฑ์เฝ้าระวัง/วิกฤต
        </span>
        <span className="legend-item">
          <StatusGlyph status="watch" size={10} /> เฝ้าระวัง
        </span>
        <span className="legend-item">
          <StatusGlyph status="critical" size={10} pulse={false} /> วิกฤต
        </span>
        <span className="legend-item muted">จุดผิดปกติ {abnormal} จุด</span>
      </div>
      {isLoading && !data ? (
        <Loading />
      ) : (
        <div className="chart-box chart-box--lg">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
              <ReferenceArea y1={def.normal[0]} y2={def.normal[1]} fill={C.line} fillOpacity={0.45} ifOverflow="hidden" />
              {thresholds(sensor).map((t) => (
                <ReferenceLine
                  key={t.v}
                  y={t.v}
                  stroke={t.kind === 'watch' ? C.lineStrong : C.muted}
                  strokeDasharray={t.kind === 'watch' ? '6 4' : '2 3'}
                  ifOverflow="hidden"
                  label={{ value: t.label, position: 'insideTopRight', fill: C.muted, fontSize: 11 }}
                />
              ))}
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v) => fmtAxisTime(v, range)}
                stroke={C.muted}
                tick={{ fill: C.muted, fontSize: 11 }}
                minTickGap={40}
              />
              <YAxis domain={yDomain} stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} width={48} tickFormatter={(v) => fmtValue(sensor, v)} />
              <Tooltip
                contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text }}
                labelFormatter={(v) => fmtDateTime(Number(v))}
                formatter={(v: number) => [`${fmtValue(sensor, v)} ${def.unit}`, def.label]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={C.text}
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={false}
                dot={(p: { cx?: number; cy?: number; payload?: { status: Status }; index?: number }) => (
                  <StatusDot key={`d${p.index}`} cx={p.cx} cy={p.cy} status={p.payload?.status} />
                )}
                activeDot={{ r: 4, fill: C.text, stroke: C.bg }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function thresholds(sensor: SensorKey) {
  const d = SENSORS[sensor];
  const out: { v: number; kind: 'watch' | 'critical'; label: string }[] = [];
  const add = (v: number, kind: 'watch' | 'critical', label: string) => {
    if (v > d.domain[0] && v < d.domain[1] && !out.some((o) => o.v === v)) out.push({ v, kind, label });
  };
  add(d.normal[1], 'watch', `เฝ้าระวัง > ${d.normal[1]}`);
  add(d.normal[0], 'watch', `เฝ้าระวัง < ${d.normal[0]}`);
  add(d.watch[1], 'critical', `วิกฤต > ${d.watch[1]}`);
  add(d.watch[0], 'critical', `วิกฤต < ${d.watch[0]}`);
  return out;
}

function DeviceTable({ devices }: { devices?: Device[] }) {
  if (!devices) return <Loading />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>อุปกรณ์</th>
            <th>ตัวแปร</th>
            <th>รุ่น / เฟิร์มแวร์</th>
            <th className="r">แบตเตอรี่</th>
            <th className="r">สัญญาณ</th>
            <th>ติดต่อล่าสุด</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id} className={`row--${d.status}`}>
              <td className="num">{d.id}</td>
              <td>{SENSORS[d.sensor].label}</td>
              <td>
                {d.model} <span className="muted num">{d.firmware}</span>
              </td>
              <td className="r num">{d.battery}%</td>
              <td className="r num">{d.signal} dBm</td>
              <td>{fmtAgo(d.lastSeen)}</td>
              <td>
                <StatusBadge status={d.status} compact />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

