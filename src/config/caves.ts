import type { CaveId, SensorCave } from '../domain/types';

/**
 * ถ้ำตั้งต้นที่มีเซนเซอร์ (ข้อมูลทะเบียนเป็น mock)
 * พิกัด [lat, lon] — Mapbox ใช้ [lon, lat]
 * ค่ามาจากแหล่งเดียวต่อถ้ำ (showcaves.com / Wikipedia) ยังไม่ได้ตรวจภาคสนาม → coordsVerified: false
 * ผู้ใช้แก้ไขได้ผ่านหน้าทะเบียน (เก็บใน localStorage) ไฟล์นี้คือค่าเดิมสำหรับ "คืนค่าเดิม"
 */
export const SENSOR_CAVES: SensorCave[] = [
  {
    id: 'CNX-001',
    name: 'ถ้ำเชียงดาว',
    nameEn: 'Tham Chiang Dao',
    province: 'เชียงใหม่',
    region: 'ภาคเหนือ',
    lat: 19.3949,
    lon: 98.9283,
    coordsVerified: false,
    coordsSource: 'Wikipedia (Chiang Dao Cave)',
    hasSensors: true,
    origin: 'seed',
    edited: false,
    inventory: {
      caveType: 'limestone',
      admin: { region: 'north', provinceCode: 'TH50', districtCode: 'TH5004' },
      karst: 'tower',
      geology: { rockType: 'หินปูน', era: 'เพอร์เมียน', formation: 'หมวดหินดอยหลวง (mock)', note: 'ระบบโถงหลายชั้น หินงอกหินย้อยยังเติบโต' },
      morphology: ['horizontal', 'multilevel', 'stream'],
      dimensions: { lengthM: 12000, depthM: 60, elevationM: 520, levels: 3, entranceWidthM: 8 },
      hydrology: { type: 'perennial', note: 'ลำธารใต้ดินเชื่อมต้นน้ำแม่ปิง ระดับน้ำขึ้นตามฤดูฝน' },
      protection: { status: 'wildlife_sanctuary', agency: 'เขตรักษาพันธุ์สัตว์ป่าดอยเชียงดาว กรมอุทยานแห่งชาติฯ' },
      tourism: { status: 'open', visitorsPerYear: 180000 },
      threats: { tourism: 'high', climate: 'medium', pollution: 'low' },
      geographyNote: 'เชิงดอยหลวงเชียงดาว ภูมิอากาศมรสุมเขตร้อนที่สูง',
      spatialNote: 'อยู่ติดชุมชนและวัด มีนักท่องเที่ยวเข้าชมโถงหน้าตลอดปี',
      source: 'ข้อมูลจำลอง (mock) สำหรับ prototype',
    },
    baseline: { temp: 21.5, humidity: 90, co2: 620, o2: 20.8, water: 24 },
    vulnerability: { exposure: 0.55, sensitivity: 0.5, adaptiveCapacity: 0.6 },
    mockIndices: { buffering: 0.78, stability: 0.74, biodiversity: 0.82 },
  },
  {
    id: 'KRI-001',
    name: 'ถ้ำละว้า',
    nameEn: 'Tham Lawa',
    province: 'กาญจนบุรี',
    region: 'ภาคตะวันตก',
    lat: 14.2997,
    lon: 98.9828,
    coordsVerified: false,
    coordsSource: 'showcaves.com (Lawa Cave)',
    hasSensors: true,
    origin: 'seed',
    edited: false,
    inventory: {
      caveType: 'limestone',
      admin: { region: 'west', provinceCode: 'TH71', districtCode: 'TH7102' },
      karst: 'cone',
      geology: { rockType: 'หินปูน', era: 'ออร์โดวิเชียน', formation: 'หมวดหินทุ่งสง (mock)', note: 'โถงใหญ่ 5 โถง' },
      morphology: ['horizontal'],
      dimensions: { lengthM: 500, depthM: 25, elevationM: 180, levels: 1, entranceWidthM: 5 },
      hydrology: { type: 'seasonal', note: 'น้ำซึมจากเพดานและน้ำหลากจากแควน้อยในฤดูฝน' },
      protection: { status: 'national_park', agency: 'อุทยานแห่งชาติไทรโยค' },
      tourism: { status: 'open', visitorsPerYear: 95000 },
      threats: { tourism: 'high', flood: 'medium', climate: 'medium' },
      geographyNote: 'ริมลุ่มน้ำแควน้อย ป่าเบญจพรรณ',
      spatialNote: 'เข้าถึงทางเรือและถนน 323 นักท่องเที่ยวหนาแน่นช่วงวันหยุด',
      source: 'ข้อมูลจำลอง (mock) สำหรับ prototype',
    },
    baseline: { temp: 26, humidity: 87, co2: 760, o2: 20.6, water: 38 },
    vulnerability: { exposure: 0.7, sensitivity: 0.55, adaptiveCapacity: 0.45 },
    mockIndices: { buffering: 0.62, stability: 0.58, biodiversity: 0.66 },
  },
  {
    id: 'TRG-001',
    name: 'ถ้ำเขาช้างหาย',
    nameEn: 'Tham Khao Chang Hai',
    province: 'ตรัง',
    region: 'ภาคใต้',
    lat: 7.59,
    lon: 99.6691,
    coordsVerified: false,
    coordsSource: 'showcaves.com (Khao Chang Hai)',
    hasSensors: true,
    origin: 'seed',
    edited: false,
    inventory: {
      caveType: 'limestone',
      // อำเภอตามพิกัดปัจจุบัน (เมืองตรัง) แหล่งข้อมูลอื่นระบุ อ.นาโยง — พิกัดยังไม่ได้ยืนยัน
      admin: { region: 'south', provinceCode: 'TH92', districtCode: 'TH9201' },
      karst: 'tower',
      geology: { rockType: 'หินปูน', era: 'เพอร์เมียน', formation: 'หมวดหินราชบุรี (mock)', note: 'โถงแคบลึก การระบายอากาศต่ำ' },
      morphology: ['horizontal', 'maze'],
      dimensions: { lengthM: 1000, depthM: 40, elevationM: 90, levels: 2, entranceWidthM: 3 },
      hydrology: { type: 'seasonal', note: 'แอ่งน้ำนิ่งภายในถ้ำ เติมจากน้ำฝนผ่านรอยแตก' },
      protection: { status: 'none', agency: 'องค์การบริหารส่วนตำบลในพื้นที่' },
      tourism: { status: 'limited', visitorsPerYear: 12000 },
      threats: { landuse: 'high', guano: 'medium', tourism: 'medium', climate: 'high' },
      geographyNote: 'เขาหินปูนโดดกลางที่ราบ ภูมิอากาศร้อนชื้นตลอดปี',
      spatialNote: 'ล้อมรอบด้วยสวนยางและชุมชน ทางเข้าเดียว',
      tourUrl: 'https://my.matterport.com/show/?m=P5p4MhLZpYx',
      source: 'ข้อมูลจำลอง (mock) สำหรับ prototype',
    },
    baseline: { temp: 27, humidity: 92, co2: 900, o2: 20.5, water: 30 },
    vulnerability: { exposure: 0.6, sensitivity: 0.75, adaptiveCapacity: 0.35 },
    mockIndices: { buffering: 0.55, stability: 0.49, biodiversity: 0.71 },
  },
];

export const SENSOR_CAVE_IDS: CaveId[] = SENSOR_CAVES.map((c) => c.id);

export function isSensorCaveId(id: string | undefined | null): boolean {
  return !!id && SENSOR_CAVE_IDS.includes(id);
}

/** ข้อมูลเซนเซอร์/ดัชนีของถ้ำตั้งต้น — ใช้เฉพาะในชั้น api/ */
export function getSensorCave(id: CaveId): SensorCave {
  const cave = SENSOR_CAVES.find((c) => c.id === id);
  if (!cave) throw new Error(`Unknown sensor cave ${id}`);
  return cave;
}

/** มุมกล้องเริ่มต้นที่ประเทศไทย */
export const THAILAND_VIEW = { longitude: 100.6, latitude: 13.2, zoom: 4.6, pitch: 0, bearing: 0 };
