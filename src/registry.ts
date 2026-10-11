/** ทะเบียนถ้ำ: ถ้ำตั้งต้น + ข้อมูลที่ผู้ใช้เพิ่ม/แก้ (เก็บใน localStorage) */
import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useBio } from './biodb';
import { SENSOR_CAVES, isSensorCaveId } from './config/caves';
import { EDITABLE_KEYS, mergeRegistry, toRecord, type RegistryData } from './domain/registry';
import type { CaveRecord } from './domain/types';
import { safeStorage } from './store';

interface RegistryState extends RegistryData {
  /** เพิ่มหรือแก้ไข: ถ้ำตั้งต้น → เก็บใน edits, ถ้ำเพิ่มใหม่ → แทนที่/ต่อท้ายใน added */
  upsert: (rec: CaveRecord) => void;
  /** ลบถ้ำที่เพิ่มใหม่ (ถ้ำตั้งต้นลบไม่ได้) */
  remove: (id: string) => void;
  /** คืนค่าเดิมของถ้ำตั้งต้น */
  resetSeed: (id: string) => void;
}

export const useRegistry = create<RegistryState>()(
  persist(
    (set) => ({
      edits: {},
      added: [],
      upsert: (rec) =>
        set((s) => {
          if (isSensorCaveId(rec.id)) {
            const edit = Object.fromEntries(EDITABLE_KEYS.map((k) => [k, rec[k]])) as Partial<CaveRecord>;
            return { edits: { ...s.edits, [rec.id]: edit } };
          }
          const clean: CaveRecord = { ...toRecord(rec), origin: 'added', hasSensors: false, edited: false };
          const exists = s.added.some((c) => c.id === rec.id);
          return { added: exists ? s.added.map((c) => (c.id === rec.id ? clean : c)) : [...s.added, clean] };
        }),
      remove: (id) => {
        // ลบการพบชนิดพันธุ์ในถ้ำนี้ไปด้วย
        useBio.getState().removeCaveOccurrences(id);
        set((s) => ({ added: s.added.filter((c) => c.id !== id) }));
      },
      resetSeed: (id) =>
        set((s) => {
          const { [id]: _drop, ...rest } = s.edits;
          return { edits: rest };
        }),
    }),
    { name: 'smart-cave-registry', storage: safeStorage, partialize: (s) => ({ edits: s.edits, added: s.added }), version: 1 },
  ),
);

/** ถ้ำทั้งหมดในทะเบียน (ถ้ำตั้งต้นก่อน แล้วต่อด้วยถ้ำที่เพิ่ม) */
export function useCaveList(): CaveRecord[] {
  const edits = useRegistry((s) => s.edits);
  const added = useRegistry((s) => s.added);
  return useMemo(() => mergeRegistry(SENSOR_CAVES, { edits, added }), [edits, added]);
}

/** เฉพาะถ้ำที่มีเซนเซอร์ (ใช้กับกราฟ/เปรียบเทียบ) */
export function useSensorCaveList(): CaveRecord[] {
  const list = useCaveList();
  return useMemo(() => list.filter((c) => c.hasSensors), [list]);
}

export function useCave(id: string | undefined | null): CaveRecord | undefined {
  const list = useCaveList();
  return useMemo(() => list.find((c) => c.id === id), [list, id]);
}

/** ชื่อถ้ำตามทะเบียน (fallback เป็นรหัส) */
export function useCaveName(): (id: string) => string {
  const list = useCaveList();
  return useMemo(() => {
    const m = new Map(list.map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? id;
  }, [list]);
}
