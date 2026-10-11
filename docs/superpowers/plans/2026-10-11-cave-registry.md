# Cave Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มทะเบียนถ้ำแห่งชาติ: เพิ่ม/แก้ไขถ้ำเก็บใน localStorage, หาที่ตั้งจากพิกัด, อัปโหลดรูปแผนที่, หน้าทะเบียน + ฟอร์ม + แท็บข้อมูลถ้ำ, ถ้ำใหม่ขึ้นทั้งระบบแบบไม่มีเซนเซอร์

**Architecture:** แยก "ถ้ำที่มีเซนเซอร์" (seed ใน `config/caves.ts`, ใช้โดย `api/`) ออกจาก "ระเบียนถ้ำ" (`CaveRecord`) ที่ UI แสดง ระเบียน = seed + edits/added จาก Zustand persist ผ่านฟังก์ชันบริสุทธิ์ `mergeRegistry` ที่ตั้งจากพิกัดใช้ point-in-polygon กับไฟล์อำเภอที่ build ล่วงหน้า

**Tech Stack:** Vite 5, React 18, TypeScript strict, Zustand (persist), TanStack Query, Recharts, react-icons, vitest

**Spec:** `docs/superpowers/specs/2026-10-11-cave-registry-design.md`

## Global Constraints

- สีทั้งหมดผ่านตัวแปรใน `src/styles/tokens.css` ห้าม hex ที่อื่น (`npm run check:colors` ต้องผ่าน)
- ข้อความ UI ภาษาไทย
- ช่องบังคับในฟอร์ม: ชื่อถ้ำ, ประเภทถ้ำ, ละติจูด, ลองจิจูด, ภาค, จังหวัด, อำเภอ
- ถ้ำตั้งต้นลบไม่ได้ ถ้ำเพิ่มใหม่ไม่มีเซนเซอร์
- รูปแผนที่ ≤ 5 MB, jpeg/png/webp, บันทึกที่ `public/uploads/cave-maps/`
- รันคำสั่งผ่าน PowerShell: `$env:Path="D:\nodejs;$env:Path"; Set-Location D:\natural-cave-thailand`
- ไม่ commit จนกว่าผู้ใช้สั่ง (งานบน branch นี้ยังไม่เคย commit)

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `scripts/build-admin.mjs` (ใหม่) | แปลง `th_adm2.geojson` → `public/geo/th-districts.json` + `src/config/th-admin.json` |
| `src/config/regions.ts` (ใหม่) | 6 ภาค + ตาราง pcode จังหวัด → ภาค |
| `src/config/inventory-options.ts` (ใหม่) | ตัวเลือก dropdown ทั้งหมด (ประเภทถ้ำ, คาสต์, ฯลฯ) พร้อมป้ายไทย |
| `src/domain/types.ts` | เพิ่ม `CaveInventory`, `CaveRecord`, `SensorCave`; `CaveId = string` |
| `src/domain/geo.ts` (ใหม่) | `locate()`, `loadDistricts()` |
| `src/domain/registry.ts` (ใหม่) | `mergeRegistry()`, `nextCaveId()`, `toCsvRows()`, `toExportJson()` (บริสุทธิ์) |
| `src/registry.ts` (ใหม่) | Zustand store + hooks `useCaveList`, `useCave`, `useSensorCaves` |
| `src/config/caves.ts` | `SENSOR_CAVES: SensorCave[]` + inventory mock ครบ, `getSensorCave()` |
| `vite.config.ts` | plugin `/api/upload` |
| `src/features/registry/RegistryPage.tsx` (ใหม่) | ตาราง ค้นหา กรอง ส่งออก |
| `src/features/registry/CaveForm.tsx` (ใหม่) | ฟอร์มเพิ่ม/แก้ไข |
| `src/features/registry/LocationFields.tsx` (ใหม่) | พิกัด + dropdown 3 ชั้น + auto-fill |
| `src/features/registry/CaveInfo.tsx` (ใหม่) | แท็บ "ข้อมูลถ้ำ" (แสดงอย่างเดียว) |
| `src/features/registry/labels.ts` (ใหม่) | `adminLabel()`, `threatSummary()` ใช้ร่วมระหว่างตาราง/การ์ด/CSV |

---

### Task 1: ข้อมูลขอบเขตการปกครอง

**Files:** Create `scripts/build-admin.mjs`, `src/config/regions.ts`, generated `public/geo/th-districts.json`, `src/config/th-admin.json`

**Interfaces — Produces:**
- `th-districts.json`: `{ d: [pcode: string, provinceCode: string, bbox: [w,s,e,n], rings: number[][][][]] [] }` (rings = polygons → rings → [lon,lat])
- `th-admin.json`: `{ provinces: {code,th,en}[], districts: {code,provinceCode,th,en}[] }` เรียงตามชื่อไทย
- `regions.ts`: `type RegionKey = 'north'|'northeast'|'central'|'east'|'west'|'south'`, `REGIONS: {key,th}[]`, `PROVINCE_REGION: Record<string, RegionKey>` (77 จังหวัด ตามการแบ่ง 6 ภาคของราชบัณฑิตยสถาน), `regionOf(provinceCode): RegionKey`

- [ ] Step 1: เขียนสคริปต์ อ่าน geojson เหลือ `ADM2_PCODE`, `ADM1_PCODE`, ชื่อไทย/อังกฤษ ปัดพิกัด 4 ตำแหน่ง คำนวณ bbox
- [ ] Step 2: รัน `node scripts/build-admin.mjs <scratch>/th_adm2.geojson` ตรวจ: 77 จังหวัด, 928 อำเภอ, ไฟล์ polygon < 1 MB
- [ ] Step 3: เขียน `regions.ts` ครบ 77 pcode และ test ใน Task 2 ยืนยันว่าทุกจังหวัดใน th-admin.json มีภาค

### Task 2: `locate()` (TDD)

**Files:** Create `src/domain/geo.ts`, Test `src/domain/geo.test.ts`

**Interfaces — Produces:** `type DistrictShape = [string, string, [number,number,number,number], number[][][][]]`, `locate(lat: number, lon: number, shapes: DistrictShape[]): { region: RegionKey; provinceCode: string; districtCode: string } | null`, `loadDistricts(): Promise<DistrictShape[]>` (fetch `/geo/th-districts.json` cache ครั้งเดียว)

- [ ] Step 1: test (อ่านไฟล์ด้วย `fs` ใน test)

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import admin from '../config/th-admin.json';
import { PROVINCE_REGION } from '../config/regions';
import { locate, type DistrictShape } from './geo';

const shapes = (JSON.parse(readFileSync('public/geo/th-districts.json', 'utf8')) as { d: DistrictShape[] }).d;
const prov = (code: string) => admin.provinces.find((p) => p.code === code)!.th;

describe('locate', () => {
  it('ถ้ำเชียงดาว → เชียงใหม่ ภาคเหนือ', () => {
    const r = locate(19.3949, 98.9283, shapes)!;
    expect(prov(r.provinceCode)).toBe('เชียงใหม่');
    expect(r.region).toBe('north');
  });
  it('ถ้ำละว้า → กาญจนบุรี ภาคตะวันตก', () => {
    const r = locate(14.2997, 98.9828, shapes)!;
    expect(prov(r.provinceCode)).toBe('กาญจนบุรี');
    expect(r.region).toBe('west');
  });
  it('ถ้ำเขาช้างหาย → ตรัง ภาคใต้', () => {
    const r = locate(7.59, 99.6691, shapes)!;
    expect(prov(r.provinceCode)).toBe('ตรัง');
    expect(r.region).toBe('south');
  });
  it('กลางอ่าวไทย → null', () => {
    expect(locate(10.5, 101.5, shapes)).toBeNull();
  });
  it('ทุกจังหวัดมีภาค', () => {
    for (const p of admin.provinces) expect(PROVINCE_REGION[p.code]).toBeTruthy();
  });
});
```

- [ ] Step 2: รัน `node node_modules/vitest/vitest.mjs run src/domain/geo.test.ts` → FAIL (ยังไม่มี geo.ts)
- [ ] Step 3: implement bbox prefilter + ray casting (even-odd ต่อ polygon: อยู่ใน ring แรก และไม่อยู่ในรู)
- [ ] Step 4: รันซ้ำ → PASS

### Task 3: โมเดลข้อมูล + seed + registry บริสุทธิ์ (TDD)

**Files:** Modify `src/domain/types.ts`, `src/config/caves.ts`; Create `src/config/inventory-options.ts`, `src/domain/registry.ts`, Test `src/domain/registry.test.ts`

**Interfaces — Produces:**
- types ตาม spec หัวข้อ "โมเดลข้อมูล"; `SensorCave = CaveRecord & { baseline; vulnerability; mockIndices }`; `CaveId = string`
- `SENSOR_CAVES: SensorCave[]`, `getSensorCave(id): SensorCave`, `isSensorCaveId(id)`, `THAILAND_VIEW` (คงเดิม)
- `RegistryData = { edits: Record<string, Partial<CaveRecord>>; added: CaveRecord[] }`
- `mergeRegistry(seeds: CaveRecord[], data: RegistryData): CaveRecord[]` — seed ที่มี edits → `{...seed, ...edit, edited: true}` แล้วต่อด้วย added
- `nextCaveId(existing: string[]): string` → `CAVE-0001` เลขถัดจากค่ามากสุดที่ขึ้นต้น `CAVE-`
- `exportJson(caves): string`, `csvRows(caves, labels): (string|number|null)[][]`

- [ ] Step 1: test

```ts
import { describe, expect, it } from 'vitest';
import { SENSOR_CAVES } from '../config/caves';
import { mergeRegistry, nextCaveId } from './registry';

const seeds = SENSOR_CAVES;
describe('mergeRegistry', () => {
  it('ไม่มีข้อมูล = seed ตามเดิม', () => {
    expect(mergeRegistry(seeds, { edits: {}, added: [] }).map((c) => c.id)).toEqual(seeds.map((c) => c.id));
  });
  it('แก้ seed แล้ว edited = true และคงเซนเซอร์', () => {
    const out = mergeRegistry(seeds, { edits: { 'TRG-001': { name: 'ถ้ำใหม่' } }, added: [] });
    const c = out.find((x) => x.id === 'TRG-001')!;
    expect(c.name).toBe('ถ้ำใหม่');
    expect(c.edited).toBe(true);
    expect(c.hasSensors).toBe(true);
  });
  it('ถ้ำที่เพิ่มต่อท้าย', () => {
    const added = { ...seeds[0], id: 'CAVE-0001', origin: 'added' as const, hasSensors: false, edited: false };
    expect(mergeRegistry(seeds, { edits: {}, added: [added] }).at(-1)!.id).toBe('CAVE-0001');
  });
});
describe('nextCaveId', () => {
  it('เริ่มที่ 0001 และต่อจากค่ามากสุด', () => {
    expect(nextCaveId(['CNX-001'])).toBe('CAVE-0001');
    expect(nextCaveId(['CAVE-0001', 'CAVE-0007'])).toBe('CAVE-0008');
  });
});
```

- [ ] Step 2: FAIL → Step 3: implement types, inventory-options (ตัวเลือกตาม spec พร้อม `label` ไทย), caves.ts (`SENSOR_CAVES` เติม `inventory` mock ครบทุกช่อง, `origin: 'seed'`, `edited: false`, `hasSensors: true`, ย้าย elevationM/lengthM → `inventory.dimensions`, geography/spatialContext → `geographyNote`/`spatialNote`, geology/hydrology text → `geology.note`/`hydrology.note`, tourUrl → `inventory.tourUrl`) → Step 4: PASS

### Task 4: ชั้นเซนเซอร์ใช้ `SENSOR_CAVES`

**Files:** Modify `src/api/simulator.ts`, `src/api/analytics.ts`, `src/api/index.ts`

- [ ] เปลี่ยน `CAVES`/`getCaveConfig` → `SENSOR_CAVES`/`getSensorCave`; `dailyAnomalies` สร้าง `counts` จาก `SENSOR_CAVES`; `getCaves` ลบออก (ไม่มีผู้ใช้) และลบ `useCaves` ใน hooks
- [ ] รัน test เดิม 15 ข้อ → PASS

### Task 5: Store + hooks

**Files:** Create `src/registry.ts`

**Interfaces — Produces:**
```ts
useRegistry: zustand store { edits, added, upsert(rec: CaveRecord), remove(id), resetSeed(id) }
useCaveList(): CaveRecord[]            // memo ตาม edits/added
useCave(id: string | undefined): CaveRecord | undefined
useSensorCaveList(): CaveRecord[]      // กรอง hasSensors
```
- `upsert`: ถ้า id อยู่ใน `SENSOR_CAVES` → เก็บใน `edits[id]` เฉพาะช่องที่แก้ได้ (name, nameEn, lat, lon, province, region, inventory); ไม่งั้นแทนที่/เพิ่มใน `added`
- [ ] tsc ผ่าน

### Task 6: UI ทั้งแอปอ่านจาก registry + จัดการถ้ำไม่มีเซนเซอร์

**Files:** Modify `src/shared/ui.tsx` (`CaveSwitcher` รับ `caves: CaveRecord[]`, `useCaveRoute` ตรวจ id ด้วย list), `App.tsx`, `OverviewPage.tsx`, `GlobeMap.tsx`, `SensorsPage.tsx`, `DashboardPage.tsx`, `AllView.tsx`, `CaveView.tsx`, `IndexRadar.tsx`, `styles.css`

- [ ] `statusByCave` / `healthByCave` เป็น `Record<string, …>`; ถ้ำไม่มีเซนเซอร์ไม่มีค่า → หมุด `pin--nosensor`, badge "ไม่มีเซนเซอร์", hovercard แสดงประเภทถ้ำ จังหวัด การคุ้มครอง
- [ ] KPI หน้าภาพรวม: "ถ้ำในทะเบียน" (ทั้งหมด) + "ถ้ำที่มีเซนเซอร์ออนไลน์"
- [ ] SensorsPage: ถ้ำไม่มีเซนเซอร์ → กล่องว่าง + ลิงก์ไปทะเบียน
- [ ] AllView: กราฟ/radar/ตาราง ใช้ `useSensorCaveList()`
- [ ] CaveView: stats/bio ของถ้ำไม่มีเซนเซอร์ → กล่องว่าง
- [ ] tsc + test ผ่าน

### Task 7: อัปโหลดรูป

**Files:** Modify `vite.config.ts`; Create `src/api/upload.ts` (`uploadCaveMap(caveId, file): Promise<string>`), `public/uploads/cave-maps/.gitkeep`

- [ ] middleware: method POST, path `/api/upload`, ตรวจ content-type ∈ jpeg/png/webp (415), อ่าน body สะสม > 5 MB → 413, sanitize caveId `[^A-Za-z0-9-]` → ``, เขียนไฟล์, ตอบ JSON `{ file }`
- [ ] ทดสอบด้วย `Invoke-WebRequest -Method Post -InFile <png> -ContentType image/png http://localhost:5173/api/upload?caveId=TEST` แล้วลบไฟล์ทดสอบ

### Task 8: ฟอร์ม + ตำแหน่ง

**Files:** Create `LocationFields.tsx`, `CaveForm.tsx`, `labels.ts`; routes ใน `App.tsx`; styles

- [ ] `LocationFields` props `{ value: {lat,lon,region,provinceCode,districtCode}, onChange }`: โหลด `loadDistricts()` ตอน mount, debounce 400 ms หลังพิมพ์พิกัด → `locate` → เติม dropdown + ป้าย "เติมจากพิกัดอัตโนมัติ", พิกัดนอกไทย → ข้อความเตือน, เลือกเองไม่ตรง → คำเตือน, dropdown ต่อกันล้างค่าลูก
- [ ] `CaveForm`: โหลดระเบียนเดิม (edit) หรือสร้างใหม่ด้วย `nextCaveId`, validate ช่องบังคับ, บันทึกด้วย `upsert` แล้ว `navigate('/dashboard/<id>?view=info')`
- [ ] ตรวจในเบราว์เซอร์: พิมพ์พิกัดถ้ำเชียงดาว → เติม เชียงใหม่ / เชียงดาว

### Task 9: หน้าทะเบียน + ส่งออก

**Files:** Create `RegistryPage.tsx`; nav ใน `App.tsx`

- [ ] ค้นหา / กรองภาคและประเภท / ตาราง / ลบ (ยืนยันด้วย `confirm`) / คืนค่าเดิม / ส่งออก JSON (`Blob` + download) และ CSV (`downloadCsv`)
- [ ] เพิ่ม test `csvRows` รวมภัยคุกคาม → `การท่องเที่ยว:สูง; น้ำท่วม:กลาง`

### Task 10: แท็บ "ข้อมูลถ้ำ" แทน geo

**Files:** Create `CaveInfo.tsx`; Modify `CaveView.tsx` (`CaveTab` = `'all'|'stats'|'bio'|'info'`, `?view=geo` → `info`), README (หัวข้อทะเบียนถ้ำ + attribution OCHA)

- [ ] การ์ดทุกกลุ่ม, "ยังไม่มีข้อมูล", รูปแผนที่, iframe ทัวร์, ปุ่ม "แก้ไขข้อมูล" → `/registry/<id>/edit`
- [ ] ตรวจสุดท้าย: `npm run build`, `npm test`, `npm run check:colors`, ตรวจในเบราว์เซอร์ตาม spec หัวข้อการทดสอบ
