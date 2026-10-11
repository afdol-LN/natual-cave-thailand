# Cave Biodiversity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทะเบียนชนิดพันธุ์ + บันทึกการพบต่อถ้ำ เพิ่ม/แก้ไขได้ (localStorage) แสดงในโปรไฟล์ชนิดพันธุ์และแท็บความหลากหลายฯ

**Architecture:** ข้อมูลตั้งต้นใน `config/species.ts` + store `biodb.ts` (edits/added) รวมด้วย `mergeSeeded` แบบ generic ชั้น `api/` รับข้อมูลชนิดพันธุ์ผ่าน `getBioSnapshot()` แทนการ import config ตรง

**Spec:** `docs/superpowers/specs/2026-10-12-cave-biodiversity-design.md`

## Global Constraints

- สีผ่าน tokens เท่านั้น (`check:colors`), ข้อความ UI ไทย, ไม่ commit จนกว่าผู้ใช้สั่ง
- ชนิดพันธุ์/การพบตั้งต้นลบไม่ได้; คู่ (ถ้ำ, ชนิดพันธุ์) ซ้ำไม่ได้
- ช่องบังคับชนิดพันธุ์: ชื่อไทย, ชื่อวิทยาศาสตร์, ไฟลัม, ชั้น, IUCN, สถานภาพสัตว์ถ้ำแท้; การพบ: ถ้ำ, ชนิดพันธุ์, ความชุกชุม

### Task 1: types + options + seed + pure helpers (TDD)
- [ ] types ใน `domain/types.ts` ตาม spec; `config/bio-options.ts`; `config/species.ts` เติม mock ครบ
- [ ] `domain/seeded.ts` (`mergeSeeded`, `nextId`) + `domain/biodiversity.ts` + tests → PASS

### Task 2: store + api
- [ ] `biodb.ts` (persist, actions, hooks, `getBioSnapshot`); registry `remove` ลบการพบลูกโซ่
- [ ] `analytics.speciesRisk` รับ species/occurrences; `api/index` ใช้ snapshot; ลบ `getSpecies`/`useSpecies`
- [ ] tsc + test เดิมผ่าน

### Task 3: upload kind
- [ ] plugin `?kind=` (`cave-maps` | `species`), `api/upload.ts` → `uploadImage`/`imageUrl`; อัปเดต CaveForm/CaveInfo
- [ ] ทดสอบ POST จริงแล้วลบไฟล์

### Task 4: หน้าทะเบียนชนิดพันธุ์ + โปรไฟล์ + ฟอร์ม 2 แบบ + RegistryTabs + routes + nav "ทะเบียน"

### Task 5: แท็บความหลากหลายฯ ใหม่ (ไม่ผ่าน SensorGate) + CSS + README

### Task 6: ตรวจสุดท้าย — build, test, check:colors, ทดสอบในเบราว์เซอร์ตาม spec แล้วล้างข้อมูลทดสอบ
