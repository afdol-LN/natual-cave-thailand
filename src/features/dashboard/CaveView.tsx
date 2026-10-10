import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { LuChartLine, LuLayoutGrid, LuLeaf, LuMountain } from 'react-icons/lu';
import { Area, CartesianGrid, ComposedChart, Line, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RISK_LABEL } from '../../api/analytics';
import { getCaveConfig } from '../../config/caves';
import { SENSOR_KEYS, SENSORS } from '../../config/sensors';
import { fmtDateTime, fmtDuration, fmtValue } from '../../domain/format';
import type { CaveId, Scenario, SensorKey } from '../../domain/types';
import { useAlerts, useAnalytics, useForecast, useLatest, useSpecies } from '../../hooks/queries';
import { C, Kpi, LegendSwatch, Loading, Panel, SERIES_DASH, StatusBadge, StatusGlyph, ValueText } from '../../shared/ui';
import { useUi } from '../../store';
import { Gauge, RefugiaTag, RiskPips } from './parts';

const SCEN: { key: Scenario; label: string }[] = [
  { key: 'low', label: 'ต่ำ' },
  { key: 'mid', label: 'กลาง' },
  { key: 'high', label: 'สูง' },
];
const ABUNDANCE = { rare: 'พบน้อย', common: 'พบทั่วไป', abundant: 'พบมาก' } as const;

export type CaveTab = 'all' | 'stats' | 'bio' | 'geo';
export const CAVE_TABS: { key: CaveTab; label: string; icon: IconType }[] = [
  { key: 'all', label: 'รวมทุกหมวด', icon: LuLayoutGrid },
  { key: 'stats', label: 'สถิติ', icon: LuChartLine },
  { key: 'bio', label: 'ความหลากหลายทางชีวภาพ', icon: LuLeaf },
  { key: 'geo', label: 'ภูมิศาสตร์และธรณีวิทยา', icon: LuMountain },
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
  if (tab === 'bio') return <BioView caveId={caveId} />;
  if (tab === 'geo') return <GeoView caveId={caveId} />;
  return <StatsView caveId={caveId} />;
}

function StatsView({ caveId }: { caveId: CaveId }) {
  const { data: analytics } = useAnalytics();
  const { data: latest } = useLatest(caveId);
  const a = analytics?.find((x) => x.caveId === caveId);

  return (
    <div className="dash">
      <div className="dash__row">
        <Panel overline="Health Index" title="ดัชนีสุขภาพถ้ำ" className="span-4">
          <Gauge value={a?.health ?? null} label="จาก 100" />
          <div className="center">{a && <RefugiaTag level={a.refugia.level} />}</div>
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

        <Panel overline="Vulnerability" title="เรดาร์ความเปราะบาง" className="span-3">
          {!a ? (
            <Loading />
          ) : (
            <>
              <div className="chart-box chart-box--radar">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={[
                      { axis: 'การสัมผัส', v: a.vulnerability.exposure },
                      { axis: 'ความอ่อนไหว', v: a.vulnerability.sensitivity },
                      { axis: 'ขาดการปรับตัว', v: 1 - a.vulnerability.adaptiveCapacity },
                    ]}
                    outerRadius="68%"
                  >
                    <PolarGrid stroke={C.line} />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: C.muted, fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
                    <Radar dataKey="v" stroke={C.accent} strokeWidth={2} fill={C.accent} fillOpacity={0.22} isAnimationActive={false} dot={{ r: 3, fill: C.accent }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="center muted">
                ดัชนีรวม <span className="num strong">{a.vulnerability.index.toFixed(2)}</span>
              </div>
            </>
          )}
        </Panel>
      </div>

      <div className="dash__row">
        <AlertTimeline caveId={caveId} />
      </div>
    </div>
  );
}

function BioView({ caveId }: { caveId: CaveId }) {
  const { data } = useSpecies(caveId);
  const total = data?.length;
  const endemic = data?.filter((d) => d.species.endemic).length;
  const rare = data?.filter((d) => d.occurrence.abundance === 'rare').length;
  const { data: analytics } = useAnalytics();
  const highRisk = analytics?.find((a) => a.caveId === caveId)?.speciesRisk.filter((r) => r.level === 'high').length;
  return (
    <div className="dash">
      <div className="kpi-strip">
        <Kpi label="ชนิดพันธุ์ที่พบ" value={total ?? '—'} unit="ชนิด" />
        <Kpi label="ชนิดพันธุ์ถิ่นเดียว" value={endemic ?? '—'} unit="ชนิด" />
        <Kpi label="พบน้อย" value={rare ?? '—'} unit="ชนิด" />
        <Kpi label="ความเสี่ยงสูง" value={highRisk ?? '—'} unit="ชนิด" status={highRisk ? 'critical' : undefined} />
      </div>
      <div className="dash__row">
        <SpeciesRiskPanel caveId={caveId} />
        <SpeciesList caveId={caveId} className="span-6" />
      </div>
    </div>
  );
}

function GeoView({ caveId }: { caveId: CaveId }) {
  const cave = getCaveConfig(caveId);
  return (
    <div className="dash">
      <div className="kpi-strip">
        <Kpi label="ความสูง" value={cave.elevationM.toLocaleString('th-TH')} unit="ม. รทก." />
        <Kpi label="ความยาวโถงสำรวจ" value={`~${cave.lengthM.toLocaleString('th-TH')}`} unit="ม." />
        <Kpi label="ภูมิภาค" value={cave.region} sub={cave.province} />
        <Kpi label="พิกัด" value={`${cave.lat.toFixed(4)}, ${cave.lon.toFixed(4)}`} sub={cave.coordsVerified ? 'ยืนยันแล้ว' : 'พิกัดยังไม่ยืนยัน'} />
      </div>
      <div className="info-grid info-grid--2">
        <InfoCard title="ภูมิศาสตร์" body={cave.geography} extra={`${cave.region} · สูง ${cave.elevationM} ม. รทก.`} />
        <InfoCard title="ธรณีวิทยา" body={cave.geology} extra={`ความยาวโถงสำรวจ ~${cave.lengthM.toLocaleString('th-TH')} ม.`} />
        <InfoCard title="อุทกวิทยา" body={cave.hydrology} />
        <InfoCard
          title="บริบทเชิงพื้นที่"
          body={cave.spatialContext}
          extra={`${cave.lat.toFixed(4)}°N ${cave.lon.toFixed(4)}°E${cave.coordsVerified ? '' : ' (พิกัดยังไม่ยืนยัน)'}`}
        />
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
      className="span-5"
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

function SpeciesRiskPanel({ caveId }: { caveId: CaveId }) {
  const { data: analytics } = useAnalytics();
  const risks = analytics?.find((a) => a.caveId === caveId)?.speciesRisk;
  return (
    <Panel overline="Species at Risk" title="ความเสี่ยงชนิดพันธุ์" className="span-6">
      {!risks ? (
        <Loading />
      ) : (
        <ul className="risklist">
          {risks.map((r) => (
            <li key={r.species.id} className={`risk risk--${r.level}`}>
              <div className="risk__main">
                <div className="risk__name">
                  {r.species.name}
                  {r.species.endemic && <span className="tag">ถิ่นเดียว</span>}
                </div>
                <div className="muted small">
                  <i>{r.species.sciName}</i> · {r.species.group}
                  {r.driver && ` · ปัจจัยหลัก: ${SENSORS[r.driver].label}`}
                </div>
              </div>
              <div className="risk__level">
                <RiskPips level={r.level} />
                <span className={r.level === 'high' ? 'strong' : ''}>{RISK_LABEL[r.level]}</span>
              </div>
            </li>
          ))}
        </ul>
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

function InfoCard({ title, body, extra }: { title: string; body: string; extra?: string }) {
  return (
    <div className="infocard">
      <div className="overline">{title}</div>
      <p>{body}</p>
      {extra && <p className="muted small num">{extra}</p>}
    </div>
  );
}

function SpeciesList({ caveId, className }: { caveId: CaveId; className?: string }) {
  const { data } = useSpecies(caveId);
  return (
    <Panel overline="Biodiversity (mock)" title="ชนิดพันธุ์ที่พบ" className={className}>
      {!data ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>ชื่อวิทยาศาสตร์</th>
                <th>กลุ่ม</th>
                <th>บริเวณที่พบ</th>
                <th>ความชุกชุม</th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ species, occurrence }) => (
                <tr key={species.id}>
                  <td>
                    {species.name} {species.endemic && <span className="tag">ถิ่นเดียว</span>}
                  </td>
                  <td>
                    <i className="muted">{species.sciName}</i>
                  </td>
                  <td>{species.group}</td>
                  <td>{occurrence.zone}</td>
                  <td>{ABUNDANCE[occurrence.abundance]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">ชื่อชนิดพันธุ์เป็นชื่อสมมติสำหรับ prototype ไม่ใช่ผลสำรวจจริง</p>
    </Panel>
  );
}
