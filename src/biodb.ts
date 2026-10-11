/** ฐานข้อมูลความหลากหลายทางชีวภาพ: ชนิดพันธุ์ + การพบ (ตั้งต้น + localStorage) */
import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SEED_OCCURRENCES, SEED_SPECIES } from './config/species';
import { mergeSeeded, type SeededData } from './domain/seeded';
import type { Species, SpeciesOccurrence } from './domain/types';
import { safeStorage } from './store';

const SEED_SPECIES_IDS = new Set(SEED_SPECIES.map((s) => s.id));
const SEED_OCC_IDS = new Set(SEED_OCCURRENCES.map((o) => o.id));

interface BioState {
  species: SeededData<Species>;
  occurrences: SeededData<SpeciesOccurrence>;
  upsertSpecies: (sp: Species) => void;
  /** ลบชนิดพันธุ์ที่เพิ่ม พร้อมการพบทั้งหมดของชนิดนั้น */
  removeSpecies: (id: string) => void;
  resetSpecies: (id: string) => void;
  upsertOccurrence: (o: SpeciesOccurrence) => void;
  /** ลบการพบที่เพิ่ม (การพบตั้งต้นลบไม่ได้) */
  removeOccurrence: (id: string) => void;
  resetOccurrence: (id: string) => void;
  /** ใช้ตอนลบถ้ำ: ลบการพบที่เพิ่มทั้งหมดในถ้ำนั้น */
  removeCaveOccurrences: (caveId: string) => void;
}

function upsert<T extends Species | SpeciesOccurrence>(data: SeededData<T>, rec: T, seedIds: Set<string>): SeededData<T> {
  if (seedIds.has(rec.id)) {
    const { origin: _o, edited: _e, id: _i, ...edit } = rec;
    return { ...data, edits: { ...data.edits, [rec.id]: edit as unknown as Partial<T> } };
  }
  const clean = { ...rec, origin: 'added', edited: false } as T;
  const exists = data.added.some((x) => x.id === rec.id);
  return { ...data, added: exists ? data.added.map((x) => (x.id === rec.id ? clean : x)) : [...data.added, clean] };
}

function dropEdit<T extends Species | SpeciesOccurrence>(data: SeededData<T>, id: string): SeededData<T> {
  const { [id]: _drop, ...rest } = data.edits;
  return { ...data, edits: rest };
}

export const useBio = create<BioState>()(
  persist(
    (set) => ({
      species: { edits: {}, added: [] },
      occurrences: { edits: {}, added: [] },
      upsertSpecies: (sp) => set((s) => ({ species: upsert(s.species, sp, SEED_SPECIES_IDS) })),
      removeSpecies: (id) =>
        set((s) => ({
          species: { ...s.species, added: s.species.added.filter((x) => x.id !== id) },
          occurrences: { ...s.occurrences, added: s.occurrences.added.filter((o) => o.speciesId !== id) },
        })),
      resetSpecies: (id) => set((s) => ({ species: dropEdit(s.species, id) })),
      upsertOccurrence: (o) => set((s) => ({ occurrences: upsert(s.occurrences, o, SEED_OCC_IDS) })),
      removeOccurrence: (id) => set((s) => ({ occurrences: { ...s.occurrences, added: s.occurrences.added.filter((o) => o.id !== id) } })),
      resetOccurrence: (id) => set((s) => ({ occurrences: dropEdit(s.occurrences, id) })),
      removeCaveOccurrences: (caveId) => set((s) => ({ occurrences: { ...s.occurrences, added: s.occurrences.added.filter((o) => o.caveId !== caveId) } })),
    }),
    {
      name: 'smart-cave-biodiversity',
      storage: safeStorage,
      partialize: (s) => ({ species: s.species, occurrences: s.occurrences }),
      version: 1,
    },
  ),
);

/** ข้อมูลรวมแบบไม่ใช้ hook — สำหรับชั้น api/ */
export function getBioSnapshot(): { species: Species[]; occurrences: SpeciesOccurrence[] } {
  const s = useBio.getState();
  return { species: mergeSeeded(SEED_SPECIES, s.species), occurrences: mergeSeeded(SEED_OCCURRENCES, s.occurrences) };
}

export function useSpeciesList(): Species[] {
  const data = useBio((s) => s.species);
  return useMemo(() => mergeSeeded(SEED_SPECIES, data), [data]);
}

export function useOccurrences(): SpeciesOccurrence[] {
  const data = useBio((s) => s.occurrences);
  return useMemo(() => mergeSeeded(SEED_OCCURRENCES, data), [data]);
}

export function useSpeciesById(id: string | undefined): Species | undefined {
  const list = useSpeciesList();
  return useMemo(() => list.find((s) => s.id === id), [list, id]);
}

export interface CaveSpeciesRow {
  occurrence: SpeciesOccurrence;
  species: Species;
}

/** ชนิดพันธุ์ที่พบในถ้ำหนึ่ง (ข้ามการพบที่ชนิดพันธุ์ถูกลบ) */
export function useCaveSpecies(caveId: string): CaveSpeciesRow[] {
  const species = useSpeciesList();
  const occurrences = useOccurrences();
  return useMemo(() => {
    const byId = new Map(species.map((s) => [s.id, s]));
    return occurrences
      .filter((o) => o.caveId === caveId && byId.has(o.speciesId))
      .map((occurrence) => ({ occurrence, species: byId.get(occurrence.speciesId)! }));
  }, [species, occurrences, caveId]);
}
