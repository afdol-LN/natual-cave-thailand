/** แท็บ "ข้อมูลถ้ำ": ข้อมูลทะเบียนถ้ำแบบอ่านอย่างเดียว */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LuPencil } from 'react-icons/lu';
import {
  CAVE_TYPES,
  HYDRO_TYPES,
  KARST_TYPES,
  labelOf,
  MORPHOLOGIES,
  PROTECTION_STATUSES,
  THREAT_LEVELS,
  THREATS,
  TOURISM_STATUSES,
} from '../../config/inventory-options';
import { regionLabel } from '../../config/regions';
import { districtName, provinceName } from '../../domain/admin';
import type { CaveId, ThreatLevel } from '../../domain/types';
import { useCave } from '../../registry';
import { Kpi, Loading, Panel } from '../../shared/ui';
import { mapImageUrl } from '../../api/upload';

const NONE = <span className="muted">ยังไม่มีข้อมูล</span>;
const num = (v: number | undefined, unit: string) => (v == null ? NONE : `${v.toLocaleString('th-TH')} ${unit}`);
const txt = (v: string | undefined) => (v ? v : NONE);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field-view">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ThreatTag({ level, label }: { level: ThreatLevel; label?: string }) {
  return (
    <span className={`threat threat--${level}`}>
      {label && <span>{label}</span>}
      <span className="threat__level">{labelOf(THREAT_LEVELS, level)}</span>
    </span>
  );
}

export default function CaveInfo({ caveId }: { caveId: CaveId }) {
  const cave = useCave(caveId);
  if (!cave) return <Loading />;
  const i = cave.inventory;
  const threats = THREATS.filter((t) => i.threats[t.value]);

  return (
    <div className="dash">
      <div className="info-head">
        <div className="muted small">
          {cave.origin === 'added' ? 'ถ้ำที่เพิ่มในฐานข้อมูล' : cave.edited ? 'ถ้ำตั้งต้น · แก้ไขแล้ว' : 'ถ้ำตั้งต้น'}
          {i.source && ` · แหล่งข้อมูล: ${i.source}`}
        </div>
        <Link to={`/registry/${cave.id}/edit`} className="btn btn--pill btn--sm">
          <LuPencil size={14} aria-hidden="true" /> แก้ไขข้อมูล
        </Link>
      </div>

      <div className="kpi-strip">
        <Kpi label="รหัสถ้ำ" value={cave.id} sub={labelOf(CAVE_TYPES, i.caveType)} />
        <Kpi label="ที่ตั้ง" value={provinceName(i.admin.provinceCode) || cave.province} sub={`อ.${districtName(i.admin.districtCode)} · ${regionLabel(i.admin.region)}`} />
        <Kpi label="พิกัด" value={`${cave.lat.toFixed(4)}, ${cave.lon.toFixed(4)}`} sub={cave.coordsVerified ? 'ยืนยันแล้ว' : 'พิกัดยังไม่ยืนยัน'} />
        <Kpi label="ความยาว" value={i.dimensions.lengthM == null ? '—' : i.dimensions.lengthM.toLocaleString('th-TH')} unit="ม." />
      </div>

      <div className="info-grid info-grid--2">
        <Panel overline="Identity & Location" title="ข้อมูลหลักและที่ตั้ง">
          <dl className="field-list">
            <Field label="ชื่อถ้ำ">{cave.name}</Field>
            <Field label="ชื่อภาษาอังกฤษ">{txt(cave.nameEn)}</Field>
            <Field label="ประเภทถ้ำ">{labelOf(CAVE_TYPES, i.caveType)}</Field>
            <Field label="ภาค / จังหวัด / อำเภอ">
              {regionLabel(i.admin.region)} · {provinceName(i.admin.provinceCode)} · อ.{districtName(i.admin.districtCode)}
            </Field>
            <Field label="ภูมิศาสตร์">{txt(i.geographyNote)}</Field>
            <Field label="บริบทเชิงพื้นที่">{txt(i.spatialNote)}</Field>
          </dl>
        </Panel>

        <Panel overline="Karst & Geology" title="ภูมิประเทศคาสต์และธรณีวิทยา">
          <dl className="field-list">
            <Field label="ภูมิประเทศคาสต์">{txt(labelOf(KARST_TYPES, i.karst))}</Field>
            <Field label="ชนิดหิน">{txt(i.geology.rockType)}</Field>
            <Field label="ยุคทางธรณีวิทยา">{txt(i.geology.era)}</Field>
            <Field label="หมวดหิน">{txt(i.geology.formation)}</Field>
            <Field label="คำอธิบาย">{txt(i.geology.note)}</Field>
          </dl>
        </Panel>

        <Panel overline="Morphology & Dimensions" title="สัณฐานและมิติของถ้ำ">
          <dl className="field-list">
            <Field label="สัณฐานถ้ำ">
              {i.morphology.length ? (
                <span className="chips">
                  {i.morphology.map((m) => (
                    <span key={m} className="chip">
                      {labelOf(MORPHOLOGIES, m)}
                    </span>
                  ))}
                </span>
              ) : (
                NONE
              )}
            </Field>
            <Field label="ความยาว">{num(i.dimensions.lengthM, 'ม.')}</Field>
            <Field label="ความลึก">{num(i.dimensions.depthM, 'ม.')}</Field>
            <Field label="ความสูงจากระดับน้ำทะเล">{num(i.dimensions.elevationM, 'ม.')}</Field>
            <Field label="จำนวนชั้น">{num(i.dimensions.levels, 'ชั้น')}</Field>
            <Field label="ความกว้างปากถ้ำ">{num(i.dimensions.entranceWidthM, 'ม.')}</Field>
          </dl>
        </Panel>

        <Panel overline="Hydrology" title="ลักษณะทางอุทกวิทยา">
          <dl className="field-list">
            <Field label="ประเภทน้ำ">{txt(labelOf(HYDRO_TYPES, i.hydrology.type))}</Field>
            <Field label="คำอธิบาย">{txt(i.hydrology.note)}</Field>
          </dl>
        </Panel>

        <Panel overline="Protection & Tourism" title="การคุ้มครองและการท่องเที่ยว">
          <dl className="field-list">
            <Field label="สถานภาพการคุ้มครอง">{txt(labelOf(PROTECTION_STATUSES, i.protection.status))}</Field>
            <Field label="หน่วยงานที่ดูแล">{txt(i.protection.agency)}</Field>
            <Field label="สถานภาพการท่องเที่ยว">{txt(labelOf(TOURISM_STATUSES, i.tourism.status))}</Field>
            <Field label="นักท่องเที่ยวต่อปี">{num(i.tourism.visitorsPerYear, 'คน')}</Field>
          </dl>
        </Panel>

        <Panel overline="Threat Assessment" title="การประเมินภัยคุกคาม">
          {threats.length ? (
            <ul className="threat-list">
              {threats.map((t) => (
                <li key={t.value}>
                  <span>{t.label}</span>
                  <ThreatTag level={i.threats[t.value]!} />
                </li>
              ))}
            </ul>
          ) : (
            <p>{NONE}</p>
          )}
        </Panel>
      </div>

      <div className="info-grid info-grid--2">
        <Panel overline="Cave Map" title="แผนที่ถ้ำ">
          {i.mapImage ? (
            <a href={mapImageUrl(i.mapImage)} target="_blank" rel="noopener noreferrer">
              <img className="cave-map" src={mapImageUrl(i.mapImage)} alt={`แผนที่${cave.name}`} />
            </a>
          ) : (
            <p>{NONE}</p>
          )}
        </Panel>
        <Panel overline="Virtual 3D Tour" title="ทัวร์ 3D">
          {i.tourUrl ? (
            <iframe className="tour-frame" src={i.tourUrl} title={`Virtual 3D tour ${cave.name}`} loading="lazy" allow="fullscreen; xr-spatial-tracking" allowFullScreen />
          ) : (
            <p>{NONE}</p>
          )}
        </Panel>
      </div>

      {i.note && (
        <Panel overline="Notes" title="หมายเหตุ">
          <p>{i.note}</p>
        </Panel>
      )}
    </div>
  );
}
