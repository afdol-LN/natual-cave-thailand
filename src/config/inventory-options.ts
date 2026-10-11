/** ตัวเลือกในฟอร์มทะเบียนถ้ำ พร้อมป้ายภาษาไทย (แก้/เพิ่มตัวเลือกที่ไฟล์นี้) */
import type { CaveType, HydroType, KarstType, Morphology, ProtectionStatus, ThreatKey, ThreatLevel, TourismStatus } from '../domain/types';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const CAVE_TYPES: Option<CaveType>[] = [
  { value: 'limestone', label: 'ถ้ำหินปูน (Limestone cave)' },
  { value: 'sandstone', label: 'ถ้ำหินทราย (Sandstone cave)' },
  { value: 'sea', label: 'ถ้ำทะเล (Sea cave)' },
  { value: 'granite', label: 'ถ้ำหินแกรนิต/หินถล่ม (Granite / talus cave)' },
  { value: 'other', label: 'อื่น ๆ (Other)' },
  { value: 'unknown', label: 'ไม่ทราบประเภท (Unknown cave)' },
];

export const KARST_TYPES: Option<KarstType>[] = [
  { value: 'tower', label: 'เขาหินปูนโดด (Tower karst)' },
  { value: 'cone', label: 'เขารูปกรวย (Cone karst)' },
  { value: 'plateau', label: 'ที่ราบสูงคาสต์ (Karst plateau)' },
  { value: 'coastal', label: 'คาสต์ชายฝั่ง (Coastal karst)' },
  { value: 'none', label: 'ไม่ใช่ภูมิประเทศคาสต์' },
];

export const ROCK_TYPES = ['หินปูน', 'หินโดโลไมต์', 'หินอ่อน', 'หินทราย', 'หินแกรนิต', 'หินบะซอลต์', 'อื่น ๆ'];

export const GEOLOGIC_ERAS = ['แคมเบรียน', 'ออร์โดวิเชียน', 'ไซลูเรียน', 'ดีโวเนียน', 'คาร์บอนิเฟอรัส', 'เพอร์เมียน', 'ไทรแอสซิก', 'จูแรสซิก', 'ครีเทเชียส', 'ยุคที่สาม (Tertiary)', 'ยุคควอเทอร์นารี', 'ไม่ทราบ'];

export const MORPHOLOGIES: Option<Morphology>[] = [
  { value: 'horizontal', label: 'แนวราบ' },
  { value: 'vertical', label: 'แนวดิ่ง/หลุมยุบ' },
  { value: 'multilevel', label: 'หลายชั้น' },
  { value: 'maze', label: 'ทางแยกซับซ้อน' },
  { value: 'stream', label: 'มีธารน้ำในถ้ำ' },
];

export const HYDRO_TYPES: Option<HydroType>[] = [
  { value: 'dry', label: 'ถ้ำแห้ง' },
  { value: 'seasonal', label: 'มีน้ำตามฤดู' },
  { value: 'perennial', label: 'ธารน้ำถาวร' },
  { value: 'tidal', label: 'น้ำขึ้นน้ำลง (ทะเล)' },
];

export const PROTECTION_STATUSES: Option<ProtectionStatus>[] = [
  { value: 'national_park', label: 'อุทยานแห่งชาติ' },
  { value: 'wildlife_sanctuary', label: 'เขตรักษาพันธุ์สัตว์ป่า' },
  { value: 'forest_park', label: 'วนอุทยาน' },
  { value: 'heritage', label: 'เขตโบราณสถาน/ศาสนสถาน' },
  { value: 'none', label: 'ไม่มีการคุ้มครอง' },
];

export const TOURISM_STATUSES: Option<TourismStatus>[] = [
  { value: 'open', label: 'เปิดท่องเที่ยวเต็มรูปแบบ' },
  { value: 'limited', label: 'ท่องเที่ยวแบบจำกัด' },
  { value: 'closed', label: 'ปิดชั่วคราว' },
  { value: 'not_open', label: 'ไม่เปิดท่องเที่ยว' },
];

export const THREATS: Option<ThreatKey>[] = [
  { value: 'tourism', label: 'การท่องเที่ยว' },
  { value: 'mining', label: 'เหมือง/ระเบิดหิน' },
  { value: 'landuse', label: 'การใช้ที่ดินรอบถ้ำ' },
  { value: 'flood', label: 'น้ำท่วม' },
  { value: 'guano', label: 'การเก็บมูลค้างคาว' },
  { value: 'pollution', label: 'มลพิษ' },
  { value: 'climate', label: 'การเปลี่ยนแปลงภูมิอากาศ' },
];

export const THREAT_LEVELS: Option<ThreatLevel>[] = [
  { value: 'low', label: 'ต่ำ' },
  { value: 'medium', label: 'กลาง' },
  { value: 'high', label: 'สูง' },
];

export const labelOf = <T extends string>(opts: Option<T>[], v: T | undefined): string => opts.find((o) => o.value === v)?.label ?? '';
