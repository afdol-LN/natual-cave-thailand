import { describe, expect, it } from 'vitest';
import { SENSORS } from '../config/sensors';
import { OFFLINE_AFTER_MS, statusOf, worstStatus } from './status';

describe('statusOf', () => {
  it('ค่าภายในช่วงปกติ = normal (รวมขอบ)', () => {
    expect(statusOf('temp', 22)).toBe('normal');
    expect(statusOf('temp', SENSORS.temp.normal[0])).toBe('normal');
    expect(statusOf('temp', SENSORS.temp.normal[1])).toBe('normal');
  });

  it('นอกช่วงปกติแต่อยู่ในช่วงเฝ้าระวัง = watch', () => {
    expect(statusOf('temp', 29.5)).toBe('watch');
    expect(statusOf('humidity', 75)).toBe('watch');
    expect(statusOf('water', 95)).toBe('watch');
    expect(statusOf('co2', 1500)).toBe('watch');
  });

  it('นอกช่วงเฝ้าระวัง = critical', () => {
    expect(statusOf('co2', 2600)).toBe('critical');
    expect(statusOf('o2', 18)).toBe('critical');
    expect(statusOf('humidity', 60)).toBe('critical');
    expect(statusOf('water', 140)).toBe('critical');
  });

  it('ไม่มีค่า หรือข้อมูลเก่าเกินกำหนด = offline', () => {
    expect(statusOf('temp', null)).toBe('offline');
    expect(statusOf('temp', undefined)).toBe('offline');
    expect(statusOf('temp', NaN)).toBe('offline');
    const now = 1_000_000_000;
    expect(statusOf('temp', 22, { ts: now - OFFLINE_AFTER_MS - 1, now })).toBe('offline');
    expect(statusOf('temp', 22, { ts: now - 1000, now })).toBe('normal');
  });
});

describe('worstStatus', () => {
  it('เลือกสถานะที่รุนแรงที่สุด', () => {
    expect(worstStatus(['normal', 'watch', 'normal'])).toBe('watch');
    expect(worstStatus(['watch', 'critical', 'offline'])).toBe('critical');
    expect(worstStatus(['normal', 'offline'])).toBe('offline');
    expect(worstStatus(['normal', 'normal'])).toBe('normal');
  });
  it('ออฟไลน์ทั้งหมดหรือว่าง = offline', () => {
    expect(worstStatus(['offline', 'offline'])).toBe('offline');
    expect(worstStatus([])).toBe('offline');
  });
});
