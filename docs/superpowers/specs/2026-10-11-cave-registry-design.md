# Design: ทะเบียนถ้ำแห่งชาติ (National Cave Inventory)

วันที่: 2026-10-11 · branch: `feat/redar-chart` · สถานะ: อนุมัติแล้ว (ผู้ใช้ให้ออกแบบตามที่เห็นว่าดีที่สุด)

## เป้าหมาย

เพิ่มความสามารถ "ลงทะเบียนและแก้ไขข้อมูลถ้ำ" ตามหัวข้อฐานข้อมูลทะเบียนถ้ำแห่งชาติ ถ้ำที่เพิ่มใหม่ต้องปรากฏทั้งระบบ (หมุดบนลูกโลก, แถบเลือกถ้ำ, หน้าข้อมูลถ้ำ) โดยไม่มีเซนเซอร์

ขอบเขตรอบนี้: ฐานข้อมูลที่ 1 (ทะเบียนถ้ำ) เท่านั้น ฐานข้อมูลความหลากหลายทางชีวภาพและ TECBP ทำในรอบถัดไป

## การตัดสินใจหลัก

| เรื่อง | ตัดสินใจ |
|---|---|
| ที่เก็บข้อมูล | localStorage (Zustand persist) ยังไม่มี backend |
| ถ้ำใหม่ | ขึ้นทั้งระบบ แต่ไม่มีเซนเซอร์ (`hasSensors: false`) |
| ถ้ำเดิม 3 ถ้ำ | แก้ไขได้ คืนค่าเดิมได้ ลบไม่ได้ |
| ส่งออก | JSON และ CSV |
| ที่ตั้งจากพิกัด | point-in-polygon กับขอบเขตอำเภอจริง ออฟไลน์ |
| ภาค | 6 ภาคตามราชบัณฑิตยสถาน (กำหนดจากจังหวัด) |
| รูปแผนที่ถ้ำ | อัปโหลดผ่าน Vite dev server ลง `public/uploads/cave-maps/` เก็บชื่อไฟล์ใน localStorage |
| ตำแหน่ง UI | หน้าใหม่ "ทะเบียนถ้ำ" (เมนูที่ 4) + แท็บ "ข้อมูลถ้ำ" ใน Dashboard รายถ้ำ แทนแท็บ "ภูมิศาสตร์และธรณีวิทยา" |

## แหล่งข้อมูลขอบเขตการปกครอง

- ไฟล์ `th_adm2.geojson` จาก [piyayut-ch/mapthai](https://github.com/piyayut-ch/mapthai) (MIT) ซึ่งย่อขนาดจาก UN OCHA COD-AB Thailand (ข้อมูลกรมแผนที่ทหาร 2019, CC BY-IGO) 928 อำเภอ ช่อง `ADM2_TH`, `ADM2_PCODE`, `ADM1_TH`, `ADM1_PCODE`
- สคริปต์ `scripts/build-admin.mjs <input.geojson>` สร้าง 2 ไฟล์:
  - `public/geo/th-districts.json` — polygon อำเภอ เหลือเฉพาะ pcode และพิกัดปัด 4 ตำแหน่ง โหลดแบบ lazy ตอนเปิดฟอร์ม
  - `src/config/th-admin.json` — รายชื่อจังหวัด/อำเภอ (ไทย, อังกฤษ, pcode) สำหรับ dropdown
- `src/config/regions.ts` — ตารางจังหวัด (pcode) → ภาค 6 ภาค
- README ต้องระบุ attribution: OCHA / Royal Thai Survey Department, CC BY-IGO

## โมเดลข้อมูล

```ts
type CaveId = string;

type CaveType = 'limestone' | 'sandstone' | 'sea' | 'granite' | 'other' | 'unknown';
type KarstType = 'tower' | 'cone' | 'plateau' | 'coastal' | 'none';
type Morphology = 'horizontal' | 'vertical' | 'multilevel' | 'maze' | 'stream';
type HydroType = 'dry' | 'seasonal' | 'perennial' | 'tidal';
type ProtectionStatus = 'national_park' | 'wildlife_sanctuary' | 'forest_park' | 'heritage' | 'none';
type TourismStatus = 'open' | 'limited' | 'closed' | 'not_open';
type ThreatKey = 'tourism' | 'mining' | 'landuse' | 'flood' | 'guano' | 'pollution' | 'climate';
type ThreatLevel = 'low' | 'medium' | 'high';

interface CaveInventory {
  caveType: CaveType;
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
  mapImage?: string;   // ชื่อไฟล์ใน public/uploads/cave-maps/
  tourUrl?: string;
  source?: string;
  note?: string;
}

/** ระเบียนถ้ำที่ UI ใช้ (รวมถ้ำตั้งต้น + localStorage) */
interface CaveRecord {
  id: CaveId;
  name: string;
  nameEn?: string;
  lat: number;
  lon: number;
  coordsVerified: boolean;
  province: string;   // ชื่อไทย สืบจาก admin
  region: string;     // ชื่อภาคไทย สืบจาก admin
  hasSensors: boolean;
  origin: 'seed' | 'added';
  edited: boolean;    // ถ้ำตั้งต้นที่ถูกแก้
  inventory: CaveInventory;
}
```

ถ้ำตั้งต้นใน `config/caves.ts` = `CaveRecord` + ข้อมูลเซนเซอร์ (`baseline`, `vulnerability`, `mockIndices`) ชั้นข้อมูลเซนเซอร์ (`api/simulator`, `api/analytics`) ยังอ่านจากถ้ำตั้งต้นเท่านั้น ถ้ำตั้งต้นทั้ง 3 ต้องเติม `inventory` mock ให้ครบทุกช่อง

## Store: `src/registry.ts`

Zustand + persist (key `smart-cave-registry`, ใช้ safe storage แบบเดียวกับ `store.ts`)

```ts
interface RegistryState {
  edits: Record<CaveId, Partial<Omit<CaveRecord, 'id' | 'origin' | 'edited' | 'hasSensors'>>>;
  added: CaveRecord[];
  upsert(rec: CaveRecord): void;   // seed → edits, added → แทนที่/เพิ่ม
  remove(id: CaveId): void;        // เฉพาะ added
  resetSeed(id: CaveId): void;     // ลบ edits ของถ้ำตั้งต้น
}
```

ฟังก์ชันบริสุทธิ์ `mergeRegistry(seeds, state): CaveRecord[]` (ทดสอบได้) และ hooks `useCaveList()`, `useCave(id)`, `nextCaveId()` → `CAVE-0004`, `CAVE-0005`, …

UI ทุกจุดที่อ่าน `CAVES` / `getCaveConfig` เพื่อแสดงชื่อ จังหวัด พิกัด เปลี่ยนมาใช้ registry ส่วนที่ต้องการข้อมูลเซนเซอร์กรองด้วย `hasSensors`

## ค้นหาที่ตั้งจากพิกัด: `src/domain/geo.ts`

- `loadDistricts()` — fetch `/geo/th-districts.json` ครั้งเดียว (cache ใน module)
- `locate(lat, lon, districts)` → `{ region, provinceCode, districtCode } | null` ด้วย bbox prefilter + ray casting รองรับ Polygon/MultiPolygon และรู (hole)
- พิกัดนอกประเทศไทย → `null` แสดงข้อความ "พิกัดอยู่นอกประเทศไทย"

## อัปโหลดรูป: plugin ใน `vite.config.ts`

- `POST /api/upload?caveId=<id>` body = ไฟล์รูปดิบ, `Content-Type: image/jpeg|png|webp`
- ปฏิเสธเมื่อไม่ใช่รูปหรือใหญ่เกิน 5 MB (413) ชื่อไฟล์ `<caveId ที่ sanitize>-<timestamp>.<ext>`
- เขียนที่ `public/uploads/cave-maps/` คืน `{ file }` ทำงานทั้ง `vite` (dev) และ `vite preview`
- บน static hosting การอัปโหลดใช้ไม่ได้ ฟอร์มแสดงข้อความแจ้งเมื่อ request ล้มเหลว

## หน้าจอ

### `/registry` — ทะเบียนถ้ำ (เมนูที่ 4)
- ช่องค้นหา (ชื่อ, รหัส, จังหวัด, อำเภอ) + ตัวกรองภาคและประเภทถ้ำ
- ปุ่ม "+ เพิ่มถ้ำ", "ส่งออก JSON", "ส่งออก CSV"
- ตาราง: รหัส · ชื่อ · ประเภท · จังหวัด / อำเภอ · การคุ้มครอง · การท่องเที่ยว · ภัยคุกคามสูงสุด · เซนเซอร์ · ที่มา (ตั้งต้น / แก้ไขแล้ว / เพิ่มใหม่) · การกระทำ (ดูข้อมูล, แก้ไข, ลบ หรือ คืนค่าเดิม)

### `/registry/new`, `/registry/:caveId/edit` — ฟอร์ม
- การ์ดตามกลุ่ม: ข้อมูลหลัก · ที่ตั้ง · ภูมิประเทศคาสต์และธรณีวิทยา · สัณฐานและมิติ · อุทกวิทยา · การคุ้มครองและการท่องเที่ยว · ภัยคุกคาม · แผนที่ถ้ำและทัวร์ 3D · แหล่งข้อมูลและหมายเหตุ
- ช่องบังคับ: ชื่อถ้ำ, ประเภทถ้ำ, ละติจูด, ลองจิจูด, ภาค, จังหวัด, อำเภอ
- พิมพ์พิกัด → รอ 400 ms → `locate()` → เติม dropdown ภาค/จังหวัด/อำเภอ + แสดง "เติมจากพิกัดอัตโนมัติ"
- เลือก dropdown เองแล้วไม่ตรงกับพิกัด → คำเตือน (ไม่บล็อกการบันทึก)
- dropdown ต่อกัน: เปลี่ยนภาคล้างจังหวัดและอำเภอ เปลี่ยนจังหวัดล้างอำเภอ
- ภัยคุกคาม: checkbox ต่อภัย + ปุ่มเลือกระดับ ต่ำ / กลาง / สูง
- รูปแผนที่: เลือกไฟล์ → อัปโหลดทันที → แสดงตัวอย่าง + ปุ่มเอาออก
- แถบปุ่มด้านล่างติดจอ: บันทึก · ยกเลิก บันทึกแล้วไปหน้าข้อมูลถ้ำ (Dashboard แท็บข้อมูลถ้ำ)
- รหัสถ้ำ: ถ้ำใหม่สร้างอัตโนมัติ แก้ไม่ได้

### Dashboard รายถ้ำ แท็บ "ข้อมูลถ้ำ" (`?view=info`)
- แทนแท็บ `geo` เดิม (`?view=geo` เปลี่ยนเส้นทางเป็น `info`)
- การ์ดแสดงทุกกลุ่มของฟอร์ม ช่องว่างแสดง "ยังไม่มีข้อมูล" + ปุ่ม "แก้ไขข้อมูล"
- แสดงรูปแผนที่ถ้ำ และ iframe ทัวร์ 3D ถ้ามี
- หน้า "รวมทุกหมวด" ใช้แท็บนี้แทน geo

### ถ้ำที่ไม่มีเซนเซอร์
- ภาพรวม: หมุดสีเทา (`pin--nosensor`) ป้าย "ไม่มีเซนเซอร์" hovercard แสดงประเภท จังหวัด การคุ้มครองแทนค่าเซนเซอร์ ไม่นับใน KPI เซนเซอร์
- เซนเซอร์ / แท็บสถิติ / แท็บความหลากหลายฯ: กล่องว่าง "ถ้ำนี้ยังไม่มีเซนเซอร์" / "ยังไม่มีข้อมูลชนิดพันธุ์"
- Dashboard ภาพรวมทั้งหมด: radar, กราฟเทียบ, ตารางอันดับ ใช้เฉพาะถ้ำที่มีเซนเซอร์

## ส่งออก
- JSON: `{ exportedAt, caves: CaveRecord[] }` ไฟล์ `cave-registry-YYYYMMDD.json`
- CSV: หัวตารางภาษาไทย 1 แถวต่อถ้ำ ใช้ `downloadCsv()` เดิม (UTF-8 BOM) ภัยคุกคามรวมเป็น `การท่องเที่ยว:สูง; น้ำท่วม:กลาง`

## การทดสอบ
- `geo.test.ts`: ถ้ำตั้งต้น 3 ถ้ำ locate ได้จังหวัดและภาคถูก (เชียงใหม่/เหนือ, กาญจนบุรี/ตะวันตก, ตรัง/ใต้) พิกัดในทะเล → null
- `registry.test.ts`: merge แก้ถ้ำตั้งต้น, เพิ่ม, ลบ, คืนค่าเดิม, `nextCaveId`
- `export.test.ts`: CSV escape และการรวมภัยคุกคาม
- test เดิม 15 ข้อ ต้องผ่าน, `npm run build`, `check:colors`
- ตรวจในเบราว์เซอร์: เพิ่มถ้ำ → เห็นในตาราง แถบเลือกถ้ำ และหมุด, แก้ถ้ำตั้งต้น → คืนค่าเดิม, อัปโหลดรูป

## นอกขอบเขต
- ฐานข้อมูลความหลากหลายทางชีวภาพและ TECBP
- ซิงก์ข้อมูลข้ามเครื่องหรือ backend จริง
- ระดับตำบล
- แถบเลือกถ้ำแบบ dropdown ค้นหา (เมื่อถ้ำมีจำนวนมาก)
