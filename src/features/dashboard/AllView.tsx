import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SENSOR_KEYS, SENSORS } from '../../config/sensors';
import { fmtAxisTime, fmtDateTime, fmtDay, fmtValue } from '../../domain/format';
import { worstStatus } from '../../domain/status';
import type { CaveId, RangeKey, SensorKey } from '../../domain/types';
import { useAnalytics, useDailyAnomalies, useLatest, useOpenAlerts, useSeries } from '../../hooks/queries';
import { useSensorCaveList } from '../../registry';
import { C, Kpi, LegendSwatch, Loading, Panel, RangePicker, SERIES_DASH, SERIES_MARKER, SeriesMarker, StatusBadge } from '../../shared/ui';
import { CaveChecklist, IndexRadar, IndexTable } from './IndexRadar';
import { RefugiaTag } from './parts';

export default function AllView() {
  const caves = useSensorCaveList();
  const { data: latest } = useLatest();
  const { data: analytics } = useAnalytics();
  const open = useOpenAlerts();

  const activeSensors = (latest ?? []).filter((l) => l.status !== 'offline').length;
  const avgChi = analytics?.length ? analytics.reduce((s, a) => s + a.indices.chi, 0) / analytics.length : null;
  const indexSeries = (analytics ?? []).map((a) => ({ caveId: a.caveId, indices: a.indices }));
  // ถ้ำที่เลือกแสดงบน radar (ค่าเริ่มต้น: ทุกถ้ำ)
  const [shown, setShown] = useState<Set<CaveId>>(() => new Set(caves.map((c) => c.id)));
  const toggleShown = (id: CaveId) =>
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const radarSeries = indexSeries.filter((s) => shown.has(s.caveId));
  const ranking = [...(analytics ?? [])].sort((a, b) => b.vulnerability.index - a.vulnerability.index);
  const critical = open.filter((a) => a.level === 'critical').length;

  return (
    <div className="dash">
      <div className="kpi-strip">
        <Kpi label="ถ้ำที่เฝ้าติดตาม" value={caves.length} sub="ที่มีเซนเซอร์" />
        <Kpi label="เซนเซอร์ออนไลน์" value={`${activeSensors}/${caves.length * SENSOR_KEYS.length}`} />
        <Kpi label="Alert ที่เปิดอยู่" value={open.length} sub={`วิกฤต ${critical} รายการ`} status={critical ? 'critical' : undefined} />
        <Kpi label="CHI เฉลี่ย" value={avgChi == null ? '—' : avgChi.toFixed(2)} unit="/ 1" sub="Cave Health Index" />
        <Kpi label="เปราะบางที่สุด" value={ranking[0] ? caves.find((c) => c.id === ranking[0].caveId)!.name : '—'} />
      </div>

      <div className="dash__row">
        <Panel overline="Cave Indices · 0–1" title="ดัชนีถ้ำ 7 มิติ เทียบ 3 ถ้ำ" className="span-5">
          <CaveChecklist ids={caves.map((c) => c.id)} selected={shown} onToggle={toggleShown} />
          {!analytics ? (
            <Loading />
          ) : radarSeries.length ? (
            <IndexRadar series={radarSeries} height={340} />
          ) : (
            <p className="radar-empty muted">เลือกอย่างน้อย 1 ถ้ำเพื่อแสดงกราฟ</p>
          )}
          <p className="muted small">CHI คำนวณจากเซนเซอร์ทั้ง 5 ตัว · อีก 6 ดัชนีเป็นข้อมูลจำลอง (mock)</p>
        </Panel>
        <Panel overline="Cave Indices" title="ค่าดัชนีรายถ้ำ" className="span-7">
          {analytics ? <IndexTable series={indexSeries} /> : <Loading />}
        </Panel>
      </div>

      <CompareChart />

      <div className="dash__row">
        <Panel overline="Vulnerability" title="อันดับความเปราะบาง" className="span-7">
          {!analytics ? (
            <Loading />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ถ้ำ</th>
                    <th>ดัชนีความเปราะบาง</th>
                    <th className="r">CHI</th>
                    <th>สถานะ</th>
                    <th>Refugia</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((a, i) => {
                    const cave = caves.find((c) => c.id === a.caveId)!;
                    const st = worstStatus((latest ?? []).filter((l) => l.caveId === a.caveId).map((l) => l.status));
                    return (
                      <tr key={a.caveId}>
                        <td className="num">{i + 1}</td>
                        <td>
                          <Link to={`/dashboard/${a.caveId}`} className="link">
                            {cave.name}
                          </Link>
                          <div className="muted small">{cave.province}</div>
                        </td>
                        <td>
                          <div className="meter" aria-label={`ดัชนี ${a.vulnerability.index.toFixed(2)}`}>
                            <div className="meter__fill" style={{ width: `${a.vulnerability.index * 100}%` }} />
                            <span className="num meter__val">{a.vulnerability.index.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="r num">{a.indices.chi.toFixed(2)}</td>
                        <td>
                          <StatusBadge status={st} compact />
                        </td>
                        <td>
                          <RefugiaTag level={a.refugia.level} short />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <DailyBars />
      </div>
    </div>
  );
}

function CompareChart() {
  const caves = useSensorCaveList();
  const [sensor, setSensor] = useState<SensorKey>('temp');
  const [range, setRange] = useState<RangeKey>('24h');
  const q0 = useSeries('CNX-001', sensor, range);
  const q1 = useSeries('KRI-001', sensor, range);
  const q2 = useSeries('TRG-001', sensor, range);
  const def = SENSORS[sensor];

  const rows = useMemo(() => {
    const m = new Map<number, Record<string, number | null>>();
    [q0.data, q1.data, q2.data].forEach((d, i) =>
      (d ?? []).forEach((r) => {
        const row = m.get(r.ts) ?? { ts: r.ts };
        row[caves[i].id] = r.value;
        m.set(r.ts, row);
      }),
    );
    return [...m.values()].sort((a, b) => a.ts! - b.ts!);
  }, [q0.data, q1.data, q2.data]);
  const every = Math.max(1, Math.round(rows.length / 12));

  return (
    <Panel
      overline="เทียบ 3 ถ้ำ"
      title={`${def.label} (${def.unit})`}
      actions={<RangePicker value={range} onChange={setRange} />}
    >
      <div className="seg seg--small seg--wrap" role="radiogroup" aria-label="ตัวแปร">
        {SENSOR_KEYS.map((k) => (
          <button key={k} role="radio" aria-checked={sensor === k} className={`seg__btn${sensor === k ? ' is-active' : ''}`} onClick={() => setSensor(k)}>
            {SENSORS[k].label}
          </button>
        ))}
      </div>
      <div className="chart-legend">
        {caves.map((c, i) => (
          <LegendSwatch key={c.id} index={i} label={c.name} />
        ))}
        <span className="legend-item">
          <span className="swatch swatch--dash" /> ขอบช่วงปกติ
        </span>
      </div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmtAxisTime(v, range)} stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} minTickGap={40} />
            <YAxis stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} width={48} domain={['auto', 'auto']} tickFormatter={(v) => fmtValue(sensor, v)} />
            <Tooltip
              contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text }}
              labelFormatter={(v) => fmtDateTime(Number(v))}
              formatter={(v: number, name: string) => [`${fmtValue(sensor, v)} ${def.unit}`, caves.find((c) => c.id === name)?.name ?? name]}
            />
            {caves.map((c, i) => (
              <Line
                key={c.id}
                dataKey={c.id}
                type="monotone"
                stroke={C.accent}
                strokeWidth={i === 0 ? 2 : 1.75}
                strokeDasharray={SERIES_DASH[i]}
                isAnimationActive={false}
                connectNulls={false}
                dot={(p: { cx?: number; cy?: number; index?: number }) =>
                  p.index != null && p.index % every === (i * 3) % every ? (
                    <SeriesMarker key={`${c.id}${p.index}`} cx={p.cx} cy={p.cy} shape={SERIES_MARKER[i]} size={7} filled={i !== 1} />
                  ) : (
                    <g key={`${c.id}${p.index}`} />
                  )
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

const PATTERNS = ['pat-solid', 'pat-hatch', 'pat-dots'] as const;

function DailyBars() {
  const caves = useSensorCaveList();
  const { data } = useDailyAnomalies(7);
  const rows = (data ?? []).map((d) => ({ day: d.day, ...d.counts }));
  return (
    <Panel overline="7 วันล่าสุด" title="เหตุการณ์ผิดปกติรายวัน" className="span-5">
      <svg width="0" height="0" className="sr-defs" aria-hidden="true">
        <PatternDefs />
      </svg>
      <div className="chart-legend">
        {caves.map((c, i) => (
          <span className="legend-item" key={c.id}>
            <svg width={14} height={14} aria-hidden="true">
              <rect x={0.5} y={0.5} width={13} height={13} fill={`url(#${PATTERNS[i]})`} stroke={C.accent} />
            </svg>
            {c.name}
          </span>
        ))}
      </div>
      {!data ? (
        <Loading />
      ) : (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: -16 }} barGap={2}>
              <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="day" tickFormatter={(v) => fmtDay(v)} stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} />
              <YAxis allowDecimals={false} stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: C.surface2 }}
                contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text }}
                labelFormatter={(v) => fmtDay(Number(v))}
                formatter={(v: number, name: string) => [`${v} ครั้ง`, caves.find((c) => c.id === name)?.name ?? name]}
              />
              {caves.map((c, i) => (
                <Bar key={c.id} dataKey={c.id} fill={`url(#${PATTERNS[i]})`} stroke={C.accent} strokeWidth={1} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

/** ลวดลายแยก series แทนการใช้หลายเฉดสี */
function PatternDefs() {
  return (
    <defs>
      <pattern id="pat-solid" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill={C.accent} />
      </pattern>
      <pattern id="pat-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill={C.surface} />
        <line x1="0" y1="0" x2="0" y2="6" stroke={C.accent} strokeWidth="2.5" />
      </pattern>
      <pattern id="pat-dots" width="5" height="5" patternUnits="userSpaceOnUse">
        <rect width="5" height="5" fill={C.surface} />
        <circle cx="2.5" cy="2.5" r="1.2" fill={C.accent} />
      </pattern>
    </defs>
  );
}
