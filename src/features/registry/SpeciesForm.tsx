/** ฟอร์มเพิ่ม/แก้ไขชนิดพันธุ์ (/registry/species/new, /registry/species/:id/edit) */
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LuPlus, LuTrash2, LuUpload, LuX } from 'react-icons/lu';
import { imageUrl, uploadImage } from '../../api/upload';
import { DNA_DATABASES, DNA_MARKERS, ECO_CLASSES, ENDEMISM, FUNCTIONAL_GROUPS, IUCN } from '../../config/bio-options';
import { SENSOR_KEYS, SENSORS } from '../../config/sensors';
import { nextId } from '../../domain/seeded';
import type { DnaRecord, EcoClass, IucnStatus, Species } from '../../domain/types';
import { useBio, useSpeciesList } from '../../biodb';
import { Loading, Panel } from '../../shared/ui';
import { Field } from './fields';

type Errors = Partial<Record<'name' | 'sciName' | 'phylum' | 'class' | 'iucn' | 'ecoClass', string>>;

function newSpecies(id: string): Species {
  return {
    id,
    name: '',
    sciName: '',
    group: '',
    taxonomy: { phylum: '', class: '' },
    iucn: '' as IucnStatus,
    ecoClass: '' as EcoClass,
    endemism: 'none',
    functionalGroups: [],
    sensitivity: {},
    dna: [],
    origin: 'added',
    edited: false,
  };
}

/** ค่าที่เคยกรอกแล้ว สำหรับ datalist แนะนำ */
const uniq = (vals: (string | undefined)[]) => [...new Set(vals.filter((v): v is string => !!v))].sort();

export default function SpeciesForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const list = useSpeciesList();
  const existing = id ? list.find((s) => s.id === id) : undefined;
  if (id && !existing)
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
  if (!list.length) return <Loading />;
  return <SpeciesFormBody key={id ?? 'new'} initial={existing ?? { ...newSpecies(nextId('SP', list.map((s) => s.id))), name: params.get('name') ?? '' }} isNew={!existing} all={list} />;
}

function SpeciesFormBody({ initial, isNew, all }: { initial: Species; isNew: boolean; all: Species[] }) {
  const navigate = useNavigate();
  const upsert = useBio((s) => s.upsertSpecies);
  const [sp, setSp] = useState<Species>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const suggest = useMemo(
    () => ({
      group: uniq(all.map((s) => s.group)),
      phylum: uniq(all.map((s) => s.taxonomy.phylum)),
      class: uniq(all.map((s) => s.taxonomy.class)),
      order: uniq(all.map((s) => s.taxonomy.order)),
      family: uniq(all.map((s) => s.taxonomy.family)),
      genus: uniq(all.map((s) => s.taxonomy.genus)),
    }),
    [all],
  );

  const setTax = (k: keyof Species['taxonomy'], v: string) => setSp({ ...sp, taxonomy: { ...sp.taxonomy, [k]: v } });
  const setDna = (i: number, patch: Partial<DnaRecord>) => setSp({ ...sp, dna: sp.dna.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  const validate = (): Errors => {
    const e: Errors = {};
    if (!sp.name.trim()) e.name = 'กรุณากรอกชื่อไทย';
    if (!sp.sciName.trim()) e.sciName = 'กรุณากรอกชื่อวิทยาศาสตร์';
    if (!sp.taxonomy.phylum.trim()) e.phylum = 'กรุณากรอกไฟลัม';
    if (!sp.taxonomy.class.trim()) e.class = 'กรุณากรอกชั้น';
    if (!sp.iucn) e.iucn = 'กรุณาเลือกสถานภาพ IUCN';
    if (!sp.ecoClass) e.ecoClass = 'กรุณาเลือกสถานภาพสัตว์ถ้ำ';
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
    const t = sp.taxonomy;
    const clean = (v?: string) => v?.trim() || undefined;
    upsert({
      ...sp,
      name: sp.name.trim(),
      sciName: sp.sciName.trim(),
      authority: clean(sp.authority),
      group: sp.group.trim() || t.class.trim(),
      taxonomy: { phylum: t.phylum.trim(), class: t.class.trim(), order: clean(t.order), family: clean(t.family), genus: clean(t.genus) },
      dna: sp.dna.filter((d) => d.accession.trim()).map((d) => ({ ...d, marker: d.marker.trim(), accession: d.accession.trim() })),
    });
    navigate(`/registry/species/${sp.id}`);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const image = await uploadImage('species', sp.id, file);
      setSp((s) => ({ ...s, image }));
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="page cave-form" onSubmit={save} noValidate>
      <div className="page__head">
        <div>
          <div className="overline">Cave Biodiversity Database · {sp.id}</div>
          <h1 className="page__title">{isNew ? 'เพิ่มชนิดพันธุ์' : `แก้ไข: ${initial.name}`}</h1>
          <p className="muted">ช่องที่มี * ต้องกรอก · บันทึกการพบในแต่ละถ้ำได้จากหน้าโปรไฟล์หลังบันทึก</p>
        </div>
      </div>

      {Object.entries(suggest).map(([k, vals]) => (
        <datalist key={k} id={`dl-${k}`}>
          {vals.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      ))}
      <datalist id="dl-marker">
        {DNA_MARKERS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <Panel overline="Identity" title="ข้อมูลหลัก">
        <div className="form-grid">
          <Field label="รหัส">
            <input value={sp.id} readOnly className="is-readonly" />
          </Field>
          <Field label="กลุ่มสัตว์ (ไทย)">
            <input list="dl-group" value={sp.group} placeholder="เช่น ค้างคาว, ปลา, แมงมุม" onChange={(e) => setSp({ ...sp, group: e.target.value })} />
          </Field>
          <Field label="ชื่อไทย" required error={errors.name}>
            <input value={sp.name} onChange={(e) => setSp({ ...sp, name: e.target.value })} aria-invalid={!!errors.name} />
          </Field>
          <Field label="ชื่อวิทยาศาสตร์" required error={errors.sciName}>
            <input value={sp.sciName} className="italic" placeholder="Genus species" onChange={(e) => setSp({ ...sp, sciName: e.target.value })} aria-invalid={!!errors.sciName} />
          </Field>
          <Field label="ผู้ตั้งชื่อ, ปี">
            <input value={sp.authority ?? ''} placeholder="เช่น Kottelat, 1988" onChange={(e) => setSp({ ...sp, authority: e.target.value })} />
          </Field>
        </div>
      </Panel>

      <Panel overline="Taxonomic hierarchy" title="ลำดับชั้นอนุกรมวิธาน">
        <div className="form-grid form-grid--5">
          <Field label="ไฟลัม" required error={errors.phylum}>
            <input list="dl-phylum" value={sp.taxonomy.phylum} onChange={(e) => setTax('phylum', e.target.value)} aria-invalid={!!errors.phylum} />
          </Field>
          <Field label="ชั้น" required error={errors.class}>
            <input list="dl-class" value={sp.taxonomy.class} onChange={(e) => setTax('class', e.target.value)} aria-invalid={!!errors.class} />
          </Field>
          <Field label="อันดับ">
            <input list="dl-order" value={sp.taxonomy.order ?? ''} onChange={(e) => setTax('order', e.target.value)} />
          </Field>
          <Field label="วงศ์">
            <input list="dl-family" value={sp.taxonomy.family ?? ''} onChange={(e) => setTax('family', e.target.value)} />
          </Field>
          <Field label="สกุล">
            <input list="dl-genus" value={sp.taxonomy.genus ?? ''} onChange={(e) => setTax('genus', e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel overline="Status" title="สถานภาพ">
        <div className="form-grid">
          <Field label="สถานภาพ IUCN" required error={errors.iucn}>
            <select value={sp.iucn} onChange={(e) => setSp({ ...sp, iucn: e.target.value as IucnStatus })} aria-invalid={!!errors.iucn}>
              <option value="">— เลือก —</option>
              {IUCN.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="สถานภาพสัตว์ถ้ำ" required error={errors.ecoClass}>
            <select value={sp.ecoClass} onChange={(e) => setSp({ ...sp, ecoClass: e.target.value as EcoClass })} aria-invalid={!!errors.ecoClass}>
              <option value="">— เลือก —</option>
              {ECO_CLASSES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ความเฉพาะถิ่น">
            <select value={sp.endemism} onChange={(e) => setSp({ ...sp, endemism: e.target.value as Species['endemism'] })}>
              {ENDEMISM.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset className="chip-group chip-group--spaced">
          <legend className="field__label">กลุ่มหน้าที่ทางนิเวศ (เลือกได้หลายข้อ)</legend>
          {FUNCTIONAL_GROUPS.map((g) => {
            const on = sp.functionalGroups.includes(g.value);
            return (
              <label key={g.value} className={`chip-toggle${on ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setSp({ ...sp, functionalGroups: on ? sp.functionalGroups.filter((x) => x !== g.value) : [...sp.functionalGroups, g.value] })}
                />
                {g.label}
              </label>
            );
          })}
        </fieldset>
      </Panel>

      <Panel overline="Environmental sensitivity" title="ความไวต่อสภาพแวดล้อม (0–1)">
        <p className="muted small">ใช้คำนวณความเสี่ยงชนิดพันธุ์จากค่าเซนเซอร์ของถ้ำที่พบ ค่าสูง = ได้รับผลกระทบมากเมื่อค่าผิดปกติ</p>
        <ul className="sens sens--form">
          {SENSOR_KEYS.map((k) => {
            const v = sp.sensitivity[k] ?? 0;
            return (
              <li key={k}>
                <label htmlFor={`sens-${k}`}>{SENSORS[k].label}</label>
                <input
                  id={`sens-${k}`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={v}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    const next = { ...sp.sensitivity };
                    if (n > 0) next[k] = n;
                    else delete next[k];
                    setSp({ ...sp, sensitivity: next });
                  }}
                />
                <span className="num">{v.toFixed(1)}</span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel
        overline="DNA barcode & molecular"
        title="DNA Barcode และข้อมูลอณูชีววิทยา"
        actions={
          <button type="button" className="btn btn--pill btn--sm" onClick={() => setSp({ ...sp, dna: [...sp.dna, { marker: 'COI', database: 'BOLD', accession: '' }] })}>
            <LuPlus size={14} aria-hidden="true" /> เพิ่มแถว
          </button>
        }
      >
        {sp.dna.length === 0 ? (
          <p className="muted">ยังไม่มีข้อมูล DNA กด "เพิ่มแถว" เพื่อบันทึกยีนและเลข accession</p>
        ) : (
          <ul className="row-list">
            {sp.dna.map((d, i) => (
              <li key={i} className="row-list__item">
                <Field label="ยีน/ตำแหน่ง">
                  <input list="dl-marker" value={d.marker} onChange={(e) => setDna(i, { marker: e.target.value })} />
                </Field>
                <Field label="ฐานข้อมูล">
                  <select value={d.database} onChange={(e) => setDna(i, { database: e.target.value as DnaRecord['database'] })}>
                    {DNA_DATABASES.map((db) => (
                      <option key={db} value={db}>
                        {db === 'other' ? 'อื่น ๆ' : db}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="เลข accession / process ID">
                  <input value={d.accession} onChange={(e) => setDna(i, { accession: e.target.value })} />
                </Field>
                <Field label="หมายเหตุ">
                  <input value={d.note ?? ''} onChange={(e) => setDna(i, { note: e.target.value || undefined })} />
                </Field>
                <button type="button" className="btn btn--ghost btn--sm row-list__del" aria-label="ลบแถว DNA" onClick={() => setSp({ ...sp, dna: sp.dna.filter((_, j) => j !== i) })}>
                  <LuTrash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel overline="Image & notes" title="รูปภาพและหมายเหตุ">
        <div className="form-grid">
          <div className="field field--full">
            <span className="field__label">รูปชนิดพันธุ์ (JPG / PNG / WebP ไม่เกิน 5 MB)</span>
            {sp.image ? (
              <div className="map-upload">
                <img src={imageUrl('species', sp.image)} alt="รูปชนิดพันธุ์" />
                <div>
                  <div className="num small">{sp.image}</div>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSp({ ...sp, image: undefined })}>
                    <LuX size={14} aria-hidden="true" /> เอารูปออก
                  </button>
                </div>
              </div>
            ) : (
              <label className={`upload-drop${uploading ? ' is-busy' : ''}`}>
                <LuUpload size={20} aria-hidden="true" />
                {uploading ? 'กำลังอัปโหลด…' : 'เลือกไฟล์รูป'}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            )}
            {uploadError && <span className="field__error">{uploadError}</span>}
          </div>
          <Field label="หมายเหตุ" full>
            <textarea rows={3} value={sp.note ?? ''} onChange={(e) => setSp({ ...sp, note: e.target.value || undefined })} />
          </Field>
        </div>
      </Panel>

      <div className="form-actions">
        {Object.keys(errors).length > 0 && <span className="field__error">กรอกข้อมูลไม่ครบ {Object.keys(errors).length} ช่อง</span>}
        <button type="button" className="btn btn--pill" onClick={() => navigate(-1)}>
          ยกเลิก
        </button>
        <button type="submit" className="btn btn--pill btn--primary" disabled={uploading}>
          {isNew ? 'เพิ่มชนิดพันธุ์' : 'บันทึก'}
        </button>
      </div>
    </form>
  );
}
