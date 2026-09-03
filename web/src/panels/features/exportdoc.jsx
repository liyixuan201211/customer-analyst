import React, { useEffect, useState } from 'react';
import { FileText, FileDown } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Select, Empty } from '../ui.jsx';

export default function ExportdocPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { pick: 'Export report', customer: 'Customer', word: 'Word (.doc)', html: 'HTML', all: 'All customers' }
    : { pick: '导出报告', customer: '客户', word: 'Word (.doc)', html: 'HTML', all: '全部客户' };
  const [custs, setCusts] = useState([]); const [cid, setCid] = useState('');
  useEffect(() => { api.get('/customers').then(setCusts); }, []);
  const base = `/api/customers/${cid}/report`;
  return (
    <>
      <Section title={TXT.pick} right={<Select value={cid} onChange={e => setCid(e.target.value)} className="w-40"><option value="">{TXT.customer}</option>{custs.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}>
        {!cid ? <Empty text={TXT.pick} /> : (
          <div className="flex gap-2">
            <a href={base + '.doc'} className="rounded-lg bg-elev border border-line-2 hover:bg-bg-3 px-3 py-2 text-xs flex items-center gap-1.5"><FileText size={14} className="text-brand" /> {TXT.word}</a>
            <a href={base + '.html'} className="rounded-lg bg-elev border border-line-2 hover:bg-bg-3 px-3 py-2 text-xs flex items-center gap-1.5"><FileDown size={14} className="text-brand" /> {TXT.html}</a>
            <a href={base + '.csv'} className="rounded-lg bg-elev border border-line-2 hover:bg-bg-3 px-3 py-2 text-xs flex items-center gap-1.5">CSV</a>
            <a href={base + '.xlsx'} className="rounded-lg bg-elev border border-line-2 hover:bg-bg-3 px-3 py-2 text-xs flex items-center gap-1.5">XLSX</a>
          </div>
        )}
      </Section>
      <Section title={TXT.all}><div className="flex gap-2"><a href="/api/report.doc" className="rounded-lg bg-elev border border-line-2 hover:bg-bg-3 px-3 py-2 text-xs flex items-center gap-1.5"><FileText size={14} className="text-brand" /> {TXT.all} Word</a><a href="/api/report.xlsx" className="rounded-lg bg-elev border border-line-2 hover:bg-bg-3 px-3 py-2 text-xs flex items-center gap-1.5">XLSX</a><a href="/api/report.csv" className="rounded-lg bg-elev border border-line-2 hover:bg-bg-3 px-3 py-2 text-xs flex items-center gap-1.5">CSV</a></div></Section>
    </>
  );
}
