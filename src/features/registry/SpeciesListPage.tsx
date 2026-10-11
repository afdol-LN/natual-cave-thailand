/** ทะเบียนชนิดพันธุ์: ค้นหา กรอง เพิ่ม แก้ไข ลบ ส่งออก */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuDownload, LuPencil, LuPlus, LuRotateCcw, LuSearch, LuTrash2 } from 'react-icons/lu';
import { ECO_CLASSES, IUCN } from '../../config/bio-options';
import { labelOf } from '../../config/inventory-options';
import { distribution, endemismConflict, isEndemic, occurrenceCsvRows, speciesCsvRows } from '../../domain/biodiversity';
import type { EcoClass, IucnStatus } from '../../domain/types';
import { useBio, useOccurrences, useSpeciesList } from '../../biodb';
import { useCaveList, useCaveName } from '../../registry';
import { downloadCsv, Panel } from '../../shared/ui';
import { downloadText, EcoBadge, fileStamp, IucnBadge, RegistryTabs, SpeciesThumb } from './bio-ui';

export default function SpeciesListPage() {
  const species = useSpeciesList();
  const occurrences = useOccurrences();
  const caves = useCaveList();
  const caveName = useCaveName();
  const removeSpecies = useBio((s) => s.removeSpecies);
  const resetSpecies = useBio((s) => s.resetSpecies);
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('');
  const [iucn, setIucn] = useState<IucnStatus | ''>('');
  const [eco, setEco] = useState<EcoClass | ''>('');
  const [cave, setCave] = useState('');

  const classes = useMemo(() => [...new Set(species.map((s) => s.taxonomy.class))].sort(), [species]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return species.filter((s) => {
      if (cls && s.taxonomy.class !== cls) return false;
      if (iucn && s.iucn !== iucn) return false;
      if (eco && s.ecoClass !== eco) return false;
      if (cave && !occurrences.some((o) => o.speciesId === s.id && o.caveId === cave)) return false;
      if (!needle) return true;
      return [s.id, s.name, s.sciName, s.taxonomy.family ?? '', s.taxonomy.genus ?? '', s.group].some((v) => v.toLowerCase().includes(needle));
    });
  }, [species, occurrences, q, cls, iucn, eco, cave]);

  const speciesName = (id: string) => species.find((s) => s.id === id)?.name ?? id;
  const exportJson = () =>
    downloadText(`cave-biodiversity-${fileStamp()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), species, occurrences }, null, 2), 'application/json');

  const onRemove = (id: string, name: string) => {
    const n = occurrences.filter((o) => o.speciesId === id).length;
    if (window.confirm(`ลบ "${name}" ออกจากฐานข้อมูล?${n ? `\nการพบ ${n} รายการของชนิดนี้จะถูกลบไปด้วย` : ''}`)) removeSpecies(id);
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="overline">Cave Biodiversity Database</div>
          <h1 className="page__title">ฐานข้อมูลชนิดพันธุ์</h1>
          <p className="muted">
            ชนิดพันธุ์ {species.length} ชนิด · บันทึกการพบ {occurrences.length} รายการ · ข้อมูลที่เพิ่ม/แก้เก็บในเบราว์เซอร์นี้ (localStorage)
          </p>
        </div>
        <div className="btn-row">
          <button className="btn btn--pill btn--sm" onClick={exportJson}>
            <LuDownload size={14} aria-hidden="true" /> JSON
          </button>
          <button className="btn btn--pill btn--sm" onClick={() => downloadCsv(`species-${fileStamp()}.csv`, speciesCsvRows(species, occurrences))}>
            <LuDownload size={14} aria-hidden="true" /> CSV ชนิดพันธุ์
          </button>
          <button className="btn btn--pill btn--sm" onClick={() => downloadCsv(`occurrences-${fileStamp()}.csv`, occurrenceCsvRows(occurrences, speciesName, caveName))}>
            <LuDownload size={14} aria-hidden="true" /> CSV การพบ
          </button>
          <Link to="/registry/species/new" className="btn btn--pill btn--primary">
            <LuPlus size={16} aria-hidden="true" /> เพิ่มชนิดพันธุ์
          </Link>
        </div>
      </div>

      <RegistryTabs />

      <div className="toolbar registry-filters">
        <label className="search">
          <LuSearch size={16} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อไทย ชื่อวิทยาศาสตร์ วงศ์ รหัส" aria-label="ค้นหาชนิดพันธุ์" />
        </label>
        <select value={cls} onChange={(e) => setCls(e.target.value)} aria-label="กรองตามชั้น">
          <option value="">ทุกชั้น (Class)</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={iucn} onChange={(e) => setIucn(e.target.value as IucnStatus | '')} aria-label="กรองตาม IUCN">
          <option value="">ทุกสถานภาพ IUCN</option>
          {IUCN.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={eco} onChange={(e) => setEco(e.target.value as EcoClass | '')} aria-label="กรองตามสถานภาพสัตว์ถ้ำ">
          <option value="">ทุกสถานภาพสัตว์ถ้ำ</option>
          {ECO_CLASSES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={cave} onChange={(e) => setCave(e.target.value)} aria-label="กรองตามถ้ำที่พบ">
          <option value="">ทุกถ้ำ</option>
          {caves.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Panel>
        {rows.length === 0 ? (
          <p className="muted center">ไม่พบชนิดพันธุ์ที่ตรงกับเงื่อนไข</p>
        ) : (
          <div className="table-wrap">
            <table className="table registry-table">
              <thead>
                <tr>
                  <th aria-label="รูป" />
                  <th>ชนิดพันธุ์</th>
                  <th>วงศ์</th>
                  <th>IUCN</th>
                  <th>สัตว์ถ้ำ</th>
                  <th>เฉพาะถิ่น</th>
                  <th className="r">ถ้ำที่พบ</th>
                  <th>ที่มา</th>
                  <th className="r">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const caveCount = distribution(s.id, occurrences).length;
                  return (
                    <tr key={s.id}>
                      <td>
                        <SpeciesThumb image={s.image} size={36} />
                      </td>
                      <td>
                        <Link to={`/registry/species/${s.id}`} className="link">
                          {s.name}
                        </Link>
                        <div className="muted small">
                          <i>{s.sciName}</i> · {s.id}
                        </div>
                      </td>
                      <td>
                        {s.taxonomy.family || '—'}
                        <div className="muted small">{s.taxonomy.class}</div>
                      </td>
                      <td>
                        <IucnBadge status={s.iucn} />
                      </td>
                      <td>
                        <EcoBadge value={s.ecoClass} />
                      </td>
                      <td>
                        {isEndemic(s) ? <span className="tag">ถิ่นเดียว</span> : '—'}
                        {endemismConflict(s, caveCount) && <div className="field__warn small">พบหลายถ้ำ</div>}
                      </td>
                      <td className="r num">{caveCount}</td>
                      <td>
                        <span className={`origin origin--${s.origin === 'added' ? 'added' : s.edited ? 'edited' : 'seed'}`}>
                          {s.origin === 'added' ? 'เพิ่มใหม่' : s.edited ? 'แก้ไขแล้ว' : 'ตั้งต้น'}
                        </span>
                      </td>
                      <td className="r">
                        <div className="row-actions">
                          <Link to={`/registry/species/${s.id}/edit`} className="btn btn--ghost btn--sm" title="แก้ไข" aria-label={`แก้ไข ${s.name}`}>
                            <LuPencil size={14} aria-hidden="true" />
                          </Link>
                          {s.origin === 'added' && (
                            <button className="btn btn--ghost btn--sm" title="ลบ" aria-label={`ลบ ${s.name}`} onClick={() => onRemove(s.id, s.name)}>
                              <LuTrash2 size={14} aria-hidden="true" />
                            </button>
                          )}
                          {s.edited && (
                            <button
                              className="btn btn--ghost btn--sm"
                              title="คืนค่าเดิม"
                              aria-label={`คืนค่าเดิม ${s.name}`}
                              onClick={() => window.confirm(`คืนข้อมูล "${s.name}" เป็นค่าเดิม?`) && resetSpecies(s.id)}
                            >
                              <LuRotateCcw size={14} aria-hidden="true" />
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
        <p className="muted small">สถานภาพสัตว์ถ้ำ: {labelOf(ECO_CLASSES, 'troglobite')} และ Stygobite คือสัตว์ถ้ำแท้ที่อาศัยในถ้ำตลอดชีวิต · ชนิดพันธุ์ตั้งต้นเป็นข้อมูลสมมติ</p>
      </Panel>
    </div>
  );
}
