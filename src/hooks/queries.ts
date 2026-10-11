import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as api from '../api';
import type { CaveAlert, CaveId, RangeKey, SensorKey } from '../domain/types';
import { useUi } from '../store';

const POLL = 3000;
const live = { refetchInterval: POLL, placeholderData: keepPreviousData } as const;

export const useLatest = (caveId?: CaveId) =>
  useQuery({ queryKey: ['latest', caveId ?? 'all'], queryFn: () => api.getLatest(caveId), ...live });

export const useSeries = (caveId: CaveId, sensor: SensorKey, range: RangeKey) =>
  useQuery({
    queryKey: ['series', caveId, sensor, range],
    queryFn: () => api.getSeries(caveId, sensor, range),
    ...live,
    refetchInterval: range === '1h' ? POLL : 30_000,
  });

export const useDevices = (caveId?: CaveId) =>
  useQuery({ queryKey: ['devices', caveId ?? 'all'], queryFn: () => api.getDevices(caveId), ...live });

export const useAlerts = (caveId?: CaveId) =>
  useQuery({ queryKey: ['alerts', caveId ?? 'all'], queryFn: () => api.getAlerts(caveId), ...live });


export const useAnalytics = () => useQuery({ queryKey: ['analytics'], queryFn: api.getAnalytics, ...live });

export const useDailyAnomalies = (days = 7) =>
  useQuery({ queryKey: ['daily', days], queryFn: () => api.getDailyAnomalies(days), ...live, refetchInterval: 60_000 });

export const useForecast = (caveId: CaveId, sensor: SensorKey) =>
  useQuery({ queryKey: ['forecast', caveId, sensor], queryFn: () => api.getForecast(caveId, sensor), staleTime: Infinity });

/** alert ที่ยังเกิดอยู่และยังไม่ได้รับทราบ */
export function useOpenAlerts(): CaveAlert[] {
  const { data } = useAlerts();
  const acked = useUi((s) => s.acked);
  return (data ?? []).filter((a) => a.end == null && !acked[a.id]);
}
