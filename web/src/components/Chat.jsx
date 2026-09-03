import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUp, Square, Paperclip, ImagePlus, X, ChevronDown, ChevronRight, Wrench, Brain, Check, Loader2, Copy, RefreshCw, Pencil, PanelLeftOpen, PanelRightOpen, PanelRightClose, Sparkles, Eye, Globe } from 'lucide-react';
import { useI18n, LOCALES } from '../i18n.js';
import { useStore } from '../store/index.js';
import { readFileAsDataURL, readFileAsText } from '../lib/api.js';

const TOOL_LABEL = {
  list_customers: '查询客户', get_customer: '读取客户档案', create_customer: '创建客户', update_customer: '更新客户',
  import_chat_text: '导入聊天记录', get_chat_records: '读取聊天记录', analyze_profile: '深层画像分析', analyze_loyalty: '忠诚度分析',
  generate_table_and_advice: '生成多维表格与话术', create_table: '创建表格', search_knowledge: '知识库检索', add_knowledge: '写入知识库',
  web_search: '联网搜索', fetch_webpage: '抓取网页', list_products: '查询商品', upsert_product: '保存商品', dynamic_pricing: '动态定价',
  adjust_stock: '库存出入库', inventory_report: '库存报告', list_staff: '查询人员', upsert_staff: '保存人员', assign_customer: '分配客户',
  recommend_staff: '推荐跟进人', generate_image: '生成图片',
};



export default function Chat() {
  const { messages, streaming, status, send, stop, currentId, conversations, leftOpen, rightOpen, toggleLeft, toggleRight } = useStore();
  const { t, locale, setLocale } = useI18n();
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const [stick, setStick] = useState(true);
  const conv = conversations.find((c) => c.id === currentId);

  useEffect(() => { if (stick) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, status, stick]);
  const onScroll = () => { const el = scrollRef.current; if (el) setStick(el.scrollHeight - el.scrollTop - el.clientHeight < 80); };

  const addFiles = async (list) => {
    const out = [];
    for (const f of list) {
      if (f.type.startsWith('image/')) out.push({ type: 'image', name: f.name, dataUrl: await readFileAsDataURL(f) });
      else out.push({ type: 'file', name: f.name, text: await readFileAsText(f) });
    }
    setFiles((p) => [...p, ...out]);
  };
  const submit = async () => {
    const t = text.trim();
    if ((!t && !files.length) || streaming) return;
    setText(''); setFiles([]); setStick(true);
    await send(t || (files.some((f) => f.type === 'image') ? '请识别这些聊天截图并导入，然后分析客户画像与忠诚度。' : '请处理附件内容。'), files);
  };
  const onPaste = (e) => {
    const items = [...(e.clipboardData?.items || [])].filter((i) => i.type.startsWith('image/'));
    if (items.length) { e.preventDefault(); addFiles(items.map((i) => i.getAsFile()).filter(Boolean)); }
  };
  useEffect(() => { const el = taRef.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 220) + 'px'; } }, [text]);

  const visible = messages.filter((m) => m.role !== 'tool');
  return (
    <>
      <header className="h-12 shrink-0 flex items-center gap-1 px-2 border-b border-line bg-bg/80 backdrop-blur">
        {!leftOpen && <button onClick={toggleLeft} className="p-1.5 rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg" title="⌘B"><PanelLeftOpen size={16} /></button>}
        <ModelSelector conv={conv} />
        <div className="flex-1 min-w-0 text-[13px] text-fg-2 truncate px-2">{conv?.title && conv.title !== '新对话' ? conv.title : ''}</div>
        <LangSwitcher locale={locale} setLocale={setLocale} />
        <button onClick={toggleRight} className="p-1.5 rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg" title="⌘.">{rightOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}</button>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles([...e.dataTransfer.files]); }}>
        <div className="max-w-[820px] mx-auto px-5 py-6 space-y-7">
          {visible.length === 0 && <Empty onPick={(q) => { setText(q); taRef.current?.focus(); }} />}
          {visible.map((m, i) => <Message key={m.id} m={m} isLast={i === visible.length - 1} />)}
          {status && <div className="text-xs text-fg-2 flex items-center gap-2 pl-10"><Loader2 size={13} className="animate-spin" />{status}</div>}
        </div>
      </div>

      <div className="shrink-0 px-5 pb-4 pt-1">
        <div className="max-w-[820px] mx-auto rounded-2xl border border-line-2 bg-elev shadow-[var(--shadow)] focus-within:border-brand/50 transition">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {files.map((f, i) => (
                <div key={i} className="relative group">
                  {f.type === 'image' ? <img src={f.dataUrl} alt={f.name} className="h-16 w-16 object-cover rounded-lg border border-line" /> :
                    <div className="h-16 px-3 rounded-lg border border-line bg-bg-2 text-xs flex items-center max-w-[180px] truncate">📄 {f.name}</div>}
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 bg-fg text-bg rounded-full p-0.5 hidden group-hover:block"><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
          <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} onPaste={onPaste} rows={1}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            placeholder={t('placeholder')}
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[14px] outline-none placeholder:text-fg-3 leading-relaxed" />
          <div className="flex items-center justify-between px-2.5 pb-2.5">
            <div className="flex items-center gap-0.5 text-fg-2">
              <label className="p-1.5 rounded-lg hover:bg-bg-3 cursor-pointer" title={t('upload_img')}><ImagePlus size={17} /><input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} /></label>
              <label className="p-1.5 rounded-lg hover:bg-bg-3 cursor-pointer" title={t('upload_file')}><Paperclip size={17} /><input type="file" accept=".txt,.csv,.md,.json,.log" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} /></label>
              <span className="text-[11px] text-fg-3 ml-1 hidden sm:inline">Enter 发送 · Shift+Enter 换行 · 支持粘贴截图</span>
            </div>
            {streaming ? (
              <button onClick={stop} className="rounded-full bg-fg text-bg p-2 hover:opacity-80" title={t('stop')}><Square size={14} /></button>
            ) : (
              <button onClick={submit} disabled={!text.trim() && !files.length} className="rounded-full bg-brand text-brand-fg p-2 disabled:opacity-30 hover:opacity-90 transition"><ArrowUp size={16} /></button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** Open WebUI 风格的顶部模型选择器 */
function ModelSelector({ conv }) {
  const { models, setConversationModel } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  if (!models) return null;
  const current = conv?.model || models.selected.chat;
  const info = models.registry.chat.find((m) => m.id === current);
  const { t } = useI18n();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium hover:bg-bg-3 transition">
        <span>{info?.label || current}</span>
        {info?.vision && <Eye size={12} className="text-fg-3" />}
        <ChevronDown size={14} className="text-fg-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[340px] rounded-xl border border-line-2 bg-elev shadow-[var(--shadow)] p-1.5 z-30 fade-in max-h-[420px] overflow-y-auto">
          <div className="text-[11px] text-fg-3 px-2 py-1">{t('chat_models')}</div>
          {models.registry.chat.map((m) => (
            <button key={m.id} onClick={() => { setConversationModel(m.id); setOpen(false); }}
              className={`w-full text-left rounded-lg px-2.5 py-2 hover:bg-bg-3 flex items-start gap-2 ${m.id === current ? 'bg-brand-soft' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium flex items-center gap-1.5">{m.label}{m.vision && <span className="text-[10px] rounded px-1 bg-bg-3 text-fg-2">{t('vision')}</span>}{m.reasoning && <span className="text-[10px] rounded px-1 bg-bg-3 text-fg-2">{t('reasoning')}</span>}</div>
                <div className="text-[11px] text-fg-3 truncate">{m.desc} · {m.id}</div>
              </div>
              {m.id === current && <Check size={14} className="text-brand mt-1" />}
            </button>
          ))}
          <div className="text-[11px] text-fg-3 px-2 pt-1.5 pb-1 border-t border-line mt-1">{t('only_conv')}；{t('more_models_help')}</div>
        </div>
      )}
    </div>
  );
}

function Empty({ onPick }) {
  const { t } = useI18n();
  const quick = [['qi_import', 'import_chat'], ['qi_churn', 'churn'], ['qi_table', 'table'], ['qi_kb', 'kb'], ['qi_web', 'web'], ['qi_pricing', 'pricing']];
  const q = {
    import_chat: '把下面的聊天记录导入并分析客户画像与忠诚度：\n', churn: '帮我列出所有客户，并给出流失风险最高的三位及维系建议',
    table: '为客户生成多维分析表和建议对话方式', kb: '查询知识库里关于报价政策的资料', web: '联网搜索这家客户公司的最新动态', pricing: '对商品做动态定价分析，考虑客户忠诚度与竞品价格',
  };
  return (
    <div className="pt-20 text-center fade-in">
      <div className="w-12 h-12 rounded-2xl bg-brand grid place-items-center text-brand-fg mx-auto mb-4"><Sparkles size={22} /></div>
      <div className="text-[22px] font-semibold tracking-tight mb-1.5">{t('empty_title')}</div>
      <div className="text-[13px] text-fg-2 mb-8">{t('empty_sub')}</div>
      <div className="flex flex-wrap justify-center gap-2">
        {quick.map(([k, id]) => (
          <button key={k} onClick={() => onPick(q[id])} className="rounded-full border border-line-2 bg-elev px-3.5 py-1.5 text-[13px] text-fg-2 hover:text-fg hover:border-fg-3 transition">{t(k)}</button>
        ))}
      </div>
    </div>
  );
}

/** 顶部语言切换器 */
function LangSwitcher({ locale, setLocale }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg" title="语言 / Language"><Globe size={15} /></button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[200px] rounded-xl border border-line-2 bg-elev shadow-[var(--shadow)] p-1.5 z-40 fade-in">
          <div className="text-[11px] text-fg-3 px-2 py-1">语言 / Language</div>
          {LOCALES.map((l) => <button key={l.code} onClick={() => { setLocale(l.code); setOpen(false); }} className={`w-full text-left px-2 py-1.5 rounded-lg text-[12.5px] flex items-center gap-2 ${l.code === locale ? 'bg-brand-soft text-brand' : 'text-fg-2 hover:bg-bg-3'}`}><span>{l.flag}</span>{l.label}</button>)}
        </div>
      )}
    </div>
  );
}

function Message({ m, isLast }) {
  const { regenerate, editAndResend, streaming } = useStore();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const copy = (txt) => navigator.clipboard.writeText(txt);

  if (m.role === 'user') {
    const clean = stripSystemAppendix(m.content);
    return (
      <div className="flex justify-end group fade-in">
        <div className="max-w-[85%]">
          {m.attachments?.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end mb-1.5">
              {m.attachments.map((a, i) => a.type === 'image' && a.dataUrl ? <img key={i} src={a.dataUrl} className="h-28 rounded-xl border border-line" /> : <span key={i} className="text-xs bg-bg-3 rounded-lg px-2 py-1">📄 {a.name}</span>)}
            </div>
          )}
          {editing ? (
            <div className="rounded-2xl border border-line-2 bg-elev p-2">
              <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={Math.min(10, draft.split('\n').length + 1)} className="w-full bg-transparent text-sm outline-none resize-none px-2 py-1" />
              <div className="flex justify-end gap-1.5 px-1"><button onClick={() => setEditing(false)} className="text-xs px-2.5 py-1 rounded-lg hover:bg-bg-3">取消</button><button onClick={() => { setEditing(false); editAndResend(m.id, draft); }} className="text-xs px-2.5 py-1 rounded-lg bg-brand text-brand-fg">发送</button></div>
            </div>
          ) : (
            <div className="rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] whitespace-pre-wrap break-words leading-relaxed" style={{ background: 'var(--user-bubble)', color: 'var(--user-fg)' }}>{clean}</div>
          )}
          <div className="flex justify-end gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition">
            <IconBtn title={t('copy')} onClick={() => copy(clean)}><Copy size={13} /></IconBtn>
            {!streaming && <IconBtn title={t('edit_resend')} onClick={() => { setDraft(clean); setEditing(true); }}><Pencil size={13} /></IconBtn>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 group fade-in">
      <div className="w-7 h-7 rounded-lg bg-brand grid place-items-center text-brand-fg shrink-0 mt-0.5"><Sparkles size={14} /></div>
      <div className="min-w-0 flex-1">
        {m.reasoning && <Reasoning text={m.reasoning} live={m.live && !m.content} />}
        {m.tool_calls?.length > 0 && <div className="space-y-1 mb-2">{m.tool_calls.map((tc) => <ToolCall key={tc.id} tc={tc} />)}</div>}
        {m.content ? <div className={`md ${m.error ? 'text-danger' : ''}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
          : m.live && !m.reasoning && !m.tool_calls?.length ? <div className="flex gap-1 py-2"><span className="dot w-1.5 h-1.5 bg-fg-3 rounded-full" /><span className="dot w-1.5 h-1.5 bg-fg-3 rounded-full" /><span className="dot w-1.5 h-1.5 bg-fg-3 rounded-full" /></div> : null}
        {!m.live && (m.content || m.error) && (
          <div className={`flex gap-0.5 mt-1.5 -ml-1 transition ${isLast ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <IconBtn title={t('copy')} onClick={() => copy(m.content)}><Copy size={13} /></IconBtn>
            {!streaming && <IconBtn title={t('regen')} onClick={() => regenerate(m.id)}><RefreshCw size={13} /></IconBtn>}
          </div>
        )}
      </div>
    </div>
  );
}
const IconBtn = ({ children, onClick, title }) => <button title={title} onClick={onClick} className="p-1.5 rounded-md text-fg-3 hover:text-fg hover:bg-bg-3">{children}</button>;

function stripSystemAppendix(s) {
  const ks = ['\n\n【系统已将', '\n\n【附件文件：', '\n\n【截图识别失败'].map((k) => s.indexOf(k)).filter((x) => x >= 0);
  return ks.length ? s.slice(0, Math.min(...ks)) : s;
}

function Reasoning({ text, live }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs text-fg-2 hover:text-fg">
        <Brain size={13} /> <span className={live ? 'shimmer' : ''}>{live ? t('thinking') : t('thought')}</span> {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {(open || live) && <div className="mt-1.5 text-[12.5px] text-fg-2 border-l-2 border-line-2 pl-3 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">{text}</div>}
    </div>
  );
}

function ToolCall({ tc }) {
  const [open, setOpen] = useState(false);
  let args = {}; try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
  const summary = Object.entries(args).map(([k, v]) => `${k}=${typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v).slice(0, 40)}`).join(', ');
  const err = tc.result?.error;
  return (
    <div className="rounded-xl border border-line bg-bg-2 text-xs overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-bg-3/60">
        {tc.running ? <Loader2 size={13} className="animate-spin text-brand" /> : err ? <X size={13} className="text-danger" /> : <Check size={13} className="text-ok" />}
        <Wrench size={12} className="text-fg-3" />
        <span className={`font-medium ${tc.running ? 'shimmer' : 'text-fg'}`}>{TOOL_LABEL[tc.function.name] || tc.function.name}</span>
        <span className="text-fg-3 truncate flex-1">{summary}</span>
        {open ? <ChevronDown size={12} className="text-fg-3" /> : <ChevronRight size={12} className="text-fg-3" />}
      </button>
      {open && (
        <div className="border-t border-line px-2.5 py-2 space-y-1.5">
          <div className="text-fg-3">参数</div>
          <pre className="bg-bg rounded-lg p-2 overflow-x-auto max-h-40 text-[11px]">{JSON.stringify(args, null, 2)}</pre>
          {tc.result !== undefined && <><div className="text-fg-3">结果</div><pre className="bg-bg rounded-lg p-2 overflow-x-auto max-h-60 text-[11px]">{JSON.stringify(tc.result, null, 2).slice(0, 4000)}</pre></>}
        </div>
      )}
    </div>
  );
}
