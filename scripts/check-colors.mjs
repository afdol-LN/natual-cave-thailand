// เกณฑ์ตรวจรับข้อ 2: ห้ามมี hex สีนอก tokens.css และต้องเป็น 3 สีของพาเลตต์เท่านั้น
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ALLOWED = new Set(['#ffffff', '#b3d8a8', '#3d8d7a']);
const TOKENS = join('src', 'styles', 'tokens.css');
const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css|html)$/.test(f)) files.push(p);
  }
};
walk('src');
files.push('index.html');

let bad = 0;
const re = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(re)) {
    const tok = m[0].toLowerCase();
    const line = src.slice(0, m.index).split('\n').length;
    const inTokens = relative('.', f) === TOKENS;
    if (inTokens && ALLOWED.has(tok)) continue;
    console.error(`${f}:${line}  ${m[0]}${inTokens ? ' (ไม่อยู่ในพาเลตต์)' : ' (ห้าม hard-code สีนอก tokens.css)'}`);
    bad++;
  }
}
if (bad) {
  console.error(`\nพบสีที่ไม่อนุญาต ${bad} จุด`);
  process.exit(1);
}
console.log(`OK: ตรวจ ${files.length} ไฟล์ ไม่มีสีนอกพาเลตต์`);
