import type { CSSProperties } from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { INDEX_DEF, INDEX_KEYS, type CaveIndices } from '../../api/analytics';
import type { CaveId } from '../../domain/types';
import { useCaveName } from '../../registry';
import { C } from '../../shared/ui';

/** สีประจำถ้ำ (นิยามใน tokens.css) */
export const CAVE_COLOR: Record<CaveId, string> = {
  'TRG-001': 'var(--c-cave-trg)',
  'KRI-001': 'var(--c-cave-kri)',
  'CNX-001': 'var(--c-cave-cnx)',
};

/** Spider chart ดัชนี 7 มิติ (0–1) ซ้อนได้หลายถ้ำ */
export function IndexRadar({ series, height = 300 }: { series: { caveId: CaveId; indices: CaveIndices }[]; height?: number }) {
  const caveName = useCaveName();
  const rows = INDEX_KEYS.map((k) => {
    const row: Record<string, string | number> = { key: k, axis: INDEX_DEF[k].abbr };
    for (const s of series) row[s.caveId] = s.indices[k];
    return row;
  });
  const single = series.length === 1;

  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke={C.line} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: C.text, fontSize: 12, fontWeight: 700 }} />
          <PolarRadiusAxis domain={[0, 1]} tickCount={6} angle={90} tick={{ fill: C.faint, fontSize: 9 }} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} />
          <Tooltip
            contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text }}
            labelFormatter={(abbr) => {
              const k = INDEX_KEYS.find((x) => INDEX_DEF[x].abbr === abbr);
              return k ? `${INDEX_DEF[k].abbr} · ${INDEX_DEF[k].name}` : String(abbr);
            }}
            formatter={(v: number, id: string) => [v.toFixed(2), caveName(id)]}
          />
          {series.map((s) => (
            <Radar
              key={s.caveId}
              dataKey={s.caveId}
              stroke={CAVE_COLOR[s.caveId]}
              strokeWidth={2.5}
              fill={CAVE_COLOR[s.caveId]}
              fillOpacity={single ? 0.35 : 0.15}
              dot={{ r: 3, fill: CAVE_COLOR[s.caveId], strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** checkbox เลือกถ้ำที่จะแสดง (กล่องสีตามสีประจำถ้ำ) */
export function CaveChecklist({ ids, selected, onToggle }: { ids: CaveId[]; selected: ReadonlySet<CaveId>; onToggle: (id: CaveId) => void }) {
  const caveName = useCaveName();
  return (
    <fieldset className="cave-checks">
      <legend className="sr-only">เลือกถ้ำที่จะเปรียบเทียบ</legend>
      {ids.map((id) => (
        <label key={id} className="cave-check" style={{ '--cave': CAVE_COLOR[id] } as CSSProperties}>
          <input type="checkbox" checked={selected.has(id)} onChange={() => onToggle(id)} />
          <span className="cave-check__box" aria-hidden="true" />
          {caveName(id)}
        </label>
      ))}
    </fieldset>
  );
}

/** ตารางค่าดัชนี 7 มิติ เทียบหลายถ้ำ */
export function IndexTable({ series }: { series: { caveId: CaveId; indices: CaveIndices }[] }) {
  const caveName = useCaveName();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>ดัชนี</th>
            {series.map((s) => (
              <th key={s.caveId} className="r">
                <span className="swatch swatch--cave" style={{ background: CAVE_COLOR[s.caveId] }} /> {caveName(s.caveId)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INDEX_KEYS.map((k) => (
            <tr key={k}>
              <td>
                <strong>{INDEX_DEF[k].abbr}</strong> <span className="muted small">{INDEX_DEF[k].name}</span>
                <div className="muted small">
                  {INDEX_DEF[k].th}
                  {!INDEX_DEF[k].higherIsBetter && ' · ค่าสูง = เปราะบาง'}
                  {INDEX_DEF[k].mock && ' · mock'}
                </div>
              </td>
              {series.map((s) => (
                <td key={s.caveId} className="r num">
                  {s.indices[k].toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
