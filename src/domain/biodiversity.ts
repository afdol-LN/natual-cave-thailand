/** ตรรกะฐานข้อมูลความหลากหลายทางชีวภาพแบบบริสุทธิ์ (ทดสอบได้) */
import { ABUNDANCES, COUNT_METHODS, ECO_CLASSES, ENDEMISM, FUNCTIONAL_GROUPS, HABITATS, IUCN } from '../config/bio-options';
import { labelOf } from '../config/inventory-options';
import type { DnaRecord, Species, SpeciesOccurrence } from './types';

export const isEndemic = (sp: Pick<Species, 'endemism'>): boolean => sp.endemism !== 'none';

/** ระบุว่า "เฉพาะถ้ำเดียว" แต่พบมากกว่า 1 ถ้ำ */
export const endemismConflict = (sp: Pick<Species, 'endemism'>, caveCount: number): boolean => sp.endemism === 'single_cave' && caveCount > 1;

/** ถ้ำที่พบชนิดพันธุ์นี้ (ไม่ซ้ำ ตามลำดับที่บันทึก) */
export function distribution(speciesId: string, occurrences: SpeciesOccurrence[]): string[] {
  return [...new Set(occurrences.filter((o) => o.speciesId === speciesId).map((o) => o.caveId))];
}

/** ผลนับล่าสุด (ตามวันที่) */
export function latestCount(o: SpeciesOccurrence): number | undefined {
  if (!o.population.length) return undefined;
  return [...o.population].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.count;
}

/** ลิงก์ไปฐานข้อมูลภายนอก — ค่าสมมติ (MOCK-) และฐานข้อมูลอื่นไม่มีลิงก์ */
export function dnaLink(rec: DnaRecord): string | null {
  const acc = rec.accession.trim();
  if (!acc || /^MOCK-/i.test(acc)) return null;
  if (rec.database === 'GenBank') return `https://www.ncbi.nlm.nih.gov/nuccore/${encodeURIComponent(acc)}`;
  if (rec.database === 'BOLD') return `https://v4.boldsystems.org/index.php/Public_RecordView?processid=${encodeURIComponent(acc)}`;
  return null;
}

type Row = (string | number | null)[];

export function speciesCsvRows(species: Species[], occurrences: SpeciesOccurrence[]): Row[] {
  const head = [
    'รหัส', 'ชื่อไทย', 'ชื่อวิทยาศาสตร์', 'ผู้ตั้งชื่อ', 'กลุ่ม', 'ไฟลัม', 'ชั้น', 'อันดับ', 'วงศ์', 'สกุล',
    'IUCN', 'สัตว์ถ้ำ', 'เฉพาะถิ่น', 'กลุ่มหน้าที่', 'จำนวนถ้ำที่พบ', 'ถ้ำที่พบ', 'DNA', 'หมายเหตุ',
  ];
  const rows = species.map((s) => {
    const caves = distribution(s.id, occurrences);
    return [
      s.id, s.name, s.sciName, s.authority ?? '', s.group, s.taxonomy.phylum, s.taxonomy.class, s.taxonomy.order ?? '', s.taxonomy.family ?? '', s.taxonomy.genus ?? '',
      s.iucn, labelOf(ECO_CLASSES, s.ecoClass), labelOf(ENDEMISM, s.endemism), s.functionalGroups.map((g) => labelOf(FUNCTIONAL_GROUPS, g)).join('; '),
      caves.length, caves.join('; '), s.dna.map((d) => `${d.marker}:${d.database}:${d.accession}`).join('; '), s.note ?? '',
    ];
  });
  return [head, ...rows];
}

export function occurrenceCsvRows(occurrences: SpeciesOccurrence[], speciesName: (id: string) => string, caveName: (id: string) => string): Row[] {
  const head = ['รหัสการพบ', 'รหัสถ้ำ', 'ถ้ำ', 'รหัสชนิดพันธุ์', 'ชนิดพันธุ์', 'ความชุกชุม', 'แหล่งที่อยู่', 'พบครั้งแรก', 'ผู้บันทึก', 'ประชากร', 'ตัวอย่างอ้างอิง', 'หมายเหตุ'];
  const rows = occurrences.map((o) => [
    o.id, o.caveId, caveName(o.caveId), o.speciesId, speciesName(o.speciesId), labelOf(ABUNDANCES, o.abundance),
    o.habitats.map((h) => labelOf(HABITATS, h)).join('; '), o.firstSeen ?? '', o.recorder ?? '',
    o.population.map((p) => `${p.date}=${p.count} (${labelOf(COUNT_METHODS, p.method)})`).join('; '),
    o.vouchers.map((v) => `${v.catalog} @ ${v.institution}`).join('; '), o.note ?? '',
  ]);
  return [head, ...rows];
}

export const iucnShort = (s: Species['iucn']) => labelOf(IUCN, s).split(' · ')[1] ?? s;
