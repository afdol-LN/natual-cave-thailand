import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import Map, { Marker, NavigationControl, useMap, type MapRef } from 'react-map-gl';
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

/** ขอบเขตประเทศไทย [W, S, E, N] — โหลดข้อมูลความสูงเฉพาะในกรอบนี้ */
const THAILAND_BOUNDS: [number, number, number, number] = [97.3, 5.6, 105.7, 20.5];
/** เปิด terrain เมื่อซูมถึงระดับประเทศ; มุมมองลูกโลกไม่ต้องโหลด DEM ทั้งโลก */
const TERRAIN_MIN_ZOOM = 6;

/**
 * ภูมิประเทศ 3D + เงาเนินเขา ให้เขาหินปูนรอบถ้ำเห็นชัด
 * ต้องเพิ่มหลังแผนที่โหลดเสร็จ: prop `terrain` ของ react-map-gl จะไม่ทำงานถ้า source ยังไม่มีตอนโหลด style
 */
function addTerrain(map: mapboxgl.Map) {
  const DEM = 'mapbox://mapbox.mapbox-terrain-dem-v1';
  const dem = { type: 'raster-dem', url: DEM, tileSize: 512, maxzoom: 14, bounds: THAILAND_BOUNDS } as const;
  if (!map.getSource('mapbox-dem')) map.addSource('mapbox-dem', dem);
  // hillshade ใช้ source แยกจาก terrain ตามคำแนะนำของ Mapbox; สีใช้ค่า default ของ Mapbox
  if (!map.getSource('mapbox-dem-hs')) map.addSource('mapbox-dem-hs', dem);
  if (!map.getLayer('cave-hillshade'))
    map.addLayer({
      id: 'cave-hillshade',
      type: 'hillshade',
      source: 'mapbox-dem-hs',
      slot: 'bottom',
      minzoom: TERRAIN_MIN_ZOOM,
      paint: { 'hillshade-exaggeration': 0.6 },
    } as mapboxgl.AnyLayer);

  let on = false;
  const sync = () => {
    const want = map.getZoom() >= TERRAIN_MIN_ZOOM;
    if (want === on) return;
    on = want;
    map.setTerrain(want ? { source: 'mapbox-dem', exaggeration: 1.5 } : null);
  };
  map.on('zoomend', sync);
  map.on('moveend', sync);
  sync();
}

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default function GlobeMap({ token: accessToken, statusByCave, healthByCave, latest, selected, onSelect, resetKey, onError }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [hover, setHover] = useState<CaveId | null>(null);

  // reset view
  useEffect(() => {
    if (resetKey === 0) return;
    mapRef.current?.flyTo({ center: [THAILAND_VIEW.longitude, THAILAND_VIEW.latitude], zoom: THAILAND_VIEW.zoom, pitch: 0, bearing: 0, duration: reduceMotion() ? 0 : 2500 });
  }, [resetKey]);

  // fly ไปถ้ำที่เลือก (รวมกรณีเลือกจากแผงข้าง)
  useEffect(() => {
    if (!selected) return;
    const c = CAVES.find((x) => x.id === selected)!;
    mapRef.current?.flyTo({ center: [c.lon, c.lat], zoom: 13.5, pitch: 65, bearing: -20, duration: reduceMotion() ? 0 : 3600, essential: true });
  }, [selected]);

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={accessToken}
      initialViewState={{ longitude: 40, latitude: 15, zoom: 0.9 }}
      mapStyle="mapbox://styles/mapbox/standard"
      projection={{ name: 'globe' }}
      maxPitch={80}
      style={{ width: '100%', height: '100%' }}
      attributionControl
      onError={(e) => {
        console.warn('Mapbox error', e.error);
        if (String(e.error?.message ?? '').match(/token|401|403|Unauthorized/i)) onError();
      }}
      onLoad={(e) => {
        addTerrain(e.target);
        e.target.flyTo({
          center: [THAILAND_VIEW.longitude, THAILAND_VIEW.latitude],
          zoom: THAILAND_VIEW.zoom,
          duration: reduceMotion() ? 0 : 4500,
          essential: true,
        });
      }}
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      <Compass />
      {CAVES.map((c) => {
        const st = statusByCave[c.id];
        const rows = latest.filter((l) => l.caveId === c.id);
        return (
          <Marker key={c.id} longitude={c.lon} latitude={c.lat} anchor="bottom" style={{ zIndex: hover === c.id ? 3 : selected === c.id ? 2 : 1 }}>
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
                <svg className="pin__shape" viewBox="0 0 32 42" aria-hidden="true">
                  <path d="M16 40 C16 40 3 25.5 3 15 A13 13 0 0 1 29 15 C29 25.5 16 40 16 40 Z" />
                </svg>
                <span className="pin__glyph">
                  <StatusGlyph status={st} size={14} />
                </span>
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

const DIRS = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
];

/** เข็มทิศลอยมุมซ้ายล่าง: หมุนตามทิศแผนที่ คลิกเพื่อหันกลับทิศเหนือและตั้งกล้องตรง */
function Compass() {
  const { current: map } = useMap();
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);

  useEffect(() => {
    if (!map) return;
    const sync = () => {
      setBearing(map.getBearing());
      setPitch(map.getPitch());
    };
    sync();
    map.on('rotate', sync);
    map.on('pitch', sync);
    return () => {
      map.off('rotate', sync);
      map.off('pitch', sync);
    };
  }, [map]);

  const tilted = Math.abs(bearing) > 0.5 || pitch > 0.5;
  return (
    <button
      className={`compass${tilted ? ' is-tilted' : ''}`}
      onClick={() => map?.easeTo({ bearing: 0, pitch: 0, duration: reduceMotion() ? 0 : 800 })}
      aria-label={`เข็มทิศ: หันไปทาง ${Math.round(((bearing % 360) + 360) % 360)}° คลิกเพื่อหันกลับทิศเหนือ`}
      title="หันกลับทิศเหนือ"
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" style={{ transform: `rotate(${-bearing}deg)` }}>
        <circle cx="32" cy="32" r="30" className="compass__ring" />
        {/* ขีดย่อยทุก 30° */}
        {Array.from({ length: 12 }, (_, i) => i * 30)
          .filter((a) => a % 90 !== 0)
          .map((a) => (
            <line key={a} x1="32" y1="3" x2="32" y2="6" className="compass__tick" transform={`rotate(${a} 32 32)`} />
          ))}
        {/* ตัวอักษรทิศ: วางรอบนอกเข็ม และหมุนกลับให้ตั้งตรงเสมอ */}
        {DIRS.map((d) => {
          const rad = (d.angle * Math.PI) / 180;
          const x = 32 + 21 * Math.sin(rad);
          const y = 32 - 21 * Math.cos(rad);
          return (
            <text key={d.label} x={x} y={y} className={`compass__dir${d.label === 'N' ? ' compass__dir--n' : ''}`} transform={`rotate(${bearing} ${x} ${y})`}>
              {d.label}
            </text>
          );
        })}
        <polygon points="32,2 35,7 29,7" className="compass__north-mark" />
        {/* เข็มสั้นอยู่ด้านในตัวอักษร */}
        <polygon points="32,17 35.5,32 28.5,32" className="compass__north" />
        <polygon points="32,47 35.5,32 28.5,32" className="compass__south" />
        <circle cx="32" cy="32" r="2.5" className="compass__hub" />
      </svg>
    </button>
  );
}
