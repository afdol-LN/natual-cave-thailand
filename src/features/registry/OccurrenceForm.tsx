/** ฟอร์มบันทึกการพบชนิดพันธุ์ในถ้ำ (/registry/occurrence/new?cave=&species=, /registry/occurrence/:id/edit) */
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { ABUNDANCES, COUNT_METHODS, HABITATS } from '../../config/bio-options';
import { nextId } from '../../domain/seeded';
import type { Abundance, CountMethod, PopulationRecord, Species, SpeciesOccurrence, Voucher } from '../../domain/types';
import { useBio, useOccurrences, useSpeciesList } from '../../biodb';
import { useCaveList } from '../../registry';
import { Panel } from '../../shared/ui';
import { Field } from './fields';

type Errors = Partial<Record<'cave' | 'species' | 'duplicate', string>>;
const today = () => new Date().toISOString().slice(0, 10);

/** ป้ายในรายการแนะนำ: ชื่อไทย (ชื่อวิทยาศาสตร์) */
const speciesLabel = (s: Species) => `${s.name} (${s.sciName})`;

export default function OccurrenceForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const occurrences = useOccurrences();
  const existing = id ? occurrences.find((o) => o.id === id) : undefined;
  if (id && !existing)
    return (
      <div className="page">
        <div className="empty-state">
          <h3>ไม่พบบันทึกการพบรหัส {id}</h3>
          <Link to="/registry/species" className="btn btn--pill btn--sm">
            กลับไปฐานข้อมูลชนิดพันธุ์
          </Link>
        </div>
      </div>
    );
  const initial: SpeciesOccurrence = existing ?? {
    id: nextId('OC', occurrences.map((o) => o.id)),
    caveId: params.get('cave') ?? '',
    speciesId: params.get('species') ?? '',
    abundance: 'common',
    habitats: [],
    population: [],
    vouchers: [],
    origin: 'added',
    edited: false,
  };
  return <OccurrenceFormBody key={id ?? 'new'} initial={initial} isNew={!existing} all={occurrences} />;
}

function OccurrenceFormBody({ initial, isNew, all }: { initial: SpeciesOccurrence; isNew: boolean; all: SpeciesOccurrence[] }) {
  const navigate = useNavigate();
  const upsert = useBio((s) => s.upsertOccurrence);
  const caves = useCaveList();
  const species = useSpeciesList();
  const [o, setO] = useState<SpeciesOccurrence>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [spText, setSpText] = useState(() => {
    const s = species.find((x) => x.id === initial.speciesId);
    return s ? speciesLabel(s) : '';
  });

  /** หาชนิดพันธุ์จากข้อความที่พิมพ์: ป้ายในรายการแนะนำ, ชื่อไทย, ชื่อวิทยาศาสตร์ หรือรหัส (ไม่สนตัวพิมพ์เล็ก/ใหญ่) */
  const resolveSpecies = (text: string) => {
    const t = text.trim().toLowerCase();
    if (!t) return undefined;
    return species.find((s) => [speciesLabel(s), s.name, s.sciName, s.id].some((v) => v.toLowerCase() === t));
  };

  // คู่ถ้ำ-ชนิดพันธุ์ที่มีบันทึกอยู่แล้ว (ยกเว้นตัวเอง)
  const taken = useMemo(() => new Set(all.filter((x) => x.id !== o.id).map((x) => `${x.caveId}|${x.speciesId}`)), [all, o.id]);
  const duplicate = o.caveId && o.speciesId && taken.has(`${o.caveId}|${o.speciesId}`);

  const setPop = (i: number, patch: Partial<PopulationRecord>) => setO({ ...o, population: o.population.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const setVoucher = (i: number, patch: Partial<Voucher>) => setO({ ...o, vouchers: o.vouchers.map((v, j) => (j === i ? { ...v, ...patch } : v)) });

  const save = (ev: FormEvent) => {
    ev.preventDefault();
    const e: Errors = {};
    if (!o.caveId) e.cave = 'กรุณาเลือกถ้ำ';
    if (!o.speciesId) e.species = spText.trim() ? 'ไม่พบชนิดพันธุ์นี้ในฐานข้อมูล เลือกจากรายการแนะนำหรือเพิ่มชนิดพันธุ์ใหม่' : 'กรุณาพิมพ์ชื่อชนิดพันธุ์';
    if (duplicate) e.duplicate = 'มีบันทึกการพบชนิดนี้ในถ้ำนี้แล้ว แก้ไขบันทึกเดิมแทน';
    setErrors(e);
    if (Object.keys(e).length) return;
    upsert({
      ...o,
      recorder: o.recorder?.trim() || undefined,
      population: o.population.filter((p) => p.date && Number.isFinite(p.count)).sort((a, b) => a.date.localeCompare(b.date)),
      vouchers: o.vouchers.filter((v) => v.catalog.trim()).map((v) => ({ ...v, catalog: v.catalog.trim(), institution: v.institution.trim() })),
    });
    navigate(-1);
  };

  const sp = species.find((s) => s.id === o.speciesId);
  const cave = caves.find((c) => c.id === o.caveId);

  return (
    <form className="page cave-form" onSubmit={save} noValidate>
      <div className="page__head">
        <div>
          <div className="overline">Species occurrence · {o.id}</div>
          <h1 className="page__title">{isNew ? 'บันทึกการพบ' : 'แก้ไขบันทึกการพบ'}</h1>
          <p className="muted">{sp && cave ? `${sp.name} ใน${cave.name}` : 'เลือกถ้ำและชนิดพันธุ์ที่พบ'}</p>
        </div>
      </div>

      <Panel overline="Occurrence" title="ข้อมูลการพบ">
        <div className="form-grid">
          <Field label="ถ้ำ" required error={errors.cave}>
            <select value={o.caveId} disabled={!isNew} onChange={(e) => setO({ ...o, caveId: e.target.value })} aria-invalid={!!errors.cave}>
              <option value="">— เลือกถ้ำ —</option>
              {caves.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.province})
                </option>
              ))}
            </select>
          </Field>
          <Field label="ชนิดพันธุ์" required error={errors.species}>
            <input
              list="dl-species"
              value={spText}
              disabled={!isNew}
              placeholder="พิมพ์ชื่อไทย ชื่อวิทยาศาสตร์ หรือรหัส"
              autoComplete="off"
              onChange={(e) => {
                setSpText(e.target.value);
                setO({ ...o, speciesId: resolveSpecies(e.target.value)?.id ?? '' });
              }}
              aria-invalid={!!errors.species}
            />
            <datalist id="dl-species">
              {species
                .filter((s) => !(o.caveId && taken.has(`${o.caveId}|${s.id}`)))
                .map((s) => (
                  <option key={s.id} value={speciesLabel(s)} />
                ))}
            </datalist>
            {spText.trim() && !o.speciesId && (
              <span className="field__warn">
                ไม่พบ "{spText.trim()}" ในฐานข้อมูลชนิดพันธุ์
                <Link to={`/registry/species/new?name=${encodeURIComponent(spText.trim())}`} className="link">
                  + เพิ่มเป็นชนิดพันธุ์ใหม่
                </Link>
              </span>
            )}
          </Field>
          {(duplicate || errors.duplicate) && <span className="field__error field--full">มีบันทึกการพบชนิดนี้ในถ้ำนี้แล้ว แก้ไขบันทึกเดิมแทน</span>}
          <Field label="ความชุกชุม" required>
            <select value={o.abundance} onChange={(e) => setO({ ...o, abundance: e.target.value as Abundance })}>
              {ABUNDANCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="วันที่พบครั้งแรก">
            <input type="date" value={o.firstSeen ?? ''} max={today()} onChange={(e) => setO({ ...o, firstSeen: e.target.value || undefined })} />
          </Field>
          <Field label="ผู้บันทึก">
            <input value={o.recorder ?? ''} onChange={(e) => setO({ ...o, recorder: e.target.value })} />
          </Field>
        </div>
        <fieldset className="chip-group chip-group--spaced">
          <legend className="field__label">ความสัมพันธ์กับแหล่งที่อยู่ในถ้ำ (เลือกได้หลายข้อ)</legend>
          {HABITATS.map((h) => {
            const on = o.habitats.includes(h.value);
            return (
              <label key={h.value} className={`chip-toggle${on ? ' is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => setO({ ...o, habitats: on ? o.habitats.filter((x) => x !== h.value) : [...o.habitats, h.value] })} />
                {h.label}
              </label>
            );
          })}
        </fieldset>
      </Panel>

      <Panel
        overline="Population records"
        title="ข้อมูลประชากร"
        actions={
          <button type="button" className="btn btn--pill btn--sm" onClick={() => setO({ ...o, population: [...o.population, { date: today(), count: 0, method: 'direct' }] })}>
            <LuPlus size={14} aria-hidden="true" /> เพิ่มผลนับ
          </button>
        }
      >
        {o.population.length === 0 ? (
          <p className="muted">ยังไม่มีผลนับ กด "เพิ่มผลนับ" เพื่อบันทึกจำนวนแต่ละครั้งที่สำรวจ</p>
        ) : (
          <ul className="row-list">
            {o.population.map((p, i) => (
              <li key={i} className="row-list__item">
                <Field label="วันที่นับ">
                  <input type="date" value={p.date} max={today()} onChange={(e) => setPop(i, { date: e.target.value })} />
                </Field>
                <Field label="จำนวน (ตัว)">
                  <input type="number" min={0} step={1} value={p.count} onChange={(e) => setPop(i, { count: Number(e.target.value) })} />
                </Field>
                <Field label="วิธีนับ">
                  <select value={p.method} onChange={(e) => setPop(i, { method: e.target.value as CountMethod })}>
                    {COUNT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <button type="button" className="btn btn--ghost btn--sm row-list__del" aria-label="ลบผลนับ" onClick={() => setO({ ...o, population: o.population.filter((_, j) => j !== i) })}>
                  <LuTrash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        overline="Voucher specimens"
        title="ตัวอย่างอ้างอิง"
        actions={
          <button type="button" className="btn btn--pill btn--sm" onClick={() => setO({ ...o, vouchers: [...o.vouchers, { catalog: '', institution: '' }] })}>
            <LuPlus size={14} aria-hidden="true" /> เพิ่มตัวอย่าง
          </button>
        }
      >
        {o.vouchers.length === 0 ? (
          <p className="muted">ยังไม่มีตัวอย่างอ้างอิง</p>
        ) : (
          <ul className="row-list">
            {o.vouchers.map((v, i) => (
              <li key={i} className="row-list__item">
                <Field label="เลขฐานข้อมูลตัวอย่าง">
                  <input value={v.catalog} onChange={(e) => setVoucher(i, { catalog: e.target.value })} />
                </Field>
                <Field label="สถาบันที่เก็บ">
                  <input value={v.institution} onChange={(e) => setVoucher(i, { institution: e.target.value })} />
                </Field>
                <Field label="วันที่เก็บ">
                  <input type="date" value={v.date ?? ''} max={today()} onChange={(e) => setVoucher(i, { date: e.target.value || undefined })} />
                </Field>
                <Field label="ผู้เก็บ">
                  <input value={v.collector ?? ''} onChange={(e) => setVoucher(i, { collector: e.target.value || undefined })} />
                </Field>
                <button type="button" className="btn btn--ghost btn--sm row-list__del" aria-label="ลบตัวอย่าง" onClick={() => setO({ ...o, vouchers: o.vouchers.filter((_, j) => j !== i) })}>
                  <LuTrash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel overline="Notes" title="หมายเหตุ">
        <Field label="หมายเหตุ" full>
          <textarea rows={2} value={o.note ?? ''} onChange={(e) => setO({ ...o, note: e.target.value || undefined })} />
        </Field>
      </Panel>

      <div className="form-actions">
        {Object.keys(errors).length > 0 && <span className="field__error">ตรวจสอบข้อมูลอีกครั้ง</span>}
        <button type="button" className="btn btn--pill" onClick={() => navigate(-1)}>
          ยกเลิก
        </button>
        <button type="submit" className="btn btn--pill btn--primary" disabled={!!duplicate}>
          {isNew ? 'บันทึกการพบ' : 'บันทึก'}
        </button>
      </div>
    </form>
  );
}
