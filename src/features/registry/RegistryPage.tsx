/** หน้าทะเบียนถ้ำ: ค้นหา กรอง เพิ่ม แก้ไข ลบ ส่งออก */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuDownload, LuPencil, LuPlus, LuRotateCcw, LuSearch, LuTrash2 } from 'react-icons/lu';
import { CAVE_TYPES, labelOf, PROTECTION_STATUSES, THREAT_LEVELS, TOURISM_STATUSES } from '../../config/inventory-options';
import { REGIONS, type RegionKey } from '../../config/regions';
import { districtName, provinceName } from '../../domain/admin';
import { csvRows, exportJson, maxThreat } from '../../domain/registry';
import type { CaveType } from '../../domain/types';
import { useOccurrences } from '../../biodb';
import { useCaveList, useRegistry } from '../../registry';
import { downloadCsv, NoSensorBadge, Panel } from '../../shared/ui';
import { ThreatTag } from './CaveInfo';
import { downloadText, fileStamp, RegistryTabs } from './bio-ui';

export default function RegistryPage() {
  const caves = useCaveList();
  const remove = useRegistry((s) => s.remove);
  const resetSeed = useRegistry((s) => s.resetSeed);
  const occurrences = useOccurrences();
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<RegionKey | ''>('');
  const [type, setType] = useState<CaveType | ''>('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return caves.filter((c) => {
      const a = c.inventory.admin;
      if (region && a.region !== region) return false;
      if (type && c.inventory.caveType !== type) return false;
      if (!needle) return true;
      return [c.id, c.name, c.nameEn ?? '', provinceName(a.provinceCode), districtName(a.districtCode)].some((s) => s.toLowerCase().includes(needle));
    });
  }, [caves, q, region, type]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="overline">National Cave Inventory</div>
          <h1 className="page__title">ฐานข้อมูลถ้ำ</h1>
          <p className="muted">
            ถ้ำในฐานข้อมูล {caves.length} แห่ง · มีเซนเซอร์ {caves.filter((c) => c.hasSensors).length} แห่ง · ข้อมูลที่เพิ่ม/แก้เก็บในเบราว์เซอร์นี้ (localStorage)
          </p>
        </div>
        <div className="btn-row">
          <button className="btn btn--pill btn--sm" onClick={() => downloadText(`cave-registry-${fileStamp()}.json`, exportJson(caves), 'application/json')}>
            <LuDownload size={14} aria-hidden="true" /> JSON
          </button>
          <button className="btn btn--pill btn--sm" onClick={() => downloadCsv(`cave-registry-${fileStamp()}.csv`, csvRows(caves))}>
            <LuDownload size={14} aria-hidden="true" /> CSV
          </button>
          <Link to="/registry/new" className="btn btn--pill btn--primary">
            <LuPlus size={16} aria-hidden="true" /> เพิ่มถ้ำ
          </Link>
        </div>
      </div>

      <RegistryTabs />

      <div className="toolbar registry-filters">
        <label className="search">
          <LuSearch size={16} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ รหัส จังหวัด อำเภอ" aria-label="ค้นหาถ้ำ" />
        </label>
        <select value={region} onChange={(e) => setRegion(e.target.value as RegionKey | '')} aria-label="กรองตามภาค">
          <option value="">ทุกภาค</option>
          {REGIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.th}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as CaveType | '')} aria-label="กรองตามประเภทถ้ำ">
          <option value="">ทุกประเภท</option>
          {CAVE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <Panel>
        {rows.length === 0 ? (
          <p className="muted center">ไม่พบถ้ำที่ตรงกับเงื่อนไข</p>
        ) : (
          <div className="table-wrap">
            <table className="table registry-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อถ้ำ</th>
                  <th>ประเภท</th>
                  <th>จังหวัด / อำเภอ</th>
                  <th>การคุ้มครอง</th>
                  <th>การท่องเที่ยว</th>
                  <th>ภัยคุกคามสูงสุด</th>
                  <th>เซนเซอร์</th>
                  <th>ที่มา</th>
                  <th className="r">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const i = c.inventory;
                  const top = maxThreat(i.threats);
                  return (
                    <tr key={c.id}>
                      <td className="num">{c.id}</td>
                      <td>
                        <Link to={`/dashboard/${c.id}?view=info`} className="link">
                          {c.name}
                        </Link>
                        {c.nameEn && <div className="muted small">{c.nameEn}</div>}
                      </td>
                      <td>{labelOf(CAVE_TYPES, i.caveType).replace(/ \(.*\)$/, '')}</td>
                      <td>
                        {provinceName(i.admin.provinceCode)}
                        <div className="muted small">อ.{districtName(i.admin.districtCode)}</div>
                      </td>
                      <td>{labelOf(PROTECTION_STATUSES, i.protection.status) || '—'}</td>
                      <td>{labelOf(TOURISM_STATUSES, i.tourism.status) || '—'}</td>
                      <td>{top ? <ThreatTag level={top} /> : '—'}</td>
                      <td>{c.hasSensors ? <span className="small">มี 5 ตัว</span> : <NoSensorBadge compact />}</td>
                      <td>
                        <span className={`origin origin--${c.origin === 'added' ? 'added' : c.edited ? 'edited' : 'seed'}`}>
                          {c.origin === 'added' ? 'เพิ่มใหม่' : c.edited ? 'แก้ไขแล้ว' : 'ตั้งต้น'}
                        </span>
                      </td>
                      <td className="r">
                        <div className="row-actions">
                          <Link to={`/registry/${c.id}/edit`} className="btn btn--ghost btn--sm" title="แก้ไข" aria-label={`แก้ไข ${c.name}`}>
                            <LuPencil size={14} aria-hidden="true" />
                          </Link>
                          {c.origin === 'added' && (
                            <button
                              className="btn btn--ghost btn--sm"
                              title="ลบ"
                              aria-label={`ลบ ${c.name}`}
                              onClick={() => {
                                const n = occurrences.filter((o) => o.caveId === c.id).length;
                                if (window.confirm(`ลบ "${c.name}" (${c.id}) ออกจากฐานข้อมูล?${n ? `
บันทึกการพบชนิดพันธุ์ ${n} รายการในถ้ำนี้จะถูกลบไปด้วย` : ''}`)) remove(c.id);
                              }}
                            >
                              <LuTrash2 size={14} aria-hidden="true" />
                            </button>
                          )}
                          {c.edited && (
                            <button
                              className="btn btn--ghost btn--sm"
                              title="คืนค่าเดิม"
                              aria-label={`คืนค่าเดิม ${c.name}`}
                              onClick={() => window.confirm(`คืนข้อมูล "${c.name}" เป็นค่าเดิม? การแก้ไขทั้งหมดจะหายไป`) && resetSeed(c.id)}
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
        <p className="muted small">
          ระดับภัยคุกคาม: {THREAT_LEVELS.map((l) => l.label).join(' / ')} · ขอบเขตการปกครอง: UN OCHA COD-AB Thailand (กรมแผนที่ทหาร 2019, CC BY-IGO)
        </p>
      </Panel>
    </div>
  );
}
