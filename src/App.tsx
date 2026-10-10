import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getCaveConfig } from './config/caves';
import { SENSORS } from './config/sensors';
import { fmtAgo } from './domain/format';
import { severity } from './domain/status';
import DashboardPage from './features/dashboard/DashboardPage';
import SensorsPage from './features/sensors/SensorsPage';
import { useOpenAlerts } from './hooks/queries';
import { Loading, StatusBadge, StatusGlyph } from './shared/ui';
import { useUi } from './store';

// Mapbox หนัก → โหลดเฉพาะเมื่อเข้าหน้าภาพรวม
const OverviewPage = lazy(() => import('./features/overview/OverviewPage'));

export default function App() {
  const caveId = useUi((s) => s.caveId);
  const { pathname } = useLocation();
  const isOverview = pathname === '/';

  return (
    <div className={`app${isOverview ? ' app--fullbleed' : ''}`}>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Smart Cave Platform หน้าแรก">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 20 L8 6 L12 12 L15 8 L22 20 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M10 20 Q12 15 14 20" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="brand__text">
            <strong>Smart Cave</strong>
            <span className="brand__sub">ศูนย์เฝ้าระวังระบบนิเวศถ้ำ</span>
          </span>
        </Link>
        <nav className="tabs" aria-label="เมนูหลัก">
          <NavLink to="/" end className="tabs__link">
            ภาพรวม
          </NavLink>
          <NavLink to={caveId ? `/sensors/${caveId}` : '/sensors'} className="tabs__link">
            เซนเซอร์
          </NavLink>
          <NavLink to={`/dashboard/${caveId ?? 'all'}`} className="tabs__link">
            Dashboard
          </NavLink>
        </nav>
        <AlertCounter />
      </header>
      <main className="main">
        <Suspense fallback={<Loading label="กำลังโหลดแผนที่…" />}>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/sensors/:caveId?" element={<SensorsPage />} />
            <Route path="/dashboard/:caveId?" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function AlertCounter() {
  const open = useOpenAlerts();
  const ack = useUi((s) => s.ack);
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const worst = open.reduce((w, a) => (severity(a.level) > severity(w) ? a.level : w), 'offline' as (typeof open)[number]['level']);
  const hasCritical = open.some((a) => a.level === 'critical');

  useEffect(() => setShow(false), [pathname]);
  useEffect(() => {
    if (!show) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShow(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [show]);

  return (
    <div className="alertctr" ref={ref}>
      <button
        className={`alertctr__btn${hasCritical ? ' is-critical' : ''}`}
        aria-expanded={show}
        aria-label={`alert ที่เปิดอยู่ ${open.length} รายการ`}
        onClick={() => setShow((v) => !v)}
      >
        {open.length > 0 ? <StatusGlyph status={worst} size={12} /> : <StatusGlyph status="normal" size={12} />}
        <span className="alertctr__label">Alert</span>
        <span className="num alertctr__count">{open.length}</span>
      </button>
      {show && (
        <div className="alertctr__pop" role="dialog" aria-label="รายการ alert ที่เปิดอยู่">
          <div className="overline">Alert ที่ยังไม่รับทราบ</div>
          {open.length === 0 && <p className="muted">ไม่มี alert ค้างอยู่</p>}
          <ul className="alertlist">
            {open.map((a) => (
              <li key={a.id} className={`alertitem alertitem--${a.level}`}>
                <StatusBadge status={a.level} compact />
                <div className="alertitem__body">
                  <Link to={`/sensors/${a.caveId}`} className="alertitem__title">
                    {getCaveConfig(a.caveId).name} · {SENSORS[a.sensor].label}
                  </Link>
                  <div className="alertitem__msg">{a.message}</div>
                  <div className="alertitem__time">เริ่ม {fmtAgo(a.start)}</div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => ack(a.id)}>
                  รับทราบ
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
