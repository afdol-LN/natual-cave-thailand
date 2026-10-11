/** ส่วนประกอบแสดงผลชนิดพันธุ์ที่ใช้ร่วมกัน */
import { NavLink } from 'react-router-dom';
import { LuBug, LuLandmark } from 'react-icons/lu';
import { ECO_CLASSES, IUCN, THREATENED, TRUE_CAVE } from '../../config/bio-options';
import { labelOf } from '../../config/inventory-options';
import type { EcoClass, IucnStatus } from '../../domain/types';
import { imageUrl } from '../../api/upload';

/** ป้าย IUCN: ระดับถูกคุกคามเป็นพื้นทึบ, NE/DD เป็นเส้นประ */
export function IucnBadge({ status, long = false }: { status: IucnStatus; long?: boolean }) {
  const tone = THREATENED.includes(status) || status === 'EW' || status === 'EX' ? 'threat' : status === 'NE' || status === 'DD' ? 'unknown' : 'safe';
  return (
    <span className={`iucn iucn--${tone}`} title={labelOf(IUCN, status)}>
      <span className="iucn__code">{status}</span>
      {long && <span>{labelOf(IUCN, status).split(' · ')[1]}</span>}
    </span>
  );
}

export function EcoBadge({ value }: { value: EcoClass }) {
  const label = labelOf(ECO_CLASSES, value);
  const short = label.replace(/ \(.*\)$/, '');
  return <span className={`eco${TRUE_CAVE.includes(value) ? ' eco--true' : ''}`}>{short}</span>;
}

export function SpeciesThumb({ image, size = 40 }: { image?: string; size?: number }) {
  return image ? (
    <img className="sp-thumb" src={imageUrl('species', image)} alt="" width={size} height={size} />
  ) : (
    <span className="sp-thumb sp-thumb--empty" style={{ width: size, height: size }} aria-hidden="true">
      <LuBug size={size * 0.5} />
    </span>
  );
}

/** แท็บย่อยของหน้าทะเบียน */
export function RegistryTabs() {
  return (
    <nav className="seg registry-tabs" aria-label="ประเภทฐานข้อมูล">
      <NavLink to="/registry" end className={({ isActive }) => `seg__btn${isActive ? ' is-active' : ''}`}>
        <LuLandmark size={16} aria-hidden="true" /> ถ้ำ
      </NavLink>
      <NavLink to="/registry/species" end className={({ isActive }) => `seg__btn${isActive ? ' is-active' : ''}`}>
        <LuBug size={16} aria-hidden="true" /> ชนิดพันธุ์
      </NavLink>
    </nav>
  );
}

export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fileStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
