/** รายชื่อจังหวัด/อำเภอ (UN OCHA COD-AB Thailand ผ่าน mapthai) สำหรับ dropdown และป้ายชื่อ */
import { PROVINCE_REGION, type RegionKey } from '../config/regions';
import admin from '../config/th-admin.json';

export interface Province {
  code: string;
  th: string;
  en: string;
}
export interface District extends Province {
  provinceCode: string;
}

export const PROVINCES: Province[] = admin.provinces;
export const DISTRICTS: District[] = admin.districts;

export const provincesIn = (region: RegionKey | '' | undefined): Province[] =>
  region ? PROVINCES.filter((p) => PROVINCE_REGION[p.code] === region) : [];
export const districtsIn = (provinceCode: string | undefined): District[] => (provinceCode ? DISTRICTS.filter((d) => d.provinceCode === provinceCode) : []);
export const provinceName = (code: string | undefined): string => PROVINCES.find((p) => p.code === code)?.th ?? '';
export const districtName = (code: string | undefined): string => DISTRICTS.find((d) => d.code === code)?.th ?? '';
