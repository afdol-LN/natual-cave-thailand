import type { Species, SpeciesOccurrence } from '../domain/types';

/** ชื่อสมมติทั้งหมด ไม่ใช่ผลสำรวจจริง */
export const SPECIES: Species[] = [
  { id: 'sp-01', name: 'ค้างคาวปีกถุงถ้ำดอย', sciName: 'Taphozous montanus (mock)', group: 'ค้างคาว', endemic: false, sensitivity: { temp: 0.6, humidity: 0.4, co2: 0.3 } },
  { id: 'sp-02', name: 'ปลาถ้ำตาบอดเชียงดาว', sciName: 'Schistura caeca (mock)', group: 'ปลา', endemic: true, sensitivity: { water: 0.8, o2: 0.7, temp: 0.5 } },
  { id: 'sp-03', name: 'กิ้งกือถ้ำสีจาง', sciName: 'Desmoxytes pallida (mock)', group: 'สัตว์ขาข้อ', endemic: true, sensitivity: { humidity: 0.9, temp: 0.5 } },
  { id: 'sp-04', name: 'แมงมุมถ้ำขายาว', sciName: 'Speleoraptor longipes (mock)', group: 'แมงมุม', endemic: false, sensitivity: { humidity: 0.6, co2: 0.3 } },
  { id: 'sp-05', name: 'ค้างคาวมงกุฎแควน้อย', sciName: 'Rhinolophus kwaiensis (mock)', group: 'ค้างคาว', endemic: true, sensitivity: { temp: 0.7, co2: 0.5, humidity: 0.4 } },
  { id: 'sp-06', name: 'ปูถ้ำไทรโยค', sciName: 'Potamon saiyokense (mock)', group: 'ครัสเตเชียน', endemic: true, sensitivity: { water: 0.9, o2: 0.5 } },
  { id: 'sp-07', name: 'จิ้งหรีดถ้ำหนวดยาว', sciName: 'Diestrammena longa (mock)', group: 'แมลง', endemic: false, sensitivity: { humidity: 0.5, temp: 0.4 } },
  { id: 'sp-08', name: 'ตุ๊กกายถ้ำนาโยง', sciName: 'Cyrtodactylus nayongensis (mock)', group: 'สัตว์เลื้อยคลาน', endemic: true, sensitivity: { temp: 0.8, humidity: 0.6 } },
  { id: 'sp-09', name: 'หอยทากถ้ำเปลือกใส', sciName: 'Opisthostoma vitrea (mock)', group: 'หอย', endemic: true, sensitivity: { co2: 0.9, humidity: 0.7 } },
  { id: 'sp-10', name: 'ค้างคาวหน้ายักษ์ใต้', sciName: 'Hipposideros austral (mock)', group: 'ค้างคาว', endemic: false, sensitivity: { co2: 0.6, temp: 0.5 } },
];

export const OCCURRENCES: SpeciesOccurrence[] = [
  { caveId: 'CNX-001', speciesId: 'sp-01', abundance: 'abundant', zone: 'โถงหน้า' },
  { caveId: 'CNX-001', speciesId: 'sp-02', abundance: 'rare', zone: 'ลำธารใต้ดิน' },
  { caveId: 'CNX-001', speciesId: 'sp-03', abundance: 'common', zone: 'โถงมืด' },
  { caveId: 'CNX-001', speciesId: 'sp-07', abundance: 'common', zone: 'โถงกลาง' },
  { caveId: 'KRI-001', speciesId: 'sp-04', abundance: 'common', zone: 'โถงกลาง' },
  { caveId: 'KRI-001', speciesId: 'sp-05', abundance: 'abundant', zone: 'โถงในสุด' },
  { caveId: 'KRI-001', speciesId: 'sp-06', abundance: 'rare', zone: 'แอ่งน้ำ' },
  { caveId: 'KRI-001', speciesId: 'sp-07', abundance: 'common', zone: 'โถงหน้า' },
  { caveId: 'TRG-001', speciesId: 'sp-08', abundance: 'rare', zone: 'ผนังโถงหน้า' },
  { caveId: 'TRG-001', speciesId: 'sp-09', abundance: 'common', zone: 'โถงมืด' },
  { caveId: 'TRG-001', speciesId: 'sp-10', abundance: 'abundant', zone: 'โถงลึก' },
  { caveId: 'TRG-001', speciesId: 'sp-04', abundance: 'common', zone: 'โถงกลาง' },
];
