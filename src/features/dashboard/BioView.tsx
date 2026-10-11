/** แท็บ "ความหลากหลายทางชีวภาพ" ของถ้ำ (ใช้ได้ทั้งถ้ำที่มีและไม่มีเซนเซอร์) */
import { Link } from 'react-router-dom';
import { LuBug, LuPencil, LuPlus } from 'react-icons/lu';
import { RISK_LABEL } from '../../api/analytics';
import { ABUNDANCES, HABITATS, THREATENED, TRUE_CAVE } from '../../config/bio-options';
import { labelOf } from '../../config/inventory-options';
import { SENSORS } from '../../config/sensors';
import { isEndemic, latestCount } from '../../domain/biodiversity';
import type { CaveId } from '../../domain/types';
import { useCaveSpecies, type CaveSpeciesRow } from '../../biodb';
import { useAnalytics } from '../../hooks/queries';
import { useCave } from '../../registry';
import { Kpi, Loading, Panel } from '../../shared/ui';
import { EcoBadge, IucnBadge, SpeciesThumb } from '../registry/bio-ui';
import { RiskPips } from './parts';

export default function BioView({ caveId }: { caveId: CaveId }) {
  const cave = useCave(caveId);
  const rows = useCaveSpecies(caveId);
  if (!cave) return <Loading />;

  const addHref = `/registry/occurrence/new?cave=${caveId}`;
  if (rows.length === 0)
    return (
      <div className="empty-state">
        <LuBug size={36} aria-hidden="true" />
        <h3>ยังไม่มีข้อมูลชนิดพันธุ์ในถ้ำนี้</h3>
        <p className="muted">บันทึกชนิดพันธุ์ที่พบ พร้อมแหล่งที่อยู่ ข้อมูลประชากร และตัวอย่างอ้างอิง</p>
        <Link to={addHref} className="btn btn--pill btn--primary btn--sm">
          <LuPlus size={14} aria-hidden="true" /> บันทึกชนิดพันธุ์แรก
        </Link>
      </div>
    );

  const trueCave = rows.filter((r) => TRUE_CAVE.includes(r.species.ecoClass)).length;
  const endemic = rows.filter((r) => isEndemic(r.species)).length;
  const threatened = rows.filter((r) => THREATENED.includes(r.species.iucn)).length;

  return (
    <div className="dash">
      <div className="kpi-strip">
        <Kpi label="ชนิดพันธุ์ที่พบ" value={rows.length} unit="ชนิด" />
        <Kpi label="สัตว์ถ้ำแท้" value={trueCave} unit="ชนิด" sub="Troglobite / Stygobite" />
        <Kpi label="ชนิดพันธุ์เฉพาะถิ่น" value={endemic} unit="ชนิด" />
        <Kpi label="ถูกคุกคาม (IUCN)" value={threatened} unit="ชนิด" sub="VU · EN · CR" status={threatened ? 'critical' : undefined} />
      </div>
      <div className="dash__row">
        <CaveSpeciesTable rows={rows} addHref={addHref} className={cave.hasSensors ? 'span-7' : undefined} />
        {cave.hasSensors && <SpeciesRiskPanel caveId={caveId} />}
      </div>
    </div>
  );
}

function CaveSpeciesTable({ rows, addHref, className }: { rows: CaveSpeciesRow[]; addHref: string; className?: string }) {
  return (
    <Panel
      overline="Species occurrence"
      title="ชนิดพันธุ์ที่พบ"
      className={className}
      actions={
        <Link to={addHref} className="btn btn--pill btn--sm btn--primary">
          <LuPlus size={14} aria-hidden="true" /> บันทึกการพบ
        </Link>
      }
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th aria-label="รูป" />
              <th>ชนิดพันธุ์</th>
              <th>IUCN</th>
              <th>สัตว์ถ้ำ</th>
              <th>แหล่งที่อยู่</th>
              <th>ความชุกชุม</th>
              <th className="r">นับล่าสุด</th>
              <th aria-label="จัดการ" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ species, occurrence }) => (
              <tr key={occurrence.id}>
                <td>
                  <SpeciesThumb image={species.image} size={32} />
                </td>
                <td>
                  <Link to={`/registry/species/${species.id}`} className="link">
                    {species.name}
                  </Link>{' '}
                  {isEndemic(species) && <span className="tag">ถิ่นเดียว</span>}
                  <div className="muted small">
                    <i>{species.sciName}</i>
                  </div>
                </td>
                <td>
                  <IucnBadge status={species.iucn} />
                </td>
                <td>
                  <EcoBadge value={species.ecoClass} />
                </td>
                <td className="small">{occurrence.habitats.map((h) => labelOf(HABITATS, h)).join(', ') || '—'}</td>
                <td>{labelOf(ABUNDANCES, occurrence.abundance)}</td>
                <td className="r num">{latestCount(occurrence)?.toLocaleString('th-TH') ?? '—'}</td>
                <td className="r">
                  <Link to={`/registry/occurrence/${occurrence.id}/edit`} className="btn btn--ghost btn--sm" title="แก้ไขการพบ" aria-label={`แก้ไขการพบ ${species.name}`}>
                    <LuPencil size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">ชนิดพันธุ์ตั้งต้นเป็นชื่อสมมติสำหรับ prototype ไม่ใช่ผลสำรวจจริง</p>
    </Panel>
  );
}

function SpeciesRiskPanel({ caveId }: { caveId: CaveId }) {
  const { data: analytics } = useAnalytics();
  const risks = analytics?.find((a) => a.caveId === caveId)?.speciesRisk;
  return (
    <Panel overline="Species at Risk" title="ความเสี่ยงชนิดพันธุ์" className="span-5">
      {!risks ? (
        <Loading />
      ) : (
        <ul className="risklist">
          {risks.map((r) => (
            <li key={r.occurrence.id} className={`risk risk--${r.level}`}>
              <div className="risk__main">
                <div className="risk__name">
                  <Link to={`/registry/species/${r.species.id}`} className="link">
                    {r.species.name}
                  </Link>
                  {isEndemic(r.species) && <span className="tag">ถิ่นเดียว</span>}
                </div>
                <div className="muted small">
                  {r.species.group}
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
      <p className="muted small">คำนวณจากค่าเซนเซอร์ล่าสุด × ความไวของแต่ละชนิด</p>
    </Panel>
  );
}
