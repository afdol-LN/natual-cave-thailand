# Design: ฐานข้อมูลความหลากหลายทางชีวภาพของถ้ำ (Cave Biodiversity Database)

วันที่: 2026-10-12 · branch: `feat/redar-chart` · สถานะ: อนุมัติแล้ว

## เป้าหมาย

ทะเบียนชนิดพันธุ์และบันทึกการพบในแต่ละถ้ำ ที่เพิ่ม/แก้ไขได้ ครอบคลุม 12 หัวข้อ: อนุกรมวิธาน, การพบ, เฉพาะถิ่น, สัตว์ถ้ำแท้, กลุ่มหน้าที่, ประชากร, การแพร่กระจาย, แหล่งที่อยู่, ตัวอย่างอ้างอิง, DNA barcode, อณูชีววิทยา, IUCN

นอกขอบเขต: TECBP (ชีววิทยาเชิงทดลอง), ซิงก์ backend

## การตัดสินใจหลัก

| เรื่อง | ตัดสินใจ |
|---|---|
| ระดับข้อมูล | ชนิดพันธุ์ (ค่าเดียวทุกถ้ำ) + การพบ (ต่อถ้ำ) |
| ที่เก็บ | localStorage key `smart-cave-biodiversity` (store แยกจากทะเบียนถ้ำ) |
| ข้อมูลตั้งต้น | ชนิดพันธุ์ 10 + การพบ 12 รายการ แก้ไข/คืนค่าเดิมได้ ลบไม่ได้ |
| ลบแบบลูกโซ่ | ลบชนิดพันธุ์ที่เพิ่ม → ลบการพบของชนิดนั้น · ลบถ้ำที่เพิ่ม → ลบการพบในถ้ำนั้น |
| การแพร่กระจาย | คำนวณจากการพบ ไม่กรอกซ้ำ |
| เมนู | "ทะเบียนถ้ำ" → "ทะเบียน" มีแท็บย่อย ถ้ำ · ชนิดพันธุ์ |
| รูปชนิดพันธุ์ | อัปโหลดผ่าน plugin เดิม เพิ่ม `kind=species` → `public/uploads/species/` |
| DNA mock | accession ขึ้นต้น `MOCK-` ไม่สร้างลิงก์ภายนอก |

## โมเดลข้อมูล

```ts
type IucnStatus = 'NE' | 'DD' | 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX';
type EcoClass = 'troglobite' | 'stygobite' | 'troglophile' | 'trogloxene' | 'accidental';
type EndemismLevel = 'single_cave' | 'cave_system' | 'province' | 'thailand' | 'none';
type FunctionalGroup = 'predator' | 'decomposer' | 'guanophile' | 'filter_feeder' | 'herbivore' | 'pollinator';
type Habitat = 'entrance' | 'twilight' | 'dark' | 'water' | 'guano' | 'wall';
type Abundance = 'rare' | 'common' | 'abundant';
type CountMethod = 'direct' | 'estimate' | 'trap' | 'photo';

interface DnaRecord { marker: string; database: 'BOLD' | 'GenBank' | 'other'; accession: string; note?: string }

interface Species {
  id: string;                 // SP-0001…  (ตั้งต้น sp-01…sp-10)
  name: string;               // ชื่อไทย *
  sciName: string;            // ชื่อวิทยาศาสตร์ *
  authority?: string;         // ผู้ตั้งชื่อ, ปี
  group: string;              // กลุ่มสัตว์ภาษาไทย (ค้างคาว, ปลา…)
  taxonomy: { phylum: string; class: string; order?: string; family?: string; genus?: string };
  iucn: IucnStatus;
  ecoClass: EcoClass;
  endemism: EndemismLevel;
  functionalGroups: FunctionalGroup[];
  sensitivity: Partial<Record<SensorKey, number>>;   // 0..1
  dna: DnaRecord[];
  image?: string;             // ชื่อไฟล์ใน public/uploads/species/
  note?: string;
  origin: 'seed' | 'added';
  edited: boolean;
}

interface PopulationRecord { date: string; count: number; method: CountMethod }
interface Voucher { catalog: string; institution: string; date?: string; collector?: string }

interface SpeciesOccurrence {
  id: string;                 // OC-0001… (ตั้งต้น oc-01…)
  caveId: CaveId;
  speciesId: string;
  abundance: Abundance;
  habitats: Habitat[];
  firstSeen?: string;         // YYYY-MM-DD
  recorder?: string;
  population: PopulationRecord[];
  vouchers: Voucher[];
  note?: string;
  origin: 'seed' | 'added';
  edited: boolean;
}
```

`endemic: boolean` เดิมเลิกใช้ → `isEndemic(sp) = sp.endemism !== 'none'`

## โครงสร้างโค้ด

- `src/config/species.ts` — `SEED_SPECIES`, `SEED_OCCURRENCES` (mock ครบทุกช่อง)
- `src/config/bio-options.ts` — ตัวเลือกพร้อมป้ายไทย
- `src/domain/seeded.ts` — `mergeSeeded(seeds, {edits, added})` generic + `nextId(prefix, ids)`
- `src/domain/biodiversity.ts` — `isEndemic`, `endemismConflict(sp, caveCount)`, `distribution(occs)`, `speciesCsvRows`, `occurrenceCsvRows`, `dnaLink(rec)`
- `src/biodb.ts` — Zustand store + hooks `useSpeciesList`, `useSpecies(id)`, `useOccurrences()`, `useCaveOccurrences(caveId)`, `useSpeciesOccurrences(id)`; `getBioSnapshot()` สำหรับ `api/`; actions `upsertSpecies`, `removeSpecies` (ลูกโซ่), `resetSpecies`, `upsertOccurrence`, `removeOccurrence` (เฉพาะที่เพิ่ม), `resetOccurrence`, `removeCaveOccurrences(caveId)`
- `src/registry.ts` — `remove(caveId)` เรียก `removeCaveOccurrences`
- `api/analytics.speciesRisk(caveId, latest, species, occurrences)` — รับข้อมูลเป็นพารามิเตอร์; `api/index` ส่ง `getBioSnapshot()`; ลบ `getSpecies`/`useSpecies`
- `vite-upload-plugin.ts` — `?kind=cave-maps|species`; `api/upload.ts` → `uploadImage(kind, id, file)`, `imageUrl(kind, file)`

## หน้าจอ

- `RegistryTabs` (ถ้ำ · ชนิดพันธุ์) บน `/registry` และ `/registry/species`
- `/registry/species` — ค้นหา, กรอง ชั้น/IUCN/สัตว์ถ้ำแท้/ถ้ำ, ตาราง, เพิ่ม, ส่งออก JSON และ CSV 2 ไฟล์
- `/registry/species/:id` — โปรไฟล์: หัว (รูป ชื่อ IUCN สัตว์ถ้ำแท้), อนุกรมวิธาน, สถานภาพ+กลุ่มหน้าที่+ความไว, การแพร่กระจาย (ตาราง + ปุ่มบันทึกการพบ), กราฟประชากร, ตัวอย่างอ้างอิง, DNA
- `/registry/species/new`, `/registry/species/:id/edit` — ฟอร์มชนิดพันธุ์
- `/registry/occurrence/new?cave=&species=`, `/registry/occurrence/:id/edit` — ฟอร์มการพบ; คู่ถ้ำ-ชนิดซ้ำไม่ได้; บันทึกแล้ว `navigate(-1)`
- แท็บความหลากหลายฯ ของถ้ำ: KPI (จำนวนชนิด, สัตว์ถ้ำแท้, เฉพาะถิ่น, IUCN ถูกคุกคาม VU/EN/CR), ตาราง + ปุ่มบันทึกการพบ, ความเสี่ยงเฉพาะถ้ำที่มีเซนเซอร์, กล่องว่างถ้าไม่มีชนิดพันธุ์ — ไม่ต้องผ่าน SensorGate แล้ว

## การทดสอบ

- `seeded.test.ts`: merge edits/added, nextId
- `biodiversity.test.ts`: isEndemic, endemismConflict, distribution, CSV rows, dnaLink (MOCK ไม่มีลิงก์)
- `analytics`: speciesRisk ยังคืนค่าเดิมสำหรับข้อมูลตั้งต้น (ทดสอบผ่าน test เดิม)
- ตรวจในเบราว์เซอร์: เพิ่มชนิดพันธุ์ → บันทึกการพบในถ้ำใหม่ → เห็นในแท็บความหลากหลายฯ + โปรไฟล์ + กราฟ; ลบถ้ำ → การพบหายตาม
