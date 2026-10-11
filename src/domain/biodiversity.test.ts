import { describe, expect, it } from 'vitest';
import { SEED_OCCURRENCES, SEED_SPECIES } from '../config/species';
import { distribution, dnaLink, endemismConflict, isEndemic, latestCount, occurrenceCsvRows, speciesCsvRows } from './biodiversity';
import { mergeSeeded, nextId } from './seeded';
import type { Species } from './types';

describe('mergeSeeded', () => {
  it('แก้ระเบียนตั้งต้น: edited = true คง origin seed', () => {
    const out = mergeSeeded(SEED_SPECIES, { edits: { 'sp-02': { iucn: 'EN' } }, added: [] });
    const sp = out.find((s) => s.id === 'sp-02')!;
    expect(sp.iucn).toBe('EN');
    expect(sp.edited).toBe(true);
    expect(sp.origin).toBe('seed');
    expect(out).toHaveLength(SEED_SPECIES.length);
  });
  it('ระเบียนที่เพิ่มต่อท้าย', () => {
    const added: Species = { ...SEED_SPECIES[0], id: 'SP-0001', origin: 'added', edited: false };
    expect(mergeSeeded(SEED_SPECIES, { edits: {}, added: [added] }).at(-1)!.id).toBe('SP-0001');
  });
});

describe('nextId', () => {
  it('เริ่ม 0001 และต่อจากค่ามากสุดของ prefix เดียวกัน', () => {
    expect(nextId('SP', ['sp-01', 'sp-10'])).toBe('SP-0001');
    expect(nextId('OC', ['OC-0002', 'OC-0009', 'SP-0050'])).toBe('OC-0010');
  });
});

describe('ความเฉพาะถิ่นและการแพร่กระจาย', () => {
  it('isEndemic', () => {
    expect(isEndemic({ endemism: 'single_cave' })).toBe(true);
    expect(isEndemic({ endemism: 'none' })).toBe(false);
  });
  it('แมงมุมถ้ำขายาวพบ 2 ถ้ำ', () => {
    expect(distribution('sp-04', SEED_OCCURRENCES)).toEqual(['KRI-001', 'TRG-001']);
  });
  it('เตือนเมื่อ "ถ้ำเดียว" แต่พบหลายถ้ำ', () => {
    expect(endemismConflict({ endemism: 'single_cave' }, 2)).toBe(true);
    expect(endemismConflict({ endemism: 'single_cave' }, 1)).toBe(false);
    expect(endemismConflict({ endemism: 'none' }, 3)).toBe(false);
  });
  it('ข้อมูลตั้งต้นไม่ขัดแย้ง', () => {
    for (const sp of SEED_SPECIES) expect(endemismConflict(sp, distribution(sp.id, SEED_OCCURRENCES).length)).toBe(false);
  });
  it('latestCount ใช้วันที่ล่าสุด', () => {
    const o = { ...SEED_OCCURRENCES[0], population: [{ date: '2025-01-01', count: 5, method: 'direct' as const }, { date: '2023-01-01', count: 9, method: 'direct' as const }] };
    expect(latestCount(o)).toBe(5);
    expect(latestCount({ ...o, population: [] })).toBeUndefined();
  });
});

describe('DNA และส่งออก', () => {
  it('dnaLink: MOCK ไม่มีลิงก์, GenBank/BOLD มีลิงก์', () => {
    expect(dnaLink({ marker: 'COI', database: 'GenBank', accession: 'MOCK-GB-1' })).toBeNull();
    expect(dnaLink({ marker: 'COI', database: 'GenBank', accession: 'MN123456' })).toContain('ncbi.nlm.nih.gov/nuccore/MN123456');
    expect(dnaLink({ marker: 'COI', database: 'BOLD', accession: 'ABC123-20' })).toContain('boldsystems');
    expect(dnaLink({ marker: 'COI', database: 'other', accession: 'X1' })).toBeNull();
  });
  it('CSV ชนิดพันธุ์และการพบ: หัวตาราง + 1 แถวต่อระเบียน', () => {
    const sp = speciesCsvRows(SEED_SPECIES, SEED_OCCURRENCES);
    expect(sp).toHaveLength(SEED_SPECIES.length + 1);
    expect(sp[0][0]).toBe('รหัส');
    const oc = occurrenceCsvRows(SEED_OCCURRENCES, (id) => id, (id) => id);
    expect(oc).toHaveLength(SEED_OCCURRENCES.length + 1);
    expect(String(oc[2][9])).toContain('2022-03-15=');
  });
});
