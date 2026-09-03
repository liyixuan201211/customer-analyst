// 网络搜索：Bing 中文站 HTML 抓取（无需 API Key），可选 Tavily/SerpAPI（配置环境变量时优先）
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&ensp;|&emsp;|&nbsp;/g, ' ').replace(/&#0?183;|&middot;/g, '·').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();

async function bing(query, limit) {
  const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-cn&count=${limit}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' }, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const results = [];
  const re = /<li class="b_algo"[\s\S]*?<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html)) && results.length < limit) {
    const [, href, titleHtml, rest] = m;
    const snipM = rest.match(/<p[^>]*>([\s\S]*?)<\/p>/) || rest.match(/class="b_caption"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
    results.push({ title: strip(titleHtml), url: href, snippet: snipM ? strip(snipM[1]).slice(0, 400) : '' });
  }
  return results;
}

async function tavily(query, limit) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: limit, search_depth: 'basic' }),
    signal: AbortSignal.timeout(20000),
  });
  const d = await res.json();
  return (d.results || []).map(r => ({ title: r.title, url: r.url, snippet: (r.content || '').slice(0, 400) }));
}

export async function webSearch(query, limit = 6) {
  if (process.env.TAVILY_API_KEY) {
    try { const r = await tavily(query, limit); if (r.length) return { engine: 'tavily', results: r }; } catch {}
  }
  try {
    const r = await bing(query, limit);
    return { engine: 'bing', results: r };
  } catch (e) {
    return { engine: 'bing', results: [], error: String(e.message || e) };
  }
}

/** 抓取网页正文（粗略） */
export async function fetchPage(url, maxChars = 6000) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
  const html = await res.text();
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<nav[\s\S]*?<\/nav>/gi, '').replace(/<footer[\s\S]*?<\/footer>/gi, '');
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  return { title: title ? strip(title) : url, url, text: strip(body).slice(0, maxChars) };
}
