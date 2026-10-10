import type { Cave, CaveId } from '../domain/types';

/**
 * พิกัด [lat, lon] — Mapbox ใช้ [lon, lat]
 * ค่ามาจากแหล่งเดียวต่อถ้ำ (showcaves.com / Wikipedia) ยังไม่ได้ตรวจภาคสนาม → coordsVerified: false
 * แก้พิกัดที่ไฟล์นี้ไฟล์เดียว
 */
export const CAVES: Cave[] = [
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
    elevationM: 520,
    lengthM: 12000,
    geography: 'เชิงดอยหลวงเชียงดาว ในเขตรักษาพันธุ์สัตว์ป่าดอยเชียงดาว ภูมิอากาศมรสุมเขตร้อนที่สูง',
    geology: 'หินปูนยุคเพอร์เมียน ระบบโถงหลายชั้น หินงอกหินย้อยยังเติบโต',
    hydrology: 'ลำธารใต้ดินเชื่อมต้นน้ำแม่ปิง ระดับน้ำขึ้นตามฤดูฝน',
    spatialContext: 'อยู่ติดชุมชนและวัด มีนักท่องเที่ยวเข้าชมโถงหน้าตลอดปี',
    baseline: { temp: 21.5, humidity: 90, co2: 620, o2: 20.8, water: 24 },
    vulnerability: { exposure: 0.55, sensitivity: 0.5, adaptiveCapacity: 0.6 },
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
    elevationM: 180,
    lengthM: 500,
    geography: 'อุทยานแห่งชาติไทรโยค ริมลุ่มน้ำแควน้อย ป่าเบญจพรรณ',
    geology: 'หินปูนยุคออร์โดวิเชียน โถงใหญ่ 5 โถง',
    hydrology: 'น้ำซึมจากเพดานและน้ำหลากจากแควน้อยในฤดูฝน',
    spatialContext: 'เข้าถึงทางเรือและถนน 323 นักท่องเที่ยวหนาแน่นช่วงวันหยุด',
    baseline: { temp: 26, humidity: 87, co2: 760, o2: 20.6, water: 38 },
    vulnerability: { exposure: 0.7, sensitivity: 0.55, adaptiveCapacity: 0.45 },
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
    elevationM: 90,
    lengthM: 1000,
    geography: 'อำเภอนาโยง เขาหินปูนโดดกลางที่ราบ ภูมิอากาศร้อนชื้นตลอดปี',
    geology: 'หินปูนยุคเพอร์เมียน โถงแคบลึก การระบายอากาศต่ำ',
    hydrology: 'แอ่งน้ำนิ่งภายในถ้ำ เติมจากน้ำฝนผ่านรอยแตก',
    spatialContext: 'ล้อมรอบด้วยสวนยางและชุมชน ทางเข้าเดียว',
    baseline: { temp: 27, humidity: 92, co2: 900, o2: 20.5, water: 30 },
    vulnerability: { exposure: 0.6, sensitivity: 0.75, adaptiveCapacity: 0.35 },
  },
];

export const CAVE_IDS = CAVES.map((c) => c.id);

export function getCaveConfig(id: CaveId): Cave {
  const cave = CAVES.find((c) => c.id === id);
  if (!cave) throw new Error(`Unknown cave ${id}`);
  return cave;
}

export function isCaveId(v: string | undefined | null): v is CaveId {
  return !!v && CAVE_IDS.includes(v as CaveId);
}

/** มุมกล้องเริ่มต้นที่ประเทศไทย */
export const THAILAND_VIEW = { longitude: 100.6, latitude: 13.2, zoom: 4.6, pitch: 0, bearing: 0 };
