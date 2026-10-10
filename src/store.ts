import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CaveId, RangeKey } from './domain/types';

interface UiState {
  /** ถ้ำที่เลือกล่าสุด (null = ยังไม่เลือก / มุมมองรวม) — sync กับ URL */
  caveId: CaveId | null;
  setCave: (id: CaveId | null) => void;
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  /** alert ที่รับทราบแล้ว: id → เวลารับทราบ */
  acked: Record<string, number>;
  ack: (alertId: string) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    const s = window.localStorage;
    s.getItem('probe');
    return s;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      caveId: null,
      setCave: (caveId) => set({ caveId }),
      range: '24h',
      setRange: (range) => set({ range }),
      acked: {},
      ack: (id) => set((s) => ({ acked: { ...s.acked, [id]: Date.now() } })),
    }),
    { name: 'smart-cave-ui', storage: safeStorage, partialize: (s) => ({ range: s.range, acked: s.acked }) },
  ),
);
