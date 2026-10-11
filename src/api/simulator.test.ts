import { describe, expect, it } from 'vitest';
import { SENSOR_CAVES } from '../config/caves';
import { SENSOR_KEYS } from '../config/sensors';
import { alerts, allLatest, devices, latest, series, valueAt } from './simulator';

const START = Date.UTC(2026, 9, 10, 3, 0, 0);
const NOW = START + 30_000;

describe('simulator: deterministic', () => {
  it('อินพุตเดียวกันได้ค่าเดียวกันเสมอ', () => {
    for (const c of SENSOR_CAVES)
      for (const s of SENSOR_KEYS) {
        const t = START - 5 * 3600_000 + 1234;
        expect(valueAt(c.id, s, t, START)).toBe(valueAt(c.id, s, t, START));
      }
    expect(series('CNX-001', 'temp', '24h', NOW, START)).toEqual(series('CNX-001', 'temp', '24h', NOW, START));
    expect(alerts(NOW, START)).toEqual(alerts(NOW, START));
    expect(devices(NOW, START)).toEqual(devices(NOW, START));
  });

  it('ค่าต่อเนื่อง (ไม่กระโดดผิดธรรมชาติระหว่างนาที)', () => {
    const a = valueAt('CNX-001', 'temp', START - 60_000, START)!;
    const b = valueAt('CNX-001', 'temp', START, START)!;
    expect(Math.abs(a - b)).toBeLessThan(0.5);
  });

  it('ความยาว series ตามช่วงเวลา', () => {
    expect(series('KRI-001', 'co2', '1h', NOW, START).length).toBeGreaterThanOrEqual(61);
    expect(series('KRI-001', 'co2', '24h', NOW, START).length).toBeGreaterThanOrEqual(97);
    expect(series('KRI-001', 'co2', '7d', NOW, START).length).toBeGreaterThanOrEqual(169);
    expect(series('KRI-001', 'co2', '30d', NOW, START).length).toBeGreaterThanOrEqual(121);
  });
});

describe('simulator: เหตุการณ์สคริปต์ตอนเปิดแอป', () => {
  it('ตรัง CO₂ วิกฤต', () => {
    expect(latest('TRG-001', 'co2', NOW, START).status).toBe('critical');
  });
  it('กาญจนบุรี ระดับน้ำ เฝ้าระวัง', () => {
    expect(latest('KRI-001', 'water', NOW, START).status).toBe('watch');
  });
  it('เชียงดาว ความชื้น เฝ้าระวัง', () => {
    expect(latest('CNX-001', 'humidity', NOW, START).status).toBe('watch');
  });
  it('มีอุปกรณ์ออฟไลน์ 1 ตัว ที่เหลือปกติ', () => {
    const all = allLatest(NOW, START);
    expect(all.filter((l) => l.status === 'offline').map((l) => `${l.caveId}:${l.sensor}`)).toEqual(['KRI-001:o2']);
    const scripted = new Set(['TRG-001:co2', 'KRI-001:water', 'CNX-001:humidity', 'KRI-001:o2']);
    for (const l of all) if (!scripted.has(`${l.caveId}:${l.sensor}`)) expect(l.status).toBe('normal');
  });
  it('alert ที่ยังเกิดอยู่ตรงกับเหตุการณ์สคริปต์', () => {
    const open = alerts(NOW, START).filter((a) => a.end == null);
    const keys = open.map((a) => `${a.caveId}:${a.sensor}:${a.level}`).sort();
    expect(keys).toEqual(['CNX-001:humidity:watch', 'KRI-001:o2:offline', 'KRI-001:water:watch', 'TRG-001:co2:critical']);
  });
  it('ค่าคงที่ตลอดหลายเวลาเริ่มต้น (สคริปต์ไม่ขึ้นกับวันที่)', () => {
    for (let d = 0; d < 20; d++) {
      const s = START + d * 86_400_000 * 1.37;
      expect(latest('TRG-001', 'co2', s + 1000, s).status).toBe('critical');
      expect(latest('KRI-001', 'water', s + 1000, s).status).toBe('watch');
      expect(latest('CNX-001', 'humidity', s + 1000, s).status).toBe('watch');
    }
  });
});
