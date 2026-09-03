import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, PanelRightClose } from 'lucide-react';
import { useStore } from '../store/index.js';
import { useI18n } from '../i18n.js';
import HomePanel from './HomePanel.jsx';
import CustomerPanel, { CustomersList } from './CustomerPanel.jsx';
import TablePanel from './TablePanel.jsx';
import PricingPanel from './PricingPanel.jsx';
import InventoryPanel from './InventoryPanel.jsx';
import StaffPanel from './StaffPanel.jsx';
import KnowledgePanel from './KnowledgePanel.jsx';
import WebPanel from './WebPanel.jsx';
import ImagePanel from './ImagePanel.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import { ActivityPanel, MembersPanel } from './ActivityPanel.jsx';
import AccountPanel from './AccountPanel.jsx';
import FollowupPanel, { FollowupMessage } from './FollowupPanel.jsx';
import { FEATURE_PANELS, FEATURE_TITLES } from './features/index.jsx';

export default function RightPanel() {
  const { panel, panelBack, panelHistory, toggleRight } = useStore();
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  useEffect(() => { refresh(); }, [panel]);

  let body;
  switch (panel.view) {
    case 'customers': body = <CustomersList key={tick} />; break;
    case 'customer': body = <CustomerPanel key={panel.customer_id + tick} customerId={panel.customer_id} tab={panel.tab} />; break;
    case 'table': body = <TablePanel key={panel.table_id + tick} tableId={panel.table_id} talkGuide={panel.talk_guide} />; break;
    case 'pricing': body = <PricingPanel key={tick} pricing={panel.pricing} customerId={panel.customer_id} applied={panel.applied} productId={panel.product_id} />; break;
    case 'inventory': body = <InventoryPanel key={tick} />; break;
    case 'staff': body = <StaffPanel key={tick} />; break;
    case 'knowledge': body = <KnowledgePanel key={tick} hits={panel.hits} />; break;
    case 'web': body = <WebPanel query={panel.query} results={panel.results} engine={panel.engine} error={panel.error} />; break;
    case 'image': body = <ImagePanel images={panel.images} prompt={panel.prompt} />; break;
    case 'settings': body = <SettingsPanel key={tick} />; break;
    case 'activity': body = <ActivityPanel key={tick} />; break;
    case 'members': body = <MembersPanel key={tick} />; break;
    case 'account': body = <AccountPanel key={tick} />; break;
    case 'followups': body = <div key={tick}>{panel.message ? <FollowupMessage msg={panel.message} customerId={panel.customer_id} /> : null}<FollowupPanel filter={panel.tab} /></div>; break;
    default: { const FC = FEATURE_PANELS[panel.view]; body = FC ? <FC key={tick} /> : <HomePanel key={tick} />; break; }
  }
  const TITLES = {
    home: t('p_home'), customers: t('p_customers'), customer: t('p_customer'), table: t('p_table'), pricing: t('p_pricing'),
    inventory: t('p_inventory'), staff: t('p_staff'), knowledge: t('p_knowledge'), web: t('p_web'), image: t('p_image'), settings: t('p_settings'),
    activity: t('p_activity'), members: t('u_members'), account: t('u_settings'), followups: t('fu_title'),
    ...FEATURE_TITLES,
  };
  return (
    <>
      <header className="h-12 shrink-0 flex items-center gap-1 px-2 border-b border-line">
        {panelHistory.length > 0 && <button onClick={panelBack} className="p-1.5 rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg"><ArrowLeft size={16} /></button>}
        <div className="font-medium text-[13px] flex-1 px-1">{TITLES[panel.view] || t('info_panel')}</div>
        <button onClick={refresh} className="p-1.5 rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg" title={t('refresh')}><RefreshCw size={14} /></button>
        <button onClick={toggleRight} className="p-1.5 rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg" title="⌘."><PanelRightClose size={16} /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-3 fade-in" key={panel.view + (panel.customer_id || '') + (panel.table_id || '')}>{body}</div>
    </>
  );
}
