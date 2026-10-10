import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl';
import { CAVES, THAILAND_VIEW } from '../../config/caves';
import { SENSOR_KEYS, SENSORS } from '../../config/sensors';
import { fmtValue } from '../../domain/format';
import type { CaveId, Latest, Status } from '../../domain/types';
import { StatusBadge, StatusGlyph } from '../../shared/ui';

interface Props {
  token: string;
  statusByCave: Record<CaveId, Status>;
  healthByCave: Record<CaveId, number>;
  latest: Latest[];
  selected: CaveId | null;
  onSelect: (id: CaveId) => void;
  resetKey: number;
  onError: () => void;
}

/** อ่านค่าสีจาก tokens.css (Mapbox ไม่รู้จัก CSS variables) */
function token(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // Mapbox อ่าน var()/color-mix() ไม่ได้ → ให้เบราว์เซอร์คำนวณแล้วอ่านพิกเซลกลับเป็น hex
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return raw;
  const probe = document.createElement('i');
  probe.style.color = raw;
  document.body.appendChild(probe);
  ctx.fillStyle = getComputedStyle(probe).color;
  probe.remove();
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** ปรับ layer ของ light-v11 ให้เข้าพาเลตต์เท่าที่ทำได้ */
function recolor(map: mapboxgl.Map) {
  const bg = token('--c-bg');
  const surface = token('--c-surface');
  const surface2 = token('--c-surface-2');
  const line = token('--c-line');
  const text = token('--c-text');
  const set = (id: string, prop: string, v: unknown) => {
    try {
      map.setPaintProperty(id, prop as never, v as never);
    } catch {
      /* layer ไม่มี property นี้ */
    }
  };
  for (const layer of map.getStyle()?.layers ?? []) {
    const id = layer.id;
    if (layer.type === 'background') set(id, 'background-color', bg);
    else if (layer.type === 'fill' && id.includes('water')) set(id, 'fill-color', surface2);
    else if (layer.type === 'fill') set(id, 'fill-color', surface);
    else if (layer.type === 'line' && id.includes('water')) set(id, 'line-color', surface2);
    else if (layer.type === 'line') set(id, 'line-color', line);
    else if (layer.type === 'symbol') {
      set(id, 'text-color', text);
      set(id, 'text-halo-color', bg);
    }
  }
}

export default function GlobeMap({ token: accessToken, statusByCave, healthByCave, latest, selected, onSelect, resetKey, onError }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [hover, setHover] = useState<CaveId | null>(null);
  const [fog, setFog] = useState<mapboxgl.FogSpecification | undefined>(undefined);

  useEffect(() => {
    setFog({
      color: token('--c-surface'),
      'high-color': token('--c-line'),
      'space-color': token('--c-surface-2'),
      'horizon-blend': 0.06,
      'star-intensity': 0,
    });
  }, []);

  // reset view
  useEffect(() => {
    if (resetKey === 0) return;
    mapRef.current?.flyTo({ center: [THAILAND_VIEW.longitude, THAILAND_VIEW.latitude], zoom: THAILAND_VIEW.zoom, pitch: 0, bearing: 0, duration: reduceMotion() ? 0 : 2500 });
  }, [resetKey]);

  // fly ไปถ้ำที่เลือก (รวมกรณีเลือกจากแผงข้าง)
  useEffect(() => {
    if (!selected) return;
    const c = CAVES.find((x) => x.id === selected)!;
    mapRef.current?.flyTo({ center: [c.lon, c.lat], zoom: 12, pitch: 55, bearing: -20, duration: reduceMotion() ? 0 : 3200, essential: true });
  }, [selected]);

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={accessToken}
      initialViewState={{ longitude: 40, latitude: 15, zoom: 0.9 }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      projection={{ name: 'globe' }}
      fog={fog}
      style={{ width: '100%', height: '100%' }}
      attributionControl
      onError={(e) => {
        console.warn('Mapbox error', e.error);
        if (String(e.error?.message ?? '').match(/token|401|403|Unauthorized/i)) onError();
      }}
      onLoad={(e) => {
        recolor(e.target);
        e.target.flyTo({
          center: [THAILAND_VIEW.longitude, THAILAND_VIEW.latitude],
          zoom: THAILAND_VIEW.zoom,
          duration: reduceMotion() ? 0 : 4500,
          essential: true,
        });
      }}
    >
      <NavigationControl position="bottom-right" visualizePitch />
      {CAVES.map((c) => {
        const st = statusByCave[c.id];
        const rows = latest.filter((l) => l.caveId === c.id);
        return (
          <Marker key={c.id} longitude={c.lon} latitude={c.lat} anchor="center" style={{ zIndex: hover === c.id ? 3 : selected === c.id ? 2 : 1 }}>
            <div className="pin-wrap" onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)}>
              <button
                className={`pin pin--${st}${selected === c.id ? ' is-selected' : ''}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelect(c.id);
                }}
                onFocus={() => setHover(c.id)}
                onBlur={() => setHover(null)}
                aria-label={`${c.name} สถานะ ${st}`}
              >
                {st === 'critical' && <span className="pin__ring" />}
                <StatusGlyph status={st} size={20} />
              </button>
              <span className="pin__label">{c.name}</span>
              {hover === c.id && (
                <div className="hovercard" role="tooltip">
                  <div className="hovercard__head">
                    <strong>{c.name}</strong>
                    <StatusBadge status={st} compact />
                  </div>
                  <div className="muted">
                    {c.province} · สุขภาพ <span className="num">{healthByCave[c.id] ?? '—'}</span>/100
                  </div>
                  <ul className="hovercard__list">
                    {SENSOR_KEYS.map((k) => {
                      const l = rows.find((r) => r.sensor === k);
                      return (
                        <li key={k}>
                          <StatusGlyph status={l?.status ?? 'offline'} size={8} pulse={false} />
                          <span>{SENSORS[k].short}</span>
                          <span className="num">
                            {fmtValue(k, l?.value)} {SENSORS[k].unit}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="hovercard__hint">คลิกเพื่อซูมเข้า</div>
                </div>
              )}
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
