import { beforeEach, describe, expect, it } from 'vitest';
import { useBio } from './biodb';
import { SENSOR_CAVES } from './config/caves';
import { SEED_OCCURRENCES } from './config/species';
import type { CaveRecord, SpeciesOccurrence } from './domain/types';
import { useRegistry } from './registry';

const cave: CaveRecord = { ...SENSOR_CAVES[0], id: 'CAVE-0001', name: 'ถ้ำทดสอบ', origin: 'added', hasSensors: false, edited: false };
const occ: SpeciesOccurrence = { ...SEED_OCCURRENCES[0], id: 'OC-0001', caveId: 'CAVE-0001', origin: 'added', edited: false };

describe('ลบแบบลูกโซ่', () => {
  beforeEach(() => {
    useRegistry.setState({ edits: {}, added: [] });
    useBio.setState({ species: { edits: {}, added: [] }, occurrences: { edits: {}, added: [] } });
  });

  it('ลบถ้ำที่เพิ่ม → การพบในถ้ำนั้นถูกลบ ส่วนการพบตั้งต้นยังอยู่', () => {
    useRegistry.getState().upsert(cave);
    useBio.getState().upsertOccurrence(occ);
    expect(useBio.getState().occurrences.added).toHaveLength(1);

    useRegistry.getState().remove('CAVE-0001');
    expect(useRegistry.getState().added).toHaveLength(0);
    expect(useBio.getState().occurrences.added).toHaveLength(0);
  });

  it('แก้การพบตั้งต้นเก็บเป็น edits และคืนค่าเดิมได้', () => {
    useBio.getState().upsertOccurrence({ ...SEED_OCCURRENCES[0], abundance: 'rare' });
    expect(useBio.getState().occurrences.edits['oc-01']?.abundance).toBe('rare');
    useBio.getState().resetOccurrence('oc-01');
    expect(useBio.getState().occurrences.edits['oc-01']).toBeUndefined();
  });
});
