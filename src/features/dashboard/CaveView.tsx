import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { LuBookOpen, LuChartLine, LuLayoutGrid, LuLeaf, LuRadioTower } from 'react-icons/lu';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SENSOR_KEYS, SENSORS } from '../../config/sensors';
import { fmtDateTime, fmtDuration, fmtValue } from '../../domain/format';
import type { CaveId, Scenario, SensorKey } from '../../domain/types';
import { useAlerts, useAnalytics, useForecast, useLatest } from '../../hooks/queries';
import { C, LegendSwatch, Loading, Panel, SERIES_DASH, StatusBadge, StatusGlyph, ValueText } from '../../shared/ui';
import { useCave } from '../../registry';
import { useUi } from '../../store';
import CaveInfo from '../registry/CaveInfo';
import { IndexRadar } from './IndexRadar';
import { RefugiaTag } from './parts';
import BioView from './BioView';

const SCEN: { key: Scenario; label: string }[] = [
  { key: 'low', label: 'ต่ำ' },
  { key: 'mid', label: 'กลาง' },
  { key: 'high', label: 'สูง' },
];

export type CaveTab = 'all' | 'stats' | 'bio' | 'info';
export const CAVE_TABS: { key: CaveTab; label: string; icon: IconType }[] = [
  { key: 'all', label: 'รวมทุกหมวด', icon: LuLayoutGrid },
  { key: 'stats', label: 'สถิติ', icon: LuChartLine },
  { key: 'bio', label: 'ความหลากหลายทางชีวภาพ', icon: LuLeaf },
  { key: 'info', label: 'ข้อมูลถ้ำ', icon: LuBookOpen },
];
export const isCaveTab = (v: string | null): v is CaveTab => CAVE_TABS.some((t) => t.key === v);

export default function CaveView({ caveId, tab }: { caveId: CaveId; tab: CaveTab }) {
  if (tab === 'all')
    return (
      <div className="dash">
        {CAVE_TABS.filter((t) => t.key !== 'all').map((t) => (
          <section key={t.key} className="dash__section" aria-labelledby={`sec-${t.key}`}>
            <h2 className="dash__section-title" id={`sec-${t.key}`}>
              {t.label}
            </h2>
            <CaveView caveId={caveId} tab={t.key} />
          </section>
        ))}
      </div>
    );
  if (tab === 'info') return <CaveInfo caveId={caveId} />;
  if (tab === 'bio') return <BioView caveId={caveId} />;
  return (
    <SensorGate caveId={caveId}>
      <StatsView caveId={caveId} />
    </SensorGate>
  );
}

/** ถ้ำที่ยังไม่มีเซนเซอร์ (เพิ่มจากทะเบียน) ไม่มีข้อมูลสถิติ */
function SensorGate({ caveId, children }: { caveId: CaveId; children: ReactNode }) {
  const cave = useCave(caveId);
  if (!cave) return <Loading />;
  if (cave.hasSensors) return <>{children}</>;
  return (
    <div className="empty-state">
      <LuRadioTower size={36} aria-hidden="true" />
      <h3>ถ้ำนี้ยังไม่มีเซนเซอร์</h3>
      <p className="muted">ข้อมูลสถิติจะแสดงเมื่อติดตั้งเซนเซอร์แล้ว ดูข้อมูลฐานข้อมูลได้ที่แท็บ "ข้อมูลถ้ำ" และชนิดพันธุ์ที่แท็บ "ความหลากหลายทางชีวภาพ"</p>
    </div>
  );
}

function StatsView({ caveId }: { caveId: CaveId }) {
  const { data: analytics } = useAnalytics();
  const { data: latest } = useLatest(caveId);
  const a = analytics?.find((x) => x.caveId === caveId);

  return (
    <div className="dash">
      <div className="dash__row">
        <Panel overline="Cave Indices · 0–1" title="ดัชนีถ้ำ 7 มิติ" className="span-4">
          <div className="chi-head">
            <div>
              <div className="overline">Cave Health Index (CHI)</div>
              <div className="chi-head__value num">{a ? a.indices.chi.toFixed(2) : '—'}</div>
              <div className="muted small">คำนวณจากเซนเซอร์ทั้ง 5 ตัว</div>
            </div>
            {a && <RefugiaTag level={a.refugia.level} short />}
          </div>
          {a ? <IndexRadar series={[{ caveId, indices: a.indices }]} height={260} /> : <Loading />}
          <p className="muted small center">CHI จากข้อมูลจริงของเซนเซอร์ · อีก 6 ดัชนีเป็นข้อมูลจำลอง</p>
          <dl className="readings readings--compact">
            {SENSOR_KEYS.map((k) => {
              const l = latest?.find((r) => r.sensor === k);
              return (
                <div key={k} className={`readings__row readings__row--${l?.status ?? 'offline'}`}>
                  <dt>
                    <StatusGlyph status={l?.status ?? 'offline'} size={10} /> {SENSORS[k].label}
                  </dt>
                  <dd>
                    <ValueText sensor={k} value={l?.value ?? null} />
                  </dd>
                </div>
              );
            })}
          </dl>
          <Link to={`/sensors/${caveId}`} className="btn btn--pill btn--sm btn--block">
            ดูเซนเซอร์ของถ้ำนี้ →
          </Link>
        </Panel>

        <Forecast caveId={caveId} />
      </div>

      <div className="dash__row">
        <AlertTimeline caveId={caveId} />
      </div>
    </div>
  );
}

function Forecast({ caveId }: { caveId: CaveId }) {
  const [sensor, setSensor] = useState<SensorKey>('temp');
  const [scenario, setScenario] = useState<Scenario>('mid');
  const { data } = useForecast(caveId, sensor);
  const def = SENSORS[sensor];
  const rows = useMemo(
    () =>
      data
        ? data.mid.map((p, i) => ({
            year: p.year,
            low: data.low[i].mean,
            mid: p.mean,
            high: data.high[i].mean,
            band: [data[scenario][i].lo, data[scenario][i].hi] as [number, number],
          }))
        : [],
    [data, scenario],
  );

  return (
    <Panel
      overline="Scenario Forecast 2026–2060"
      title={`พยากรณ์${def.label}`}
      className="span-8"
      actions={
        <div className="seg seg--small" role="radiogroup" aria-label="scenario">
          {SCEN.map((s) => (
            <button key={s.key} role="radio" aria-checked={scenario === s.key} className={`seg__btn${scenario === s.key ? ' is-active' : ''}`} onClick={() => setScenario(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="seg seg--small seg--wrap" role="radiogroup" aria-label="ตัวแปร">
        {SENSOR_KEYS.map((k) => (
          <button key={k} role="radio" aria-checked={sensor === k} className={`seg__btn${sensor === k ? ' is-active' : ''}`} onClick={() => setSensor(k)}>
            {SENSORS[k].label}
          </button>
        ))}
      </div>
      <div className="chart-legend">
        {SCEN.map((s, i) => (
          <LegendSwatch key={s.key} index={i} label={`scenario ${s.label}`} />
        ))}
        <span className="legend-item">
          <span className="swatch swatch--band" /> ความไม่แน่นอน ({SCEN.find((s) => s.key === scenario)!.label})
        </span>
      </div>
      {!data ? (
        <Loading />
      ) : (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="year" stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} minTickGap={24} />
              <YAxis stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} width={48} domain={['auto', 'auto']} tickFormatter={(v) => fmtValue(sensor, v)} />
              <Tooltip
                contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text }}
                formatter={(v: number | number[], name: string) =>
                  Array.isArray(v)
                    ? [`${fmtValue(sensor, v[0])}–${fmtValue(sensor, v[1])} ${def.unit}`, 'ช่วงไม่แน่นอน']
                    : [`${fmtValue(sensor, v)} ${def.unit}`, `scenario ${SCEN.find((s) => s.key === name)?.label ?? name}`]
                }
              />
              <Area dataKey="band" stroke="none" fill={C.line} fillOpacity={0.75} isAnimationActive={false} />
              {SCEN.map((s, i) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  stroke={C.accent}
                  strokeWidth={scenario === s.key ? 2.5 : 1.25}
                  strokeOpacity={scenario === s.key ? 1 : 0.7}
                  strokeDasharray={SERIES_DASH[i]}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function AlertTimeline({ caveId }: { caveId: CaveId }) {
  const { data: alerts } = useAlerts(caveId);
  const acked = useUi((s) => s.acked);
  const ack = useUi((s) => s.ack);
  const now = Date.now();
  return (
    <Panel overline="Alert Timeline · 7 วัน" title="ไทม์ไลน์เหตุการณ์" id="alerts">
      {!alerts ? (
        <Loading />
      ) : alerts.length === 0 ? (
        <p className="muted">ไม่มีเหตุการณ์ผิดปกติใน 7 วันที่ผ่านมา</p>
      ) : (
        <ol className="timeline">
          {alerts.map((a) => {
            const ongoing = a.end == null;
            const isAcked = !!acked[a.id];
            return (
              <li key={a.id} className={`timeline__item timeline__item--${a.level}${ongoing ? ' is-ongoing' : ''}`}>
                <span className="timeline__node">
                  <StatusGlyph status={a.level} size={14} pulse={ongoing && !isAcked} />
                </span>
                <div className="timeline__body">
                  <div className="timeline__head">
                    <StatusBadge status={a.level} compact />
                    <span className="muted small">{fmtDateTime(a.start)}</span>
                  </div>
                  <div>{a.message}</div>
                  <div className="muted small">
                    {ongoing ? `ยังเกิดอยู่ · ${fmtDuration(now - a.start)}` : `ระยะเวลา ${fmtDuration(a.end! - a.start)}`}
                    {isAcked && ` · รับทราบเมื่อ ${fmtDateTime(acked[a.id])}`}
                  </div>
                </div>
                {ongoing && !isAcked && (
                  <button className="btn btn--pill btn--sm" onClick={() => ack(a.id)}>
                    Acknowledge
                  </button>
                )}
                {isAcked && <span className="ackmark">✓ รับทราบ</span>}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
