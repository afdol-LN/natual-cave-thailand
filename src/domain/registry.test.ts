import { describe, expect, it } from 'vitest';
import { SENSOR_CAVES } from '../config/caves';
import type { CaveRecord } from './types';
import { csvRows, mergeRegistry, nextCaveId, threatSummary } from './registry';

const seeds: CaveRecord[] = SENSOR_CAVES;
const newCave: CaveRecord = { ...SENSOR_CAVES[0], id: 'CAVE-0001', name: 'ถ้ำทดสอบ', origin: 'added', hasSensors: false, edited: false };

describe('mergeRegistry', () => {
  it('ไม่มีข้อมูลใน localStorage = ถ้ำตั้งต้นตามเดิม', () => {
    const out = mergeRegistry(seeds, { edits: {}, added: [] });
    expect(out.map((c) => c.id)).toEqual(['CNX-001', 'KRI-001', 'TRG-001']);
    expect(out.every((c) => !c.edited)).toBe(true);
  });
  it('แก้ถ้ำตั้งต้น: ค่าใหม่ทับ, edited = true, ยังมีเซนเซอร์', () => {
    const out = mergeRegistry(seeds, { edits: { 'TRG-001': { name: 'ชื่อใหม่' } }, added: [] });
    const c = out.find((x) => x.id === 'TRG-001')!;
    expect(c.name).toBe('ชื่อใหม่');
    expect(c.edited).toBe(true);
    expect(c.hasSensors).toBe(true);
    expect(c.origin).toBe('seed');
  });
  it('ถ้ำที่เพิ่มต่อท้ายถ้ำตั้งต้น', () => {
    const out = mergeRegistry(seeds, { edits: {}, added: [newCave] });
    expect(out.map((c) => c.id)).toEqual(['CNX-001', 'KRI-001', 'TRG-001', 'CAVE-0001']);
  });
  it('edits ของถ้ำที่ไม่มีอยู่ถูกข้าม', () => {
    expect(mergeRegistry(seeds, { edits: { 'XXX-999': { name: 'x' } }, added: [] })).toHaveLength(3);
  });
});

describe('nextCaveId', () => {
  it('เริ่มที่ CAVE-0001', () => expect(nextCaveId(['CNX-001', 'TRG-001'])).toBe('CAVE-0001'));
  it('ต่อจากเลขมากสุด', () => expect(nextCaveId(['CAVE-0001', 'CAVE-0007', 'CAVE-0003'])).toBe('CAVE-0008'));
});

describe('ส่งออก', () => {
  it('threatSummary เรียงตามรายการภัยและใส่ระดับ', () => {
    expect(threatSummary({ flood: 'medium', tourism: 'high' })).toBe('การท่องเที่ยว:สูง; น้ำท่วม:กลาง');
    expect(threatSummary({})).toBe('');
  });
  it('csvRows มีหัวตาราง + 1 แถวต่อถ้ำ', () => {
    const rows = csvRows(seeds);
    expect(rows).toHaveLength(4);
    expect(rows[0][0]).toBe('รหัสถ้ำ');
    expect(rows[1][0]).toBe('CNX-001');
  });
});
