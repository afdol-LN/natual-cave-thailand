import type { SensorDef, SensorKey } from '../domain/types';

/** เกณฑ์ทั้งหมดเป็นค่าสมมติสำหรับ prototype */
export const SENSORS: Record<SensorKey, SensorDef> = {
  temp: {
    key: 'temp',
    label: 'อุณหภูมิ',
    short: 'Temp',
    unit: '°C',
    decimals: 1,
    domain: [10, 35],
    normal: [18, 28],
    watch: [15, 31],
  },
  humidity: {
    key: 'humidity',
    label: 'ความชื้นสัมพัทธ์',
    short: 'RH',
    unit: '%',
    decimals: 0,
    domain: [50, 100],
    normal: [80, 100],
    watch: [70, 100],
  },
  co2: {
    key: 'co2',
    label: 'CO₂',
    short: 'CO₂',
    unit: 'ppm',
    decimals: 0,
    domain: [300, 3500],
    normal: [350, 1200],
    watch: [300, 2000],
  },
  o2: {
    key: 'o2',
    label: 'O₂',
    short: 'O₂',
    unit: '%',
    decimals: 1,
    domain: [16, 23],
    normal: [19.5, 21.5],
    watch: [18.5, 22],
  },
  water: {
    key: 'water',
    label: 'ระดับน้ำ',
    short: 'Water',
    unit: 'cm',
    decimals: 0,
    domain: [0, 160],
    normal: [0, 80],
    watch: [0, 120],
  },
};

export const SENSOR_KEYS: SensorKey[] = ['temp', 'humidity', 'co2', 'o2', 'water'];
