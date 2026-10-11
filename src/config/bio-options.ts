/** ตัวเลือกในฟอร์มชนิดพันธุ์/การพบ พร้อมป้ายภาษาไทย */
import type { Abundance, CountMethod, EcoClass, EndemismLevel, FunctionalGroup, Habitat, IucnStatus } from '../domain/types';
import type { Option } from './inventory-options';

export const IUCN: Option<IucnStatus>[] = [
  { value: 'NE', label: 'NE · ยังไม่ได้ประเมิน' },
  { value: 'DD', label: 'DD · ข้อมูลไม่เพียงพอ' },
  { value: 'LC', label: 'LC · กังวลน้อยที่สุด' },
  { value: 'NT', label: 'NT · ใกล้ถูกคุกคาม' },
  { value: 'VU', label: 'VU · มีแนวโน้มสูญพันธุ์' },
  { value: 'EN', label: 'EN · ใกล้สูญพันธุ์' },
  { value: 'CR', label: 'CR · ใกล้สูญพันธุ์อย่างยิ่ง' },
  { value: 'EW', label: 'EW · สูญพันธุ์ในธรรมชาติ' },
  { value: 'EX', label: 'EX · สูญพันธุ์' },
];

/** สถานะที่นับว่า "ถูกคุกคาม" */
export const THREATENED: IucnStatus[] = ['VU', 'EN', 'CR'];

export const ECO_CLASSES: Option<EcoClass>[] = [
  { value: 'troglobite', label: 'สัตว์ถ้ำแท้บนบก (Troglobite)' },
  { value: 'stygobite', label: 'สัตว์ถ้ำแท้ในน้ำ (Stygobite)' },
  { value: 'troglophile', label: 'สัตว์ชอบถ้ำ (Troglophile)' },
  { value: 'trogloxene', label: 'สัตว์อาศัยถ้ำชั่วคราว (Trogloxene)' },
  { value: 'accidental', label: 'หลงเข้าถ้ำ (Accidental)' },
];

/** สัตว์ถ้ำแท้ (อาศัยในถ้ำตลอดชีวิต) */
export const TRUE_CAVE: EcoClass[] = ['troglobite', 'stygobite'];

export const ENDEMISM: Option<EndemismLevel>[] = [
  { value: 'single_cave', label: 'เฉพาะถ้ำเดียว' },
  { value: 'cave_system', label: 'เฉพาะระบบถ้ำ/เทือกเขาเดียว' },
  { value: 'province', label: 'เฉพาะถิ่นระดับจังหวัด' },
  { value: 'thailand', label: 'เฉพาะถิ่นประเทศไทย' },
  { value: 'none', label: 'ไม่ใช่ชนิดพันธุ์เฉพาะถิ่น' },
];

export const FUNCTIONAL_GROUPS: Option<FunctionalGroup>[] = [
  { value: 'predator', label: 'ผู้ล่า' },
  { value: 'decomposer', label: 'ผู้ย่อยสลาย' },
  { value: 'guanophile', label: 'กินมูลค้างคาว' },
  { value: 'filter_feeder', label: 'กรองกิน' },
  { value: 'herbivore', label: 'กินพืช/ผลไม้' },
  { value: 'pollinator', label: 'ผสมเกสร/กระจายเมล็ด' },
];

export const HABITATS: Option<Habitat>[] = [
  { value: 'entrance', label: 'เขตปากถ้ำ' },
  { value: 'twilight', label: 'เขตสลัว' },
  { value: 'dark', label: 'เขตมืด' },
  { value: 'water', label: 'แหล่งน้ำ/ลำธาร' },
  { value: 'guano', label: 'กองมูลค้างคาว' },
  { value: 'wall', label: 'ผนัง/เพดาน' },
];

export const ABUNDANCES: Option<Abundance>[] = [
  { value: 'rare', label: 'พบน้อย' },
  { value: 'common', label: 'พบทั่วไป' },
  { value: 'abundant', label: 'พบมาก' },
];

export const COUNT_METHODS: Option<CountMethod>[] = [
  { value: 'direct', label: 'นับตรง' },
  { value: 'estimate', label: 'ประมาณ' },
  { value: 'trap', label: 'กับดัก' },
  { value: 'photo', label: 'ภาพถ่าย' },
];

export const DNA_MARKERS = ['COI', '16S', '18S', '28S', 'cytb', 'ITS', '12S', 'rbcL'];
export const DNA_DATABASES = ['BOLD', 'GenBank', 'other'] as const;
