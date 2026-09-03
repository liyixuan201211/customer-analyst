// 功能模块注册器：集中挂载所有 feature 子路由
import orders from './orders.js';
import churn from './churn.js';
import sentiment from './sentiment.js';
import competitors from './competitors.js';
import surveys from './surveys.js';
import scripts from './scripts.js';
import translate from './translate.js';
import timeline from './timeline.js';
import reminders from './reminders.js';
import approvals from './approvals.js';
import permissions from './permissions.js';
import audit from './audit.js';
import batchimport from './batchimport.js';
import brief from './brief.js';
import convotags from './convotags.js';
import multiagent from './multiagent.js';
import pwa from './pwa.js';
import integrations from './integrations.js';
import dashboard from './dashboard.js';
import anomaly from './anomaly.js';
import bigscreen from './bigscreen.js';
import exportdoc from './exportdoc.js';
import fieldperms from './fieldperms.js';
import backup from './backup.js';
import reports from './reports.js';
import currency from './currency.js';
import ingest from './ingest.js';
import send from './send.js';
import notify from './notify.js';
import voice from './voice.js';
import ltv from './ltv.js';
import segments from './segments.js';
import bi from './bi.js';
import schedule from './schedule.js';
import pipeline from './pipeline.js';
import automation from './automation.js';

const FEATURES = [orders, churn, sentiment, competitors, surveys, scripts, translate, timeline, reminders, approvals, permissions, audit, batchimport, brief, convotags, multiagent, pwa, integrations, dashboard, anomaly, automation, pipeline, schedule, bi, segments, ltv, voice, notify, send, ingest, currency, reports, backup, fieldperms, exportdoc, bigscreen];

export function registerFeatures(api, ctx) {
  for (const f of FEATURES) {
    try { const fn = f?.default || f; if (typeof fn === 'function') fn(api, ctx); }
    catch (e) { console.error('[feature] ', e); }
  }
}
