import { describe, expect, it } from 'vitest';
import { PROVINCE_REGION } from '../config/regions';
import admin from '../config/th-admin.json';
import districtsJson from '../../public/geo/th-districts.json';
import { locate, type DistrictShape } from './geo';

const shapes = (districtsJson as unknown as { d: DistrictShape[] }).d;
const prov = (code: string) => admin.provinces.find((p) => p.code === code)!.th;
const dist = (code: string) => admin.districts.find((d) => d.code === code)!.th;

describe('locate', () => {
  it('ถ้ำเชียงดาว → เชียงใหม่ อ.เชียงดาว ภาคเหนือ', () => {
    const r = locate(19.3949, 98.9283, shapes)!;
    expect(prov(r.provinceCode)).toBe('เชียงใหม่');
    expect(dist(r.districtCode)).toBe('เชียงดาว');
    expect(r.region).toBe('north');
  });
  it('ถ้ำละว้า → กาญจนบุรี ภาคตะวันตก', () => {
    const r = locate(14.2997, 98.9828, shapes)!;
    expect(prov(r.provinceCode)).toBe('กาญจนบุรี');
    expect(r.region).toBe('west');
  });
  it('ถ้ำเขาช้างหาย → ตรัง ภาคใต้', () => {
    const r = locate(7.59, 99.6691, shapes)!;
    expect(prov(r.provinceCode)).toBe('ตรัง');
    expect(r.region).toBe('south');
  });
  it('กลางอ่าวไทย → null', () => {
    expect(locate(10.5, 101.5, shapes)).toBeNull();
  });
  it('ทุกจังหวัดมีภาค และมี 77 จังหวัด', () => {
    expect(admin.provinces).toHaveLength(77);
    for (const p of admin.provinces) expect(PROVINCE_REGION[p.code]).toBeTruthy();
  });
});
