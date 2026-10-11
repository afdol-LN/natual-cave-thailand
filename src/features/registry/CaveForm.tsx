/** ฟอร์มเพิ่ม/แก้ไขทะเบียนถ้ำ (/registry/new, /registry/:caveId/edit) */
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuUpload, LuX } from 'react-icons/lu';
import { mapImageUrl, uploadCaveMap } from '../../api/upload';
import {
  CAVE_TYPES,
  GEOLOGIC_ERAS,
  HYDRO_TYPES,
  KARST_TYPES,
  MORPHOLOGIES,
  PROTECTION_STATUSES,
  ROCK_TYPES,
  THREAT_LEVELS,
  THREATS,
  TOURISM_STATUSES,
} from '../../config/inventory-options';
import { regionLabel, type RegionKey } from '../../config/regions';
import { provinceName } from '../../domain/admin';
import { nextCaveId } from '../../domain/registry';
import type { CaveInventory, CaveRecord, CaveType, ThreatKey, ThreatLevel } from '../../domain/types';
import { useCaveList, useRegistry } from '../../registry';
import { Loading, Panel } from '../../shared/ui';
import { Field, NumberInput, Select, toOptions } from './fields';
import LocationFields from './LocationFields';

type Errors = Partial<Record<'name' | 'caveType' | 'lat' | 'lon' | 'region' | 'province' | 'district', string>>;

function emptyInventory(): CaveInventory {
  return {
    caveType: '' as CaveType,
    admin: { region: '' as RegionKey, provinceCode: '', districtCode: '' },
    geology: {},
    morphology: [],
    dimensions: {},
    hydrology: {},
    protection: {},
    tourism: {},
    threats: {},
  };
}

function newCave(id: string): CaveRecord {
  return { id, name: '', lat: NaN, lon: NaN, coordsVerified: false, province: '', region: '', hasSensors: false, origin: 'added', edited: false, inventory: emptyInventory() };
}

// ───────────── form ─────────────

export default function CaveForm() {
  const { caveId } = useParams();
  const caves = useCaveList();
  const existing = caveId ? caves.find((c) => c.id === caveId) : undefined;
  if (caveId && !existing) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>ไม่พบถ้ำรหัส {caveId}</h3>
          <Link to="/registry" className="btn btn--pill btn--sm">
            กลับไปฐานข้อมูลถ้ำ
          </Link>
        </div>
      </div>
    );
  }
  if (!caves.length) return <Loading />;
  // key: เปลี่ยนถ้ำแล้วเริ่มฟอร์มใหม่
  return <CaveFormBody key={caveId ?? 'new'} initial={existing ?? newCave(nextCaveId(caves.map((c) => c.id)))} isNew={!existing} />;
}

function CaveFormBody({ initial, isNew }: { initial: CaveRecord; isNew: boolean }) {
  const navigate = useNavigate();
  const upsert = useRegistry((s) => s.upsert);
  const [rec, setRec] = useState<CaveRecord>(initial);
  const [latText, setLatText] = useState(Number.isFinite(initial.lat) ? String(initial.lat) : '');
  const [lonText, setLonText] = useState(Number.isFinite(initial.lon) ? String(initial.lon) : '');
  const [errors, setErrors] = useState<Errors>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const inv = rec.inventory;
  const setInv = (patch: Partial<CaveInventory>) => setRec((r) => ({ ...r, inventory: { ...r.inventory, ...patch } }));
  const setThreat = (k: ThreatKey, level: ThreatLevel | undefined) => {
    const next = { ...inv.threats };
    if (level) next[k] = level;
    else delete next[k];
    setInv({ threats: next });
  };

  const validate = (): Errors => {
    const e: Errors = {};
    const lat = Number(latText);
    const lon = Number(lonText);
    if (!rec.name.trim()) e.name = 'กรุณากรอกชื่อถ้ำ';
    if (!inv.caveType) e.caveType = 'กรุณาเลือกประเภทถ้ำ';
    if (latText.trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) e.lat = 'ละติจูดไม่ถูกต้อง';
    if (lonText.trim() === '' || !Number.isFinite(lon) || lon < -180 || lon > 180) e.lon = 'ลองจิจูดไม่ถูกต้อง';
    if (!inv.admin.region) e.region = 'กรุณาเลือกภาค';
    if (!inv.admin.provinceCode) e.province = 'กรุณาเลือกจังหวัด';
    if (!inv.admin.districtCode) e.district = 'กรุณาเลือกอำเภอ';
    return e;
  };

  const save = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const final: CaveRecord = {
      ...rec,
      name: rec.name.trim(),
      nameEn: rec.nameEn?.trim() || undefined,
      lat: Number(latText),
      lon: Number(lonText),
      province: provinceName(inv.admin.provinceCode),
      region: regionLabel(inv.admin.region),
    };
    upsert(final);
    navigate(`/dashboard/${final.id}?view=info`);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      setInv({ mapImage: await uploadCaveMap(rec.id, file) });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const title = useMemo(() => (isNew ? 'เพิ่มถ้ำในฐานข้อมูล' : `แก้ไข: ${initial.name}`), [isNew, initial.name]);

  return (
    <form className="page cave-form" onSubmit={save} noValidate>
      <div className="page__head">
        <div>
          <div className="overline">National Cave Inventory · {rec.id}</div>
          <h1 className="page__title">{title}</h1>
          <p className="muted">ช่องที่มี * ต้องกรอก ช่องอื่นเว้นว่างได้ · ข้อมูลเก็บในเบราว์เซอร์นี้ (localStorage)</p>
        </div>
      </div>

      <Panel overline="Identity" title="ข้อมูลหลัก">
        <div className="form-grid">
          <Field label="รหัสถ้ำ">
            <input value={rec.id} readOnly className="is-readonly" />
          </Field>
          <Field label="ประเภทถ้ำ" required error={errors.caveType}>
            <select value={inv.caveType} onChange={(e) => setInv({ caveType: e.target.value as CaveType })} aria-invalid={!!errors.caveType}>
              <option value="">— เลือกประเภทถ้ำ —</option>
              {CAVE_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ชื่อถ้ำ (ไทย)" required error={errors.name}>
            <input value={rec.name} onChange={(e) => setRec({ ...rec, name: e.target.value })} placeholder="เช่น ถ้ำเชียงดาว" aria-invalid={!!errors.name} />
          </Field>
          <Field label="ชื่อภาษาอังกฤษ">
            <input value={rec.nameEn ?? ''} onChange={(e) => setRec({ ...rec, nameEn: e.target.value })} placeholder="เช่น Tham Chiang Dao" />
          </Field>
        </div>
      </Panel>

      <Panel overline="Location" title="ที่ตั้ง">
        <LocationFields
          latText={latText}
          lonText={lonText}
          admin={inv.admin}
          onCoords={(la, lo) => {
            setLatText(la);
            setLonText(lo);
          }}
          onAdmin={(admin) => setInv({ admin })}
          errors={errors}
        />
        <div className="form-grid">
          <label className="check field--full">
            <input type="checkbox" checked={rec.coordsVerified} onChange={(e) => setRec({ ...rec, coordsVerified: e.target.checked })} />
            พิกัดตรวจสอบภาคสนามแล้ว
          </label>
          <Field label="ภูมิศาสตร์" full>
            <textarea rows={2} value={inv.geographyNote ?? ''} onChange={(e) => setInv({ geographyNote: e.target.value || undefined })} />
          </Field>
          <Field label="บริบทเชิงพื้นที่" full>
            <textarea rows={2} value={inv.spatialNote ?? ''} onChange={(e) => setInv({ spatialNote: e.target.value || undefined })} />
          </Field>
        </div>
      </Panel>

      <Panel overline="Karst & Geology" title="ภูมิประเทศคาสต์และธรณีวิทยา">
        <div className="form-grid">
          <Field label="ภูมิประเทศคาสต์">
            <Select value={inv.karst} options={KARST_TYPES} onChange={(karst) => setInv({ karst })} />
          </Field>
          <Field label="ชนิดหิน">
            <Select value={inv.geology.rockType} options={toOptions(ROCK_TYPES)} onChange={(rockType) => setInv({ geology: { ...inv.geology, rockType } })} />
          </Field>
          <Field label="ยุคทางธรณีวิทยา">
            <Select value={inv.geology.era} options={toOptions(GEOLOGIC_ERAS)} onChange={(era) => setInv({ geology: { ...inv.geology, era } })} />
          </Field>
          <Field label="ชื่อหมวดหิน">
            <input value={inv.geology.formation ?? ''} onChange={(e) => setInv({ geology: { ...inv.geology, formation: e.target.value || undefined } })} />
          </Field>
          <Field label="คำอธิบายธรณีวิทยา" full>
            <textarea rows={2} value={inv.geology.note ?? ''} onChange={(e) => setInv({ geology: { ...inv.geology, note: e.target.value || undefined } })} />
          </Field>
        </div>
      </Panel>

      <Panel overline="Morphology & Dimensions" title="สัณฐานและมิติของถ้ำ">
        <fieldset className="chip-group">
          <legend className="field__label">สัณฐานถ้ำ (เลือกได้หลายข้อ)</legend>
          {MORPHOLOGIES.map((m) => {
            const on = inv.morphology.includes(m.value);
            return (
              <label key={m.value} className={`chip-toggle${on ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setInv({ morphology: on ? inv.morphology.filter((x) => x !== m.value) : [...inv.morphology, m.value] })}
                />
                {m.label}
              </label>
            );
          })}
        </fieldset>
        <div className="form-grid form-grid--5">
          <Field label="ความยาว (ม.)">
            <NumberInput value={inv.dimensions.lengthM} onChange={(lengthM) => setInv({ dimensions: { ...inv.dimensions, lengthM } })} />
          </Field>
          <Field label="ความลึก (ม.)">
            <NumberInput value={inv.dimensions.depthM} onChange={(depthM) => setInv({ dimensions: { ...inv.dimensions, depthM } })} />
          </Field>
          <Field label="ความสูง รทก. (ม.)">
            <NumberInput value={inv.dimensions.elevationM} min={-500} onChange={(elevationM) => setInv({ dimensions: { ...inv.dimensions, elevationM } })} />
          </Field>
          <Field label="จำนวนชั้น">
            <NumberInput value={inv.dimensions.levels} step="1" onChange={(levels) => setInv({ dimensions: { ...inv.dimensions, levels } })} />
          </Field>
          <Field label="ความกว้างปากถ้ำ (ม.)">
            <NumberInput value={inv.dimensions.entranceWidthM} onChange={(entranceWidthM) => setInv({ dimensions: { ...inv.dimensions, entranceWidthM } })} />
          </Field>
        </div>
      </Panel>

      <Panel overline="Hydrology" title="ลักษณะทางอุทกวิทยา">
        <div className="form-grid">
          <Field label="ประเภทน้ำ">
            <Select value={inv.hydrology.type} options={HYDRO_TYPES} onChange={(type) => setInv({ hydrology: { ...inv.hydrology, type } })} />
          </Field>
          <Field label="คำอธิบาย" full>
            <textarea rows={2} value={inv.hydrology.note ?? ''} onChange={(e) => setInv({ hydrology: { ...inv.hydrology, note: e.target.value || undefined } })} />
          </Field>
        </div>
      </Panel>

      <Panel overline="Protection & Tourism" title="การคุ้มครองและการท่องเที่ยว">
        <div className="form-grid">
          <Field label="สถานภาพการคุ้มครอง">
            <Select value={inv.protection.status} options={PROTECTION_STATUSES} onChange={(status) => setInv({ protection: { ...inv.protection, status } })} />
          </Field>
          <Field label="หน่วยงานที่ดูแล">
            <input value={inv.protection.agency ?? ''} onChange={(e) => setInv({ protection: { ...inv.protection, agency: e.target.value || undefined } })} />
          </Field>
          <Field label="สถานภาพการท่องเที่ยว">
            <Select value={inv.tourism.status} options={TOURISM_STATUSES} onChange={(status) => setInv({ tourism: { ...inv.tourism, status } })} />
          </Field>
          <Field label="นักท่องเที่ยวต่อปี (คน)">
            <NumberInput value={inv.tourism.visitorsPerYear} step="1" onChange={(visitorsPerYear) => setInv({ tourism: { ...inv.tourism, visitorsPerYear } })} />
          </Field>
        </div>
      </Panel>

      <Panel overline="Threat Assessment" title="การประเมินภัยคุกคาม">
        <ul className="threat-form">
          {THREATS.map((t) => {
            const level = inv.threats[t.value];
            return (
              <li key={t.value} className={level ? 'is-on' : ''}>
                <label className="check">
                  <input type="checkbox" checked={!!level} onChange={(e) => setThreat(t.value, e.target.checked ? 'medium' : undefined)} />
                  {t.label}
                </label>
                <div className="seg seg--small" role="radiogroup" aria-label={`ระดับภัย${t.label}`}>
                  {THREAT_LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      role="radio"
                      aria-checked={level === l.value}
                      className={`seg__btn${level === l.value ? ' is-active' : ''}`}
                      onClick={() => setThreat(t.value, l.value)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel overline="Cave Map & 3D Tour" title="แผนที่ถ้ำและทัวร์ 3D">
        <div className="form-grid">
          <div className="field field--full">
            <span className="field__label">รูปแผนที่ถ้ำ (JPG / PNG / WebP ไม่เกิน 5 MB)</span>
            {inv.mapImage ? (
              <div className="map-upload">
                <img src={mapImageUrl(inv.mapImage)} alt="ตัวอย่างแผนที่ถ้ำ" />
                <div>
                  <div className="num small">{inv.mapImage}</div>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setInv({ mapImage: undefined })}>
                    <LuX size={14} aria-hidden="true" /> เอารูปออก
                  </button>
                </div>
              </div>
            ) : (
              <label className={`upload-drop${uploading ? ' is-busy' : ''}`}>
                <LuUpload size={20} aria-hidden="true" />
                {uploading ? 'กำลังอัปโหลด…' : 'เลือกไฟล์รูปแผนที่'}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            )}
            {uploadError && <span className="field__error">{uploadError}</span>}
          </div>
          <Field label="ลิงก์ทัวร์ 3D (เช่น Matterport)" full>
            <input type="url" value={inv.tourUrl ?? ''} placeholder="https://my.matterport.com/show/?m=…" onChange={(e) => setInv({ tourUrl: e.target.value.trim() || undefined })} />
          </Field>
        </div>
      </Panel>

      <Panel overline="Source & Notes" title="แหล่งข้อมูลและหมายเหตุ">
        <div className="form-grid">
          <Field label="แหล่งข้อมูล" full>
            <input value={inv.source ?? ''} placeholder="เช่น สำรวจภาคสนาม 2026, กรมทรัพยากรธรณี" onChange={(e) => setInv({ source: e.target.value || undefined })} />
          </Field>
          <Field label="หมายเหตุ" full>
            <textarea rows={3} value={inv.note ?? ''} onChange={(e) => setInv({ note: e.target.value || undefined })} />
          </Field>
        </div>
      </Panel>

      <div className="form-actions">
        {Object.keys(errors).length > 0 && <span className="field__error">กรอกข้อมูลไม่ครบ {Object.keys(errors).length} ช่อง</span>}
        <button type="button" className="btn btn--pill" onClick={() => navigate(-1)}>
          ยกเลิก
        </button>
        <button type="submit" className="btn btn--pill btn--primary" disabled={uploading}>
          {isNew ? 'เพิ่มถ้ำ' : 'บันทึก'}
        </button>
      </div>
    </form>
  );
}
