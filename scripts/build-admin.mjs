// สร้างข้อมูลขอบเขตการปกครองจาก th_adm2.geojson
// แหล่ง: github.com/piyayut-ch/mapthai (MIT) ซึ่งย่อขนาดจาก UN OCHA COD-AB Thailand (RTSD 2019, CC BY-IGO)
// ใช้: node scripts/build-admin.mjs <path/to/th_adm2.geojson>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/build-admin.mjs <th_adm2.geojson>');
  process.exit(1);
}

const gj = JSON.parse(readFileSync(input, 'utf8'));
const r4 = (v) => Math.round(v * 1e4) / 1e4;

const provinces = new Map();
const districts = [];
const shapes = [];

for (const f of gj.features) {
  const p = f.properties;
  provinces.set(p.ADM1_PCODE, { code: p.ADM1_PCODE, th: p.ADM1_TH, en: p.ADM1_EN });
  districts.push({ code: p.ADM2_PCODE, provinceCode: p.ADM1_PCODE, th: p.ADM2_TH, en: p.ADM2_EN });

  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  const rings = polys.map((poly) =>
    poly.map((ring) => {
      const out = [];
      for (const [x, y] of ring) {
        const pt = [r4(x), r4(y)];
        const last = out[out.length - 1];
        if (last && last[0] === pt[0] && last[1] === pt[1]) continue;
        out.push(pt);
        w = Math.min(w, pt[0]);
        e = Math.max(e, pt[0]);
        s = Math.min(s, pt[1]);
        n = Math.max(n, pt[1]);
      }
      return out;
    }),
  );
  shapes.push([p.ADM2_PCODE, p.ADM1_PCODE, [w, s, e, n], rings]);
}

const byTh = (a, b) => a.th.localeCompare(b.th, 'th');
const admin = { provinces: [...provinces.values()].sort(byTh), districts: districts.sort(byTh) };

mkdirSync('public/geo', { recursive: true });
writeFileSync('public/geo/th-districts.json', JSON.stringify({ d: shapes }));
writeFileSync('src/config/th-admin.json', JSON.stringify(admin, null, 0));
console.log(`provinces=${admin.provinces.length} districts=${admin.districts.length} shapes=${shapes.length}`);
