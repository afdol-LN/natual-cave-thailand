import { useMemo } from 'react';
import { CAVES } from '../../config/caves';
import { worstStatus } from '../../domain/status';
import type { CaveId, Status } from '../../domain/types';
import { useLatest } from '../../hooks/queries';
import { CaveSwitcher, Loading, useCaveRoute } from '../../shared/ui';
import AllView from './AllView';
import CaveView from './CaveView';

export default function DashboardPage() {
  const [route, select] = useCaveRoute('/dashboard', true);
  const { data: latest } = useLatest();
  const statuses = useMemo(() => {
    const m: Partial<Record<CaveId, Status>> = {};
    for (const c of CAVES) m[c.id] = worstStatus((latest ?? []).filter((l) => l.caveId === c.id).map((l) => l.status));
    return m;
  }, [latest]);

  if (!route) return <Loading />;
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="overline">Decision Support Dashboard</div>
          <h1 className="page__title">{route === 'all' ? 'ภาพรวมทั้งหมด' : CAVES.find((c) => c.id === route)!.name}</h1>
          <p className="muted">ข้อมูลจำลอง (mock) · ใช้สาธิตการติดตามภูมิอากาศและการตัดสินใจเชิงอนุรักษ์</p>
        </div>
      </div>
      <div className="toolbar">
        <CaveSwitcher value={route} onChange={select} includeAll statuses={statuses} />
      </div>
      {route === 'all' ? <AllView /> : <CaveView caveId={route} />}
    </div>
  );
}
