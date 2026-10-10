export type CaveId = 'CNX-001' | 'KRI-001' | 'TRG-001';
export type SensorKey = 'temp' | 'humidity' | 'co2' | 'o2' | 'water';
export type Status = 'normal' | 'watch' | 'critical' | 'offline';
export type RangeKey = '1h' | '24h' | '7d' | '30d';
export type Scenario = 'low' | 'mid' | 'high';

export interface SensorDef {
  key: SensorKey;
  label: string;
  short: string;
  unit: string;
  decimals: number;
  /** ขอบเขตแสดงผลของแกน/RangeBar */
  domain: [number, number];
  /** ช่วงปกติ */
  normal: [number, number];
  /** นอกช่วงปกติแต่อยู่ในช่วงนี้ = เฝ้าระวัง, นอกช่วงนี้ = วิกฤต */
  watch: [number, number];
}

export interface Vulnerability {
  /** 0..1 */
  exposure: number;
  sensitivity: number;
  adaptiveCapacity: number;
}

export interface Cave {
  id: CaveId;
  name: string;
  nameEn: string;
  province: string;
  region: string;
  lat: number;
  lon: number;
  coordsVerified: boolean;
  coordsSource: string;
  elevationM: number;
  lengthM: number;
  geography: string;
  geology: string;
  hydrology: string;
  spatialContext: string;
  baseline: Record<SensorKey, number>;
  vulnerability: Vulnerability;
}

export interface Species {
  id: string;
  name: string;
  sciName: string;
  group: string;
  endemic: boolean;
  /** 0..1 ความไวต่อการเปลี่ยนแปลงของแต่ละตัวแปร */
  sensitivity: Partial<Record<SensorKey, number>>;
}

export interface SpeciesOccurrence {
  caveId: CaveId;
  speciesId: string;
  abundance: 'rare' | 'common' | 'abundant';
  zone: string;
}

export interface Reading {
  ts: number;
  /** null = ไม่มีข้อมูล (อุปกรณ์ออฟไลน์) */
  value: number | null;
}

export interface Latest {
  caveId: CaveId;
  sensor: SensorKey;
  value: number | null;
  ts: number;
  status: Status;
}

export interface CaveAlert {
  id: string;
  caveId: CaveId;
  sensor: SensorKey;
  level: Exclude<Status, 'normal'>;
  start: number;
  /** null = ยังเกิดอยู่ */
  end: number | null;
  peak: number | null;
  message: string;
}

export interface Device {
  id: string;
  caveId: CaveId;
  sensor: SensorKey;
  model: string;
  firmware: string;
  battery: number;
  signal: number;
  lastSeen: number;
  status: Status;
}
