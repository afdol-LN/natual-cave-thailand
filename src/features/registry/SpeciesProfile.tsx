/** โปรไฟล์ชนิดพันธุ์ /registry/species/:id */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LuDna, LuPencil, LuPlus, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ABUNDANCES, COUNT_METHODS, ENDEMISM, FUNCTIONAL_GROUPS, HABITATS } from '../../config/bio-options';
import { labelOf } from '../../config/inventory-options';
import { SENSOR_KEYS, SENSORS } from '../../config/sensors';
import { distribution, dnaLink, endemismConflict, latestCount } from '../../domain/biodiversity';
import { useBio, useOccurrences, useSpeciesById } from '../../biodb';
import { useAnalytics } from '../../hooks/queries';
import { useCaveList, useCaveName } from '../../registry';
import { C, Loading, Panel } from '../../shared/ui';
import { CAVE_COLOR } from '../dashboard/IndexRadar';
import { RiskPips } from '../dashboard/parts';
import { RISK_LABEL } from '../../api/analytics';
import { EcoBadge, IucnBadge, RegistryTabs, SpeciesThumb } from './bio-ui';

const TAXON_LEVELS = [
  ['phylum', 'ไฟลัม'],
  ['class', 'ชั้น'],
  ['order', 'อันดับ'],
  ['family', 'วงศ์'],
  ['genus', 'สกุล'],
] as const;

export default function SpeciesProfile() {
  const { id } = useParams();
  const sp = useSpeciesById(id);
  const occurrences = useOccurrences();
  const caves = useCaveList();
  const caveName = useCaveName();
  const { data: analytics } = useAnalytics();
  const removeOccurrence = useBio((s) => s.removeOccurrence);

  const occs = useMemo(() => occurrences.filter((o) => o.speciesId === id), [occurrences, id]);
  const popRows = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    for (const o of occs)
      for (const p of o.population) {
        const row = byDate.get(p.date) ?? { date: p.date };
        row[o.caveId] = p.count;
        byDate.set(p.date, row);
      }
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [occs]);

  if (!id) return <Loading />;
  if (!sp)
    return (
      <div className="page">
        <div className="empty-state">
          <h3>ไม่พบชนิดพันธุ์รหัส {id}</h3>
          <Link to="/registry/species" className="btn btn--pill btn--sm">
            กลับไปฐานข้อมูลชนิดพันธุ์
          </Link>
        </div>
      </div>
    );

  const caveIds = distribution(sp.id, occurrences);
  const conflict = endemismConflict(sp, caveIds.length);
  const vouchers = occs.flatMap((o) => o.vouchers.map((v) => ({ ...v, caveId: o.caveId })));
  const hasCaveWithoutSpecies = caves.some((c) => !caveIds.includes(c.id));
  const riskFor = (caveId: string) => analytics?.find((a) => a.caveId === caveId)?.speciesRisk.find((r) => r.species.id === sp.id);
  // จับคู่ระดับกับค่า แล้วข้ามระดับที่ว่าง (ป้ายไม่เลื่อน)
  const taxa = TAXON_LEVELS.map(([k, label]) => [label, sp.taxonomy[k]] as const).filter(([, v]) => !!v);

  return (
    <div className="page">
      <RegistryTabs />
      <div className="sp-head">
        <SpeciesThumb image={sp.image} size={96} />
        <div className="sp-head__body">
          <div className="overline">
            {sp.id} · {sp.group}
          </div>
          <h1 className="page__title">{sp.name}</h1>
          <p>
            <i>{sp.sciName}</i> {sp.authority && <span className="muted">{sp.authority}</span>}
          </p>
          <div className="btn-row">
            <IucnBadge status={sp.iucn} long />
            <EcoBadge value={sp.ecoClass} />
            {sp.endemism !== 'none' && <span className="tag">{labelOf(ENDEMISM, sp.endemism)}</span>}
          </div>
        </div>
        <Link to={`/registry/species/${sp.id}/edit`} className="btn btn--pill btn--sm">
          <LuPencil size={14} aria-hidden="true" /> แก้ไข
        </Link>
      </div>

      <div className="info-grid info-grid--2">
        <Panel overline="Taxonomic hierarchy" title="ลำดับชั้นอนุกรมวิธาน">
          <ol className="taxa">
            {taxa.map(([label, t], i) => (
              <li key={label} style={{ paddingLeft: i * 14 }}>
                <span className="muted small">{label}</span> {t}
              </li>
            ))}
            <li style={{ paddingLeft: taxa.length * 14 }}>
              <span className="muted small">ชนิด</span> <i>{sp.sciName}</i>
            </li>
          </ol>
        </Panel>

        <Panel overline="Status & ecology" title="สถานภาพและนิเวศ">
          <dl className="field-list">
            <div className="field-view">
              <dt>ความเฉพาะถิ่น</dt>
              <dd>
                {labelOf(ENDEMISM, sp.endemism)}
                {conflict && (
                  <div className="field__warn">
                    <LuTriangleAlert size={14} aria-hidden="true" /> ระบุว่าเฉพาะถ้ำเดียว แต่พบ {caveIds.length} ถ้ำ
                  </div>
                )}
              </dd>
            </div>
            <div className="field-view">
              <dt>กลุ่มหน้าที่ทางนิเวศ</dt>
              <dd>
                {sp.functionalGroups.length ? (
                  <span className="chips">
                    {sp.functionalGroups.map((g) => (
                      <span key={g} className="chip">
                        {labelOf(FUNCTIONAL_GROUPS, g)}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="muted">ยังไม่มีข้อมูล</span>
                )}
              </dd>
            </div>
            <div className="field-view">
              <dt>ความไวต่อสภาพแวดล้อม</dt>
              <dd>
                <ul className="sens">
                  {SENSOR_KEYS.map((k) => {
                    const v = sp.sensitivity[k] ?? 0;
                    return (
                      <li key={k}>
                        <span>{SENSORS[k].short}</span>
                        <span className="meter meter--thin">
                          <span className="meter__fill" style={{ width: `${v * 100}%` }} />
                        </span>
                        <span className="num small">{v.toFixed(1)}</span>
                      </li>
                    );
                  })}
                </ul>
              </dd>
            </div>
            {sp.note && (
              <div className="field-view">
                <dt>หมายเหตุ</dt>
                <dd>{sp.note}</dd>
              </div>
            )}
          </dl>
        </Panel>
      </div>

      <Panel
        overline="Distribution"
        title={`การแพร่กระจาย · พบใน ${caveIds.length} ถ้ำ`}
        actions={
          hasCaveWithoutSpecies && (
            <Link to={`/registry/occurrence/new?species=${sp.id}`} className="btn btn--pill btn--sm btn--primary">
              <LuPlus size={14} aria-hidden="true" /> บันทึกการพบ
            </Link>
          )
        }
      >
        {occs.length === 0 ? (
          <p className="muted">ยังไม่มีบันทึกการพบ</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ถ้ำ</th>
                  <th>แหล่งที่อยู่</th>
                  <th>ความชุกชุม</th>
                  <th className="r">นับล่าสุด</th>
                  <th>พบครั้งแรก</th>
                  <th>ความเสี่ยง (เซนเซอร์)</th>
                  <th className="r">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {occs.map((o) => {
                  const risk = riskFor(o.caveId);
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/dashboard/${o.caveId}?view=bio`} className="link">
                          {caveName(o.caveId)}
                        </Link>
                      </td>
                      <td>{o.habitats.map((h) => labelOf(HABITATS, h)).join(', ') || '—'}</td>
                      <td>{labelOf(ABUNDANCES, o.abundance)}</td>
                      <td className="r num">{latestCount(o)?.toLocaleString('th-TH') ?? '—'}</td>
                      <td className="num">{o.firstSeen ?? '—'}</td>
                      <td>
                        {risk ? (
                          <span className="risk__level">
                            <RiskPips level={risk.level} /> {RISK_LABEL[risk.level]}
                          </span>
                        ) : (
                          <span className="muted small">ไม่มีเซนเซอร์</span>
                        )}
                      </td>
                      <td className="r">
                        <div className="row-actions">
                          <Link to={`/registry/occurrence/${o.id}/edit`} className="btn btn--ghost btn--sm" title="แก้ไขการพบ" aria-label={`แก้ไขการพบใน ${caveName(o.caveId)}`}>
                            <LuPencil size={14} aria-hidden="true" />
                          </Link>
                          {o.origin === 'added' && (
                            <button
                              className="btn btn--ghost btn--sm"
                              title="ลบการพบ"
                              aria-label={`ลบการพบใน ${caveName(o.caveId)}`}
                              onClick={() => window.confirm(`ลบบันทึกการพบใน ${caveName(o.caveId)}?`) && removeOccurrence(o.id)}
                            >
                              <LuTrash2 size={14} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="info-grid info-grid--2">
        <Panel overline="Population records" title="ข้อมูลประชากร">
          {popRows.length === 0 ? (
            <p className="muted">ยังไม่มีผลนับประชากร</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={popRows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="date" stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} />
                  <YAxis stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} width={52} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text }} formatter={(v: number, k: string) => [v.toLocaleString('th-TH'), caveName(k)]} />
                  <Legend formatter={(k: string) => caveName(k)} />
                  {caveIds.map((cid) => (
                    <Line key={cid} dataKey={cid} stroke={CAVE_COLOR[cid] ?? C.accent} strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {occs.some((o) => o.population.length) && (
            <p className="muted small">วิธีนับ: {[...new Set(occs.flatMap((o) => o.population.map((p) => labelOf(COUNT_METHODS, p.method))))].join(', ')}</p>
          )}
        </Panel>

        <Panel overline="Voucher specimens" title="ตัวอย่างอ้างอิง">
          {vouchers.length === 0 ? (
            <p className="muted">ยังไม่มีตัวอย่างอ้างอิง</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>เลขฐานข้อมูล</th>
                    <th>สถาบัน</th>
                    <th>ถ้ำ</th>
                    <th>วันที่เก็บ</th>
                    <th>ผู้เก็บ</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v, i) => (
                    <tr key={i}>
                      <td className="num">{v.catalog}</td>
                      <td>{v.institution}</td>
                      <td>{caveName(v.caveId)}</td>
                      <td className="num">{v.date ?? '—'}</td>
                      <td>{v.collector ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel overline="DNA barcode & molecular" title="DNA Barcode และข้อมูลอณูชีววิทยา">
        {sp.dna.length === 0 ? (
          <p className="muted">ยังไม่มีข้อมูล DNA</p>
        ) : (
          <ul className="dna-list">
            {sp.dna.map((d, i) => {
              const href = dnaLink(d);
              return (
                <li key={i}>
                  <LuDna size={16} aria-hidden="true" />
                  <strong>{d.marker}</strong>
                  <span className="muted">{d.database}</span>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="link num">
                      {d.accession} ↗
                    </a>
                  ) : (
                    <span className="num">{d.accession}</span>
                  )}
                  {d.note && <span className="muted small">{d.note}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
