import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CAVES, getCaveConfig } from '../../config/caves';
import { SENSOR_KEYS, SENSORS } from '../../config/sensors';
import { fmtAgo, fmtNum } from '../../domain/format';
import { worstStatus } from '../../domain/status';
import type { CaveId, Latest, Status } from '../../domain/types';
import { useAlerts, useAnalytics, useLatest } from '../../hooks/queries';
import { Kpi, Loading, Panel, StatusBadge, StatusGlyph, ValueText } from '../../shared/ui';
import { useUi } from '../../store';

const GlobeMap = lazy(() => import('./GlobeMap'));
const TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim() ?? '';

export default function OverviewPage() {
  const { data: latest } = useLatest();
  const { data: alerts } = useAlerts();
  const { data: analytics } = useAnalytics();
  const acked = useUi((s) => s.acked);
  const setCave = useUi((s) => s.setCave);
  const [selected, setSelected] = useState<CaveId | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const statusByCave = useMemo(() => {
    const m = {} as Record<CaveId, Status>;
    for (const c of CAVES) m[c.id] = worstStatus((latest ?? []).filter((l) => l.caveId === c.id).map((l) => l.status));
    return m;
  }, [latest]);
  const healthByCave = useMemo(() => Object.fromEntries((analytics ?? []).map((a) => [a.caveId, a.health])) as Record<CaveId, number>, [analytics]);

  const select = (id: CaveId | null) => {
    setSelected(id);
    if (id) {
      setCave(id);
      setSheetOpen(true);
      setRightOpen(true);
    }
  };
  const reset = () => {
    setSelected(null);
    setResetKey((k) => k + 1);
  };

  const openAlerts = (alerts ?? []).filter((a) => a.end == null && !acked[a.id]);
  const onlineCaves = CAVES.filter((c) => statusByCave[c.id] !== 'offline').length;
  const activeSensors = (latest ?? []).filter((l) => l.status !== 'offline').length;
  const avgHealth = analytics?.length ? analytics.reduce((s, a) => s + a.health, 0) / analytics.length : null;
  const showMap = TOKEN && !mapFailed;

  return (
    <div className={`overview${showMap ? '' : ' overview--nomap'}`}>
      {showMap ? (
        <div className="overview__map">
          <Suspense fallback={<Loading label="กำลังโหลดโลก 3D…" />}>
            <GlobeMap
              token={TOKEN}
              statusByCave={statusByCave}
              healthByCave={healthByCave}
              latest={latest ?? []}
              selected={selected}
              onSelect={select}
              resetKey={resetKey}
              onError={() => setMapFailed(true)}
            />
          </Suspense>
          <button className="btn btn--pill overview__reset" onClick={reset}>
            ⟲ รีเซ็ตมุมมอง
          </button>
        </div>
      ) : (
        <NoMapFallback failed={mapFailed} statusByCave={statusByCave} healthByCave={healthByCave} selected={selected} onSelect={select} />
      )}

      <div className={`overview__panels${sheetOpen ? ' is-open' : ''}${leftOpen ? '' : ' left-closed'}${rightOpen ? '' : ' right-closed'}`}>
        <button className="sheet-handle" onClick={() => setSheetOpen((v) => !v)} aria-expanded={sheetOpen}>
          <span className="sheet-handle__grip" />
          <span>{sheetOpen ? 'ย่อแผง' : `ข้อมูลประเทศ · alert ${openAlerts.length}`}</span>
        </button>
        <SideToggle side="left" open={leftOpen} onToggle={() => setLeftOpen((v) => !v)} label="สถานะทั่วประเทศ" />
        <SideToggle side="right" open={rightOpen} onToggle={() => setRightOpen((v) => !v)} label={`Alert ${openAlerts.length}`} />
        <div className="overview__left">
          <Panel overline="National Smart Cave Platform" title="สถานะทั่วประเทศ">
            <div className="kpi-grid kpi-grid--2">
              <Kpi label="ถ้ำออนไลน์" value={`${onlineCaves}/${CAVES.length}`} />
              <Kpi label="เซนเซอร์ใช้งาน" value={`${activeSensors}/${CAVES.length * SENSOR_KEYS.length}`} />
              <Kpi label="Alert ที่เปิดอยู่" value={openAlerts.length} status={openAlerts.some((a) => a.level === 'critical') ? 'critical' : undefined} />
              <Kpi label="ดัชนีสุขภาพเฉลี่ย" value={fmtNum(avgHealth)} unit="/100" />
            </div>
            <ul className="cave-mini">
              {CAVES.map((c) => (
                <li key={c.id}>
                  <button className={`cave-mini__btn${selected === c.id ? ' is-active' : ''}`} onClick={() => select(c.id)}>
                    <StatusGlyph status={statusByCave[c.id]} />
                    <span className="cave-mini__name">{c.name}</span>
                    <span className="cave-mini__prov">{c.province}</span>
                    <span className="num cave-mini__health">{healthByCave[c.id] ?? '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="overview__right">
          {selected && <CaveDetail id={selected} latest={latest ?? []} status={statusByCave[selected]} health={healthByCave[selected]} onClose={reset} />}
          <Panel overline="Live feed" title="Alert ล่าสุด" className="feed">
            {!alerts && <Loading />}
            <ul className="alertlist">
              {(alerts ?? []).slice(0, 8).map((a) => (
                <li key={a.id} className={`alertitem alertitem--${a.level}${a.end != null || acked[a.id] ? ' is-closed' : ''}`}>
                  <StatusBadge status={a.level} compact />
                  <div className="alertitem__body">
                    <button className="alertitem__title linklike" onClick={() => select(a.caveId)}>
                      {getCaveConfig(a.caveId).name} · {SENSORS[a.sensor].label}
                    </button>
                    <div className="alertitem__msg">{a.message}</div>
                    <div className="alertitem__time">
                      {fmtAgo(a.start)}
                      {a.end != null ? ' · สิ้นสุดแล้ว' : acked[a.id] ? ' · รับทราบแล้ว' : ' · ยังเกิดอยู่'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** แถบเปิด/ปิดแผงข้าง (เฉพาะจอกว้างที่มีแผนที่) */
function SideToggle({ side, open, onToggle, label }: { side: 'left' | 'right'; open: boolean; onToggle: () => void; label: string }) {
  const arrow = (side === 'left') === open ? '‹' : '›';
  return (
    <button className={`side-toggle side-toggle--${side}`} onClick={onToggle} aria-expanded={open} aria-label={open ? `ซ่อนแผง${label}` : `แสดงแผง${label}`} title={open ? 'ซ่อนแผง' : 'แสดงแผง'}>
      <span className="side-toggle__arrow" aria-hidden="true">
        {arrow}
      </span>
      {!open && <span className="side-toggle__label">{label}</span>}
    </button>
  );
}

function CaveDetail({ id, latest, status, health, onClose }: { id: CaveId; latest: Latest[]; status: Status; health?: number; onClose: () => void }) {
  const cave = getCaveConfig(id);
  const rows = latest.filter((l) => l.caveId === id);
  return (
    <Panel
      overline={`${cave.id} · ${cave.province}`}
      title={cave.name}
      className="detail"
      actions={
        <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="ปิดรายละเอียด">
          ✕
        </button>
      }
    >
      <div className="detail__meta">
        <StatusBadge status={status} />
        <span className="muted">
          สุขภาพ <span className="num">{health ?? '—'}</span>/100
        </span>
      </div>
      <dl className="readings">
        {SENSOR_KEYS.map((k) => {
          const l = rows.find((r) => r.sensor === k);
          return (
            <div key={k} className={`readings__row readings__row--${l?.status ?? 'offline'}`}>
              <dt>
                <StatusGlyph status={l?.status ?? 'offline'} size={10} /> {SENSORS[k].label}
              </dt>
              <dd>
                <ValueText sensor={k} value={l?.value ?? null} />
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="detail__coords num">
        {cave.lat.toFixed(4)}°N, {cave.lon.toFixed(4)}°E {cave.coordsVerified ? '' : '· พิกัดยังไม่ยืนยัน'}
      </p>
      <div className="btn-row">
        <Link className="btn btn--primary btn--pill" to={`/sensors/${id}`}>
          ดูเซนเซอร์
        </Link>
        <Link className="btn btn--pill" to={`/dashboard/${id}`}>
          เปิด Dashboard
        </Link>
      </div>
    </Panel>
  );
}

function NoMapFallback({
  failed,
  statusByCave,
  healthByCave,
  selected,
  onSelect,
}: {
  failed: boolean;
  statusByCave: Record<CaveId, Status>;
  healthByCave: Record<CaveId, number>;
  selected: CaveId | null;
  onSelect: (id: CaveId) => void;
}) {
  return (
    <div className="nomap">
      <div className="nomap__notice">
        <div className="overline">{failed ? 'โหลดแผนที่ไม่สำเร็จ' : 'ยังไม่ได้ตั้งค่า Mapbox token'}</div>
        <p>
          แสดงรายการถ้ำแทนโลก 3D วิธีเปิดแผนที่: คัดลอก <code>.env.example</code> เป็น <code>.env</code> แล้วใส่{' '}
          <code>VITE_MAPBOX_TOKEN=pk.…</code> (สร้างได้ที่ account.mapbox.com) จากนั้นรัน <code>npm run dev</code> ใหม่
        </p>
      </div>
      <div className="nomap__grid">
        {CAVES.map((c) => (
          <button key={c.id} className={`cavecard${selected === c.id ? ' is-active' : ''}`} onClick={() => onSelect(c.id)}>
            <div className="cavecard__top">
              <StatusBadge status={statusByCave[c.id]} />
              <span className="num muted">{c.id}</span>
            </div>
            <div className="cavecard__name">{c.name}</div>
            <div className="muted">
              {c.province} · {c.region}
            </div>
            <div className="cavecard__foot">
              <span className="num">
                {c.lat.toFixed(2)}, {c.lon.toFixed(2)}
              </span>
              <span>
                สุขภาพ <span className="num">{healthByCave[c.id] ?? '—'}</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
