import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Empty } from '../ui.jsx';

export default function FieldpermsPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { fields: 'Sensitive fields', export: 'Export permission', member: 'Member', admin: 'Admin', masked: 'Masked for members', visible: 'Visible' }
    : { fields: '敏感字段', export: '导出权限', member: '成员', admin: '管理员', masked: '非管理员隐藏', visible: '可见' };
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/permissions/fields').then(setD); }, []);
  if (!d) return <Empty text={t('loading')} />;
  return (
    <>
      <Section title={TXT.fields}>
        <Card className="space-y-1">{d.sensitive_fields.map(f => <div key={f} className="flex items-center justify-between text-xs"><span className="text-fg-2">{f}</span><Tag color="red">{TXT.masked}</Tag></div>)}</Card>
      </Section>
      <Section title={TXT.export} right={<Tag color={d.export_allowed ? 'green' : 'gray'}>{d.export_allowed ? TXT.admin + ' ✓' : TXT.member + ' ✗'}</Tag>}>
        <Card className="text-xs text-fg-2">{d.rules.admin}<br />{d.rules.member}</Card>
      </Section>
    </>
  );
}
