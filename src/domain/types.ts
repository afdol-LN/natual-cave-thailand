import type { RegionKey } from '../config/regions';

/** รหัสถ้ำ: ถ้ำตั้งต้น (CNX-001 ฯลฯ) หรือถ้ำที่เพิ่มในทะเบียน (CAVE-0001 ฯลฯ) */
export type CaveId = string;
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

// ───────────── ทะเบียนถ้ำแห่งชาติ (National Cave Inventory) ─────────────

export type CaveType = 'limestone' | 'sandstone' | 'sea' | 'granite' | 'other' | 'unknown';
export type KarstType = 'tower' | 'cone' | 'plateau' | 'coastal' | 'none';
export type Morphology = 'horizontal' | 'vertical' | 'multilevel' | 'maze' | 'stream';
export type HydroType = 'dry' | 'seasonal' | 'perennial' | 'tidal';
export type ProtectionStatus = 'national_park' | 'wildlife_sanctuary' | 'forest_park' | 'heritage' | 'none';
export type TourismStatus = 'open' | 'limited' | 'closed' | 'not_open';
export type ThreatKey = 'tourism' | 'mining' | 'landuse' | 'flood' | 'guano' | 'pollution' | 'climate';
export type ThreatLevel = 'low' | 'medium' | 'high';

export interface CaveInventory {
  caveType: CaveType;
  /** pcode ตาม UN OCHA COD-AB (เช่น TH50, TH5004) */
  admin: { region: RegionKey; provinceCode: string; districtCode: string };
  karst?: KarstType;
  geology: { rockType?: string; era?: string; formation?: string; note?: string };
  morphology: Morphology[];
  dimensions: { lengthM?: number; depthM?: number; elevationM?: number; levels?: number; entranceWidthM?: number };
  hydrology: { type?: HydroType; note?: string };
  protection: { status?: ProtectionStatus; agency?: string };
  tourism: { status?: TourismStatus; visitorsPerYear?: number };
  threats: Partial<Record<ThreatKey, ThreatLevel>>;
  geographyNote?: string;
  spatialNote?: string;
  /** ชื่อไฟล์ใน public/uploads/cave-maps/ */
  mapImage?: string;
  /** ลิงก์ virtual 3D tour (เช่น Matterport) */
  tourUrl?: string;
  source?: string;
  note?: string;
}

/** ระเบียนถ้ำที่ UI ใช้ (ถ้ำตั้งต้น + ข้อมูลใน localStorage) */
export interface CaveRecord {
  id: CaveId;
  name: string;
  nameEn?: string;
  lat: number;
  lon: number;
  coordsVerified: boolean;
  /** ชื่อจังหวัดไทย (สืบจาก inventory.admin) */
  province: string;
  /** ชื่อภาคไทย (สืบจาก inventory.admin) */
  region: string;
  hasSensors: boolean;
  origin: 'seed' | 'added';
  /** ถ้ำตั้งต้นที่ถูกแก้ไขใน localStorage */
  edited: boolean;
  inventory: CaveInventory;
}

/** ถ้ำตั้งต้นที่มีเซนเซอร์: ระเบียน + ข้อมูลสำหรับจำลองเซนเซอร์และดัชนี */
export interface SensorCave extends CaveRecord {
  coordsSource: string;
  baseline: Record<SensorKey, number>;
  vulnerability: Vulnerability;
  /** ดัชนีจำลอง (mock) 0..1 ที่ยังไม่มีข้อมูลจริงให้คำนวณ */
  mockIndices: { buffering: number; stability: number; biodiversity: number };
}

// ───────────── ฐานข้อมูลความหลากหลายทางชีวภาพ (Cave Biodiversity Database) ─────────────

export type IucnStatus = 'NE' | 'DD' | 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX';
export type EcoClass = 'troglobite' | 'stygobite' | 'troglophile' | 'trogloxene' | 'accidental';
export type EndemismLevel = 'single_cave' | 'cave_system' | 'province' | 'thailand' | 'none';
export type FunctionalGroup = 'predator' | 'decomposer' | 'guanophile' | 'filter_feeder' | 'herbivore' | 'pollinator';
export type Habitat = 'entrance' | 'twilight' | 'dark' | 'water' | 'guano' | 'wall';
export type Abundance = 'rare' | 'common' | 'abundant';
export type CountMethod = 'direct' | 'estimate' | 'trap' | 'photo';

export interface DnaRecord {
  /** ยีน/ตำแหน่ง เช่น COI, 16S */
  marker: string;
  database: 'BOLD' | 'GenBank' | 'other';
  accession: string;
  note?: string;
}

/** ระเบียนที่มีค่าตั้งต้นและแก้ไขได้ใน localStorage */
export interface Seeded {
  id: string;
  origin: 'seed' | 'added';
  /** ระเบียนตั้งต้นที่ถูกแก้ไข */
  edited: boolean;
}

export interface Species extends Seeded {
  /** ชื่อไทย */
  name: string;
  sciName: string;
  /** ผู้ตั้งชื่อ, ปี */
  authority?: string;
  /** กลุ่มสัตว์ภาษาไทย เช่น ค้างคาว, ปลา */
  group: string;
  taxonomy: { phylum: string; class: string; order?: string; family?: string; genus?: string };
  iucn: IucnStatus;
  ecoClass: EcoClass;
  endemism: EndemismLevel;
  functionalGroups: FunctionalGroup[];
  /** 0..1 ความไวต่อการเปลี่ยนแปลงของแต่ละตัวแปร */
  sensitivity: Partial<Record<SensorKey, number>>;
  dna: DnaRecord[];
  /** ชื่อไฟล์ใน public/uploads/species/ */
  image?: string;
  note?: string;
}

export interface PopulationRecord {
  /** YYYY-MM-DD */
  date: string;
  count: number;
  method: CountMethod;
}

export interface Voucher {
  /** เลขทะเบียนตัวอย่าง */
  catalog: string;
  institution: string;
  date?: string;
  collector?: string;
}

/** การพบชนิดพันธุ์ในถ้ำหนึ่ง */
export interface SpeciesOccurrence extends Seeded {
  caveId: CaveId;
  speciesId: string;
  abundance: Abundance;
  habitats: Habitat[];
  /** YYYY-MM-DD */
  firstSeen?: string;
  recorder?: string;
  population: PopulationRecord[];
  vouchers: Voucher[];
  note?: string;
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
