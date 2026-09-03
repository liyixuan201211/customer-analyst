import React from 'react';

export const Section = ({ title, right, children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {(title || right) && <div className="flex items-center justify-between mb-1.5"><div className="text-[11px] font-semibold text-fg-3 uppercase tracking-wider">{title}</div>{right}</div>}
    {children}
  </div>
);

export const Card = ({ children, className = '', onClick }) => <div onClick={onClick} className={`rounded-xl border border-line bg-elev p-3 ${onClick ? 'cursor-pointer hover:border-fg-3 transition' : ''} ${className}`}>{children}</div>;

const TAG = {
  gray: 'bg-bg-3 text-fg-2',
  green: 'bg-ok/12 text-ok',
  red: 'bg-danger/12 text-danger',
  amber: 'bg-warn/14 text-warn',
  blue: 'bg-brand-soft text-brand',
  indigo: 'bg-brand-soft text-brand',
};
export const Tag = ({ children, color = 'gray' }) => <span className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${TAG[color] || TAG.gray}`}>{children}</span>;

export const Btn = ({ children, onClick, variant = 'default', size = 'sm', disabled, className = '', title }) => {
  const v = {
    default: 'bg-elev border border-line-2 hover:bg-bg-3 text-fg',
    primary: 'bg-brand text-brand-fg hover:opacity-90',
    danger: 'bg-elev border border-danger/30 text-danger hover:bg-danger/10',
    ghost: 'text-fg-2 hover:bg-bg-3 hover:text-fg',
  }[variant];
  const s = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1.5 text-xs';
  return <button title={title} disabled={disabled} onClick={onClick} className={`rounded-lg ${v} ${s} disabled:opacity-40 transition ${className}`}>{children}</button>;
};

const field = 'w-full rounded-lg border border-line-2 bg-bg px-2 py-1.5 text-xs outline-none focus:border-brand/60 placeholder:text-fg-3';
export const Input = (props) => <input {...props} className={`${field} ${props.className || ''}`} />;
export const Select = (props) => <select {...props} className={`${field} ${props.className || ''}`} />;
export const Textarea = (props) => <textarea {...props} className={`${field} ${props.className || ''}`} />;

export const Score = ({ value, max = 100, color }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const c = color || (pct >= 75 ? 'bg-ok' : pct >= 50 ? 'bg-warn' : 'bg-danger');
  return <div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-bg-3 rounded-full overflow-hidden"><div className={`h-full ${c} rounded-full`} style={{ width: pct + '%' }} /></div><span className="text-xs font-medium w-8 text-right tabular-nums">{value}</span></div>;
};

export const KV = ({ k, v }) => v == null || v === '' ? null : <div className="flex gap-2 text-xs py-0.5"><span className="text-fg-3 w-20 shrink-0">{k}</span><span className="text-fg break-words">{Array.isArray(v) ? v.join('、') : String(v)}</span></div>;

export const List = ({ items, icon = '•', color = 'text-fg' }) => !items?.length ? null : <ul className="space-y-0.5">{items.map((x, i) => <li key={i} className={`text-xs ${color} flex gap-1.5 leading-relaxed`}><span className="shrink-0 text-fg-3">{icon}</span><span>{typeof x === 'string' ? x : JSON.stringify(x)}</span></li>)}</ul>;

export const Empty = ({ text }) => <div className="text-xs text-fg-3 text-center py-8">{text}</div>;

export const DataTable = ({ columns, rows, compact }) => (
  <div className="overflow-auto rounded-xl border border-line">
    <table className="min-w-full text-[12px]">
      <thead className="bg-bg-2 sticky top-0"><tr>{columns.map((c) => <th key={c.key} className="text-left font-semibold px-2 py-1.5 text-fg-2 whitespace-nowrap">{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line hover:bg-bg-2/60">{columns.map((c) => <td key={c.key} className={`px-2 ${compact ? 'py-1' : 'py-1.5'} align-top text-fg`}>{fmt(r[c.key])}</td>)}</tr>)}</tbody>
    </table>
  </div>
);
const fmt = (v) => v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);

export const levelColor = (lvl) => /铁杆|忠诚|低|上升|新客|成长|成熟/.test(lvl || '') ? 'green' : /流失|高|下降|衰退/.test(lvl || '') ? 'red' : /摇摆|中/.test(lvl || '') ? 'amber' : 'gray';
