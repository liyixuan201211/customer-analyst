import React from 'react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';

const COLORS = ['#4d6bfe', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

/** 忠诚度六维雷达图 */
export function LoyaltyRadar({ dimensions }) {
  if (!dimensions?.length) return null;
  const data = dimensions.map(d => ({ dim: (d.dim || d.name || '?').split(' ')[0], score: d.score }));
  const cfg = { outerRadius: '72%', margin: { top: 8, right: 8, bottom: 8, left: 8 } };
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius={cfg.outerRadius} margin={cfg.margin}>
        <PolarGrid stroke="var(--border-2)" />
        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: 'var(--fg-2)' }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="score" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.28} strokeWidth={2} />
        <Tooltip formatter={(v) => [v, 'Score']} contentStyle={{ background: 'var(--elev)', border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 12, color: 'var(--fg)' }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/** 价格分布柱状图（底价/建议/挂牌/上限） */
export function PriceBars({ distribution }) {
  if (!distribution) return null;
  const data = [
    { label: '底价', price: distribution.floor }, { label: '建议', price: distribution.suggested },
    { label: '挂牌', price: distribution.list }, { label: '上限', price: distribution.ceiling },
  ];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--fg-2)' }} axisLine={{ stroke: 'var(--border-2)' }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--fg-3)' }} axisLine={false} tickLine={false} width={44} />
        <Tooltip formatter={(v) => [`¥${v}`, 'Price']} contentStyle={{ background: 'var(--elev)', border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 12, color: 'var(--fg)' }} />
        <Bar dataKey="price" radius={[6, 6, 0, 0]} fill="var(--brand)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** RFM 分层环图 */
export function SegmentDonut({ data }) {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  const withColors = data.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] }));
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie data={withColors} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2}>
          {withColors.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${v}`, 'Customers']} contentStyle={{ background: 'var(--elev)', border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 12, color: 'var(--fg)' }} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--fg-2)' }} />
        {total > 0 && <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="var(--fg-3)" fontSize={11}>{total} 客户</text>}
      </PieChart>
    </ResponsiveContainer>
  );
}

/** 简单横向条形（忠诚度分档） */
export function ScoreBars({ data, colorKey = 'score' }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--fg-3)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: 'var(--fg-2)' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [v, 'Score']} contentStyle={{ background: 'var(--elev)', border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 12, color: 'var(--fg)' }} />
        <Bar dataKey={colorKey} radius={[0, 6, 6, 0]} fill="var(--brand)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
