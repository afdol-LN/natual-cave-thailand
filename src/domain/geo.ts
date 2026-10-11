/** หาภาค / จังหวัด / อำเภอ จากพิกัด ด้วยขอบเขตอำเภอจริง (point-in-polygon) */
import { regionOf, type RegionKey } from '../config/regions';

/** [pcode อำเภอ, pcode จังหวัด, bbox [w,s,e,n], polygons → rings → [lon, lat]] */
export type DistrictShape = [string, string, [number, number, number, number], number[][][][]];

export interface AdminLocation {
  region: RegionKey;
  provinceCode: string;
  districtCode: string;
}

/** ray casting: จุดอยู่ใน ring หรือไม่ */
function inRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** อยู่ใน ring นอก และไม่อยู่ในรูของ polygon ใดก็ได้ */
function inPolygons(x: number, y: number, polygons: number[][][][]): boolean {
  return polygons.some(([outer, ...holes]) => inRing(x, y, outer) && !holes.some((h) => inRing(x, y, h)));
}

export function locate(lat: number, lon: number, shapes: DistrictShape[]): AdminLocation | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  for (const [districtCode, provinceCode, [w, s, e, n], polygons] of shapes) {
    if (lon < w || lon > e || lat < s || lat > n) continue;
    if (!inPolygons(lon, lat, polygons)) continue;
    const region = regionOf(provinceCode);
    return region ? { region, provinceCode, districtCode } : null;
  }
  return null;
}

let cache: Promise<DistrictShape[]> | null = null;

/** โหลดขอบเขตอำเภอครั้งเดียว (ไฟล์ ~235 KB ใน public/geo) */
export function loadDistricts(): Promise<DistrictShape[]> {
  cache ??= fetch('/geo/th-districts.json')
    .then((r) => {
      if (!r.ok) throw new Error(`โหลดขอบเขตอำเภอไม่สำเร็จ (${r.status})`);
      return r.json() as Promise<{ d: DistrictShape[] }>;
    })
    .then((j) => j.d)
    .catch((err) => {
      cache = null;
      throw err;
    });
  return cache;
}
