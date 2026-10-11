/** การแบ่ง 6 ภาคตามราชบัณฑิตยสถาน (key = รหัสจังหวัด OCHA pcode) */
export type RegionKey = 'north' | 'northeast' | 'central' | 'east' | 'west' | 'south';

export const REGIONS: { key: RegionKey; th: string }[] = [
  { key: 'north', th: 'ภาคเหนือ' },
  { key: 'northeast', th: 'ภาคตะวันออกเฉียงเหนือ' },
  { key: 'central', th: 'ภาคกลาง' },
  { key: 'east', th: 'ภาคตะวันออก' },
  { key: 'west', th: 'ภาคตะวันตก' },
  { key: 'south', th: 'ภาคใต้' },
];

const GROUPS: Record<RegionKey, string[]> = {
  north: ['TH50', 'TH57', 'TH52', 'TH51', 'TH58', 'TH55', 'TH56', 'TH54', 'TH53'],
  northeast: ['TH46', 'TH40', 'TH36', 'TH48', 'TH30', 'TH38', 'TH31', 'TH44', 'TH49', 'TH35', 'TH45', 'TH42', 'TH33', 'TH47', 'TH32', 'TH43', 'TH39', 'TH37', 'TH41', 'TH34'],
  central: ['TH10', 'TH62', 'TH18', 'TH26', 'TH73', 'TH60', 'TH12', 'TH13', 'TH14', 'TH66', 'TH65', 'TH67', 'TH16', 'TH11', 'TH75', 'TH74', 'TH17', 'TH64', 'TH72', 'TH19', 'TH15', 'TH61'],
  east: ['TH22', 'TH24', 'TH20', 'TH23', 'TH25', 'TH21', 'TH27'],
  west: ['TH71', 'TH63', 'TH77', 'TH76', 'TH70'],
  south: ['TH81', 'TH86', 'TH92', 'TH80', 'TH96', 'TH94', 'TH82', 'TH93', 'TH83', 'TH95', 'TH85', 'TH90', 'TH91', 'TH84'],
};

export const PROVINCE_REGION: Record<string, RegionKey> = Object.fromEntries(
  (Object.entries(GROUPS) as [RegionKey, string[]][]).flatMap(([r, codes]) => codes.map((c) => [c, r])),
);

export const regionOf = (provinceCode: string): RegionKey | undefined => PROVINCE_REGION[provinceCode];
export const regionLabel = (key: RegionKey | undefined): string => REGIONS.find((r) => r.key === key)?.th ?? '';
