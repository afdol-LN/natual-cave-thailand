/** พิกัด + ภาค → จังหวัด → อำเภอ (เติมอัตโนมัติจากพิกัดด้วยขอบเขตอำเภอจริง) */
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuMapPin } from 'react-icons/lu';
import { REGIONS, type RegionKey } from '../../config/regions';
import { districtName, districtsIn, provinceName, provincesIn } from '../../domain/admin';
import { loadDistricts, locate, type AdminLocation, type DistrictShape } from '../../domain/geo';
import type { CaveInventory } from '../../domain/types';

type Admin = CaveInventory['admin'];

const parseCoord = (s: string): number => (s.trim() === '' ? NaN : Number(s.trim()));

export default function LocationFields({
  latText,
  lonText,
  admin,
  onCoords,
  onAdmin,
  errors,
}: {
  latText: string;
  lonText: string;
  admin: Admin;
  onCoords: (lat: string, lon: string) => void;
  onAdmin: (admin: Admin) => void;
  errors: Partial<Record<'lat' | 'lon' | 'region' | 'province' | 'district', string>>;
}) {
  const [shapes, setShapes] = useState<DistrictShape[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [auto, setAuto] = useState(false);
  // เติมอัตโนมัติเฉพาะเมื่อผู้ใช้พิมพ์พิกัด (ไม่ทับค่าที่บันทึกไว้ตอนเปิดฟอร์มแก้ไข)
  const typed = useRef(false);

  useEffect(() => {
    loadDistricts()
      .then(setShapes)
      .catch(() => setLoadError(true));
  }, []);

  const lat = parseCoord(latText);
  const lon = parseCoord(lonText);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
  const located: AdminLocation | null | undefined = useMemo(() => (shapes && hasCoords ? locate(lat, lon, shapes) : undefined), [shapes, hasCoords, lat, lon]);

  useEffect(() => {
    if (!typed.current || !located) return;
    const t = window.setTimeout(() => {
      onAdmin(located);
      setAuto(true);
    }, 400);
    return () => window.clearTimeout(t);
    // onAdmin เปลี่ยนทุก render ของฟอร์ม — ทำงานตามพิกัดที่หาได้เท่านั้น
  }, [located]);

  const setCoords = (la: string, lo: string) => {
    typed.current = true;
    onCoords(la, lo);
  };
  const manual = (next: Admin) => {
    setAuto(false);
    onAdmin(next);
  };

  const outside = shapes && hasCoords && located === null;
  const mismatch = located && admin.districtCode && located.districtCode !== admin.districtCode;

  return (
    <div className="form-grid">
      <label className="field">
        <span className="field__label">
          ละติจูด <span className="req">*</span>
        </span>
        <input inputMode="decimal" value={latText} placeholder="เช่น 19.3949" onChange={(e) => setCoords(e.target.value, lonText)} aria-invalid={!!errors.lat} />
        {errors.lat && <span className="field__error">{errors.lat}</span>}
      </label>
      <label className="field">
        <span className="field__label">
          ลองจิจูด <span className="req">*</span>
        </span>
        <input inputMode="decimal" value={lonText} placeholder="เช่น 98.9283" onChange={(e) => setCoords(latText, e.target.value)} aria-invalid={!!errors.lon} />
        {errors.lon && <span className="field__error">{errors.lon}</span>}
      </label>

      <div className="field field--full geo-status" aria-live="polite">
        <LuMapPin size={14} aria-hidden="true" />
        {loadError ? (
          <span className="field__error">โหลดขอบเขตอำเภอไม่สำเร็จ เลือกภาค/จังหวัด/อำเภอเองได้</span>
        ) : !shapes ? (
          <span className="muted">กำลังโหลดขอบเขตอำเภอ…</span>
        ) : outside ? (
          <span className="field__error">พิกัดนี้อยู่นอกประเทศไทย (หรืออยู่ในทะเล)</span>
        ) : auto && located ? (
          <span className="geo-status__ok">เติมจากพิกัดอัตโนมัติ: {provinceName(located.provinceCode)} · อ.{districtName(located.districtCode)}</span>
        ) : mismatch ? (
          <span className="field__warn">
            พิกัดอยู่ใน {provinceName(located.provinceCode)} · อ.{districtName(located.districtCode)} ไม่ตรงกับที่เลือก
            <button
              type="button"
              className="linklike link"
              onClick={() => {
                setAuto(true);
                onAdmin(located);
              }}
            >
              ใช้ตามพิกัด
            </button>
          </span>
        ) : (
          <span className="muted">พิมพ์พิกัดแล้วระบบจะเติมภาค จังหวัด อำเภอให้</span>
        )}
      </div>

      <label className="field">
        <span className="field__label">
          ภาค <span className="req">*</span>
        </span>
        <select value={admin.region} onChange={(e) => manual({ region: e.target.value as RegionKey, provinceCode: '', districtCode: '' })} aria-invalid={!!errors.region}>
          <option value="">— เลือกภาค —</option>
          {REGIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.th}
            </option>
          ))}
        </select>
        {errors.region && <span className="field__error">{errors.region}</span>}
      </label>
      <label className="field">
        <span className="field__label">
          จังหวัด <span className="req">*</span>
        </span>
        <select
          value={admin.provinceCode}
          disabled={!admin.region}
          onChange={(e) => manual({ ...admin, provinceCode: e.target.value, districtCode: '' })}
          aria-invalid={!!errors.province}
        >
          <option value="">— เลือกจังหวัด —</option>
          {provincesIn(admin.region).map((p) => (
            <option key={p.code} value={p.code}>
              {p.th}
            </option>
          ))}
        </select>
        {errors.province && <span className="field__error">{errors.province}</span>}
      </label>
      <label className="field">
        <span className="field__label">
          อำเภอ <span className="req">*</span>
        </span>
        <select value={admin.districtCode} disabled={!admin.provinceCode} onChange={(e) => manual({ ...admin, districtCode: e.target.value })} aria-invalid={!!errors.district}>
          <option value="">— เลือกอำเภอ —</option>
          {districtsIn(admin.provinceCode).map((d) => (
            <option key={d.code} value={d.code}>
              {d.th}
            </option>
          ))}
        </select>
        {errors.district && <span className="field__error">{errors.district}</span>}
      </label>
    </div>
  );
}
