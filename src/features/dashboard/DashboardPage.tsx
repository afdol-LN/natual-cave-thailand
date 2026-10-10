import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CAVES } from '../../config/caves';
import { worstStatus } from '../../domain/status';
import type { CaveId, Status } from '../../domain/types';
import { useLatest } from '../../hooks/queries';
import { CaveSwitcher, Loading, useCaveRoute } from '../../shared/ui';
import AllView from './AllView';
import CaveView, { CAVE_TABS, isCaveTab, type CaveTab } from './CaveView';

export default function DashboardPage() {
  const [route, select] = useCaveRoute('/dashboard', true);
  const [params, setParams] = useSearchParams();
  const view = params.get('view');
  const tab: CaveTab = isCaveTab(view) ? view : 'stats';
  const setTab = (t: CaveTab) => setParams(t === 'stats' ? {} : { view: t }, { replace: true });
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
        <div className={`cave-nav${route !== 'all' ? ' is-expanded' : ''}`}>
          <CaveSwitcher value={route} onChange={select} includeAll statuses={statuses} />
          {route !== 'all' && (
            <div className="cave-nav__sub seg seg--small" role="tablist" aria-label="หมวดหมู่ข้อมูลถ้ำ">
              {CAVE_TABS.map((t) => (
                <button key={t.key} role="tab" aria-selected={tab === t.key} className={`seg__btn${tab === t.key ? ' is-active' : ''}`} onClick={() => setTab(t.key)}>
                  <t.icon size={16} aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {route === 'all' ? <AllView /> : <CaveView caveId={route} tab={tab} />}
    </div>
  );
}
