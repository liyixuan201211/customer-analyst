import OrdersPanel from './orders.jsx';
import ChurnPanel from './churn.jsx';
import SentimentPanel from './sentiment.jsx';
import CompetitorsPanel from './competitors.jsx';
import SurveysPanel from './surveys.jsx';
import ScriptsPanel from './scripts.jsx';
import TranslatePanel from './translate.jsx';
import TimelinePanel from './timeline.jsx';
import RemindersPanel from './reminders.jsx';
import ApprovalsPanel from './approvals.jsx';
import PermissionsPanel from './permissions.jsx';
import AuditPanel from './audit.jsx';
import BatchImportPanel from './batchimport.jsx';
import BriefPanel from './brief.jsx';
import ConvoTagsPanel from './convotags.jsx';
import MultiAgentPanel from './multiagent.jsx';
import PwaPanel from './pwa.jsx';
import IntegrationsPanel from './integrations.jsx';
import DashboardPanel from './dashboard.jsx';
import AnomalyPanel from './anomaly.jsx';
import BigscreenPanel from './bigscreen.jsx';
import ExportdocPanel from './exportdoc.jsx';
import FieldpermsPanel from './fieldperms.jsx';
import BackupPanel from './backup.jsx';
import ReportsPanel from './reports.jsx';
import CurrencyPanel from './currency.jsx';
import IngestPanel from './ingest.jsx';
import SendPanel from './send.jsx';
import NotifyPanel from './notify.jsx';
import VoicePanel from './voice.jsx';
import LtvPanel from './ltv.jsx';
import SegmentsPanel from './segments.jsx';
import BiPanel from './bi.jsx';
import SchedulePanel from './schedule.jsx';
import PipelinePanel from './pipeline.jsx';
import AutomationPanel from './automation.jsx';

export const FEATURE_PANELS = {
  orders: OrdersPanel, churn: ChurnPanel, sentiment: SentimentPanel, competitors: CompetitorsPanel, surveys: SurveysPanel,
  scripts: ScriptsPanel, translate: TranslatePanel, timeline: TimelinePanel, reminders: RemindersPanel, approvals: ApprovalsPanel,
  permissions: PermissionsPanel, audit: AuditPanel, batchimport: BatchImportPanel, brief: BriefPanel, convotags: ConvoTagsPanel,
  multiagent: MultiAgentPanel, pwa: PwaPanel, integrations: IntegrationsPanel, dashboard: DashboardPanel, anomaly: AnomalyPanel,
  automation: AutomationPanel, pipeline: PipelinePanel, schedule: SchedulePanel, bi: BiPanel, segments: SegmentsPanel,
  ltv: LtvPanel, voice: VoicePanel, notify: NotifyPanel, send: SendPanel, ingest: IngestPanel,
  currency: CurrencyPanel, reports: ReportsPanel, backup: BackupPanel, fieldperms: FieldpermsPanel, exportdoc: ExportdocPanel, bigscreen: BigscreenPanel,
};

export const FEATURE_TITLES = {
  automation: '触发式自动化', pipeline: '管道看板', schedule: '智能排程', bi: '对话式BI', segments: '客户分群',
  ltv: 'LTV预测', voice: '语音记录', notify: 'IM通知', send: '定时发送', ingest: '消息直连',
  currency: '多币种', reports: '报表中心', backup: '备份恢复', fieldperms: '字段权限', exportdoc: 'Word/PDF导出', bigscreen: '全屏大屏',
  orders: '成交订单', churn: '流失预测', sentiment: '情感分析', competitors: '竞品对标', surveys: '客户问卷',
  scripts: '话术库', translate: '多语种生成', timeline: '触达时间线', reminders: '到期提醒', approvals: '审批流',
  permissions: '权限与数据', audit: '审计合规', batchimport: '批量建档', brief: '每日简报', convotags: '会话标签',
  multiagent: '多智能体', pwa: '移动端/PWA', integrations: '开放API', dashboard: '数据大屏', anomaly: '异常检测',
};

// 需要出现在导航的视图（view, i18n key, icon 名）
export const FEATURE_NAV = [
  ['brief', 'brief', 'Sunrise'], ['orders', 'orders', 'Receipt'], ['churn', 'churn', 'AlertTriangle'],
  ['competitors', 'competitors', 'Scale'], ['scripts', 'scripts', 'MessagesSquare'], ['surveys', 'surveys', 'ClipboardList'],
  ['approvals', 'approvals', 'BadgeCheck'], ['timeline', 'timeline', 'History'], ['dashboard', 'dashboard', 'LayoutDashboard'],
];
