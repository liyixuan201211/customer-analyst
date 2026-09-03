// 知识库：切块 + 向量 + FTS 混合检索
import { kb, getSetting } from '../db/index.js';
import { embed, cosine, DEFAULTS } from '../llm/aiping.js';

export function chunkText(text, size = 500, overlap = 80) {
  const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  const paras = clean.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + '\n\n' + p).length > size && cur) {
      chunks.push(cur);
      cur = cur.slice(Math.max(0, cur.length - overlap)) + '\n\n' + p;
    } else cur = cur ? cur + '\n\n' + p : p;
    // 超长段落硬切
    while (cur.length > size * 1.6) { chunks.push(cur.slice(0, size)); cur = cur.slice(size - overlap); }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export async function ingestDocument({ title, text, source }) {
  const pieces = chunkText(text);
  if (!pieces.length) throw new Error('文档为空');
  const model = getSetting('models', {}).embedding || DEFAULTS.embedding;
  let vectors = [];
  try { vectors = await embed(pieces, model); } catch (e) { console.warn('[kb] embedding 失败，退化为仅全文检索:', e.message); }
  const chunks = pieces.map((content, i) => ({ content, embedding: vectors[i] || null }));
  const id = kb.addDoc({ title, source, size: text.length, chunks });
  return { id, chunks: chunks.length, embedded: vectors.length > 0 };
}

const toF32 = (buf) => buf ? new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4) : null;

export async function searchKnowledge(query, topK = 6) {
  const model = getSetting('models', {}).embedding || DEFAULTS.embedding;
  const all = kb.allChunks();
  if (!all.length) return [];
  const scores = new Map(); // chunk id -> {chunk, score}
  // 向量检索
  try {
    const [qv] = await embed(query, model);
    for (const c of all) {
      const v = toF32(c.embedding);
      if (!v || v.length !== qv.length) continue;
      const s = cosine(qv, v);
      scores.set(c.id, { chunk: c, score: s });
    }
  } catch (e) { console.warn('[kb] 查询向量化失败:', e.message); }
  // 全文检索加权融合（RRF）
  const fts = kb.ftsSearch(query, topK * 2);
  fts.forEach((r, rank) => {
    const prev = scores.get(r.id);
    const bonus = 1 / (10 + rank); // 0.1 → 0.05
    if (prev) prev.score += bonus;
    else scores.set(r.id, { chunk: all.find(c => c.id === r.id) || r, score: bonus + 0.3 });
  });
  return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, topK)
    .map(({ chunk, score }) => ({ id: chunk.id, doc_id: chunk.doc_id, title: chunk.title, content: chunk.content, score: +score.toFixed(4) }));
}
