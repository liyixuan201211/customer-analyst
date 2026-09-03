// 到期提醒：今日/逾期待办 + 计数（供角标）
import { followups } from '../db/index.js';

export default function register(api) {
  api.get('/reminders', (c) => {
    const today = followups.list({ status: 'today' });
    const overdue = followups.list({ status: 'open' }); // open = pending & due < now
    const upcoming = followups.list({ status: 'upcoming' });
    return c.json({ today, overdue, upcoming, count: today.length + overdue.length });
  });
  api.get('/reminders/count', (c) => {
    const today = followups.list({ status: 'today' }).length;
    const overdue = followups.list({ status: 'open' }).length;
    return c.json({ count: today + overdue, today, overdue });
  });
}
