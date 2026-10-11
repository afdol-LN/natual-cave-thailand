/** ส่วนประกอบฟอร์มที่ใช้ร่วมกัน (ทะเบียนถ้ำ / ชนิดพันธุ์ / การพบ) */
import type { ReactNode } from 'react';
import type { Option } from '../../config/inventory-options';

export function Field({ label, required, error, full, children }: { label: string; required?: boolean; error?: string; full?: boolean; children: ReactNode }) {
  return (
    <label className={`field${full ? ' field--full' : ''}`}>
      <span className="field__label">
        {label} {required && <span className="req">*</span>}
      </span>
      {children}
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}

export function Select<T extends string>({ value, options, onChange, placeholder = '— ไม่ระบุ —' }: { value: T | undefined; options: Option<T>[]; onChange: (v: T | undefined) => void; placeholder?: string }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function NumberInput({ value, onChange, min = 0, step = 'any' }: { value: number | undefined; onChange: (v: number | undefined) => void; min?: number; step?: string }) {
  return <input type="number" inputMode="decimal" min={min} step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />;
}

export const toOptions = (list: string[]): Option<string>[] => list.map((v) => ({ value: v, label: v }));
