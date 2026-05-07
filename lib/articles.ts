// lib/articles.ts — 各サービスサイトから実際の記事を取得
// 【2026-05-07 設計修正】
// 正しいオウンドメディア戦略:
//   ① サイトの実際の記事をRSS/sitemapから取得
//   ② 記事内容をAIで要約して動画ナレーション生成
//   ③ CTAはその記事の実URLにリンク → 整合性100%
//
// これにより「うその宣言」が完全に解消される

// ── Gemini APIで記事→CanvasItem変換 ─────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}


const CATEGORY_SITE_MAP: Record<string, string> = {
  health:    'https://health.asoventure.jp',
  finance:   'https://finance.asoventure.jp',
  education: 'https://education.asoventure.jp',
  life:      'https://life.asoventure.jp',
  japan:     'https://japan.asoventure.jp',
  job:       'https://job.asoventure.jp',
  cheese:    'https://cheese.asoventure.jp',
};

// RSS候補パス（サービスによって異なる）
const RSS_PATHS = ['/feed.xml', '/rss.xml', '/rss', '/feed', '/atom.xml', '/sitemap.xml'];

export interface FetchedArticle {
  title: string;
  url: string;
  excerpt: string;
  publishedAt?: string;
}

// ── RSSパース（シンプル正規表現ベース）──────────────────────────────────
function parseRSSItems(xml: string, limit = 5): FetchedArticle[] {
  const items: FetchedArticle[] = [];

  // RSS 2.0 / Atom の両方に対応
  const itemPattern = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemPattern.exec(xml)) !== null && items.length < limit) {
    const block = match[1];

    const title = (/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i.exec(block) || [])[1]?.trim() || '';
    const link  = (/<link[^>]*>(?:<!\[CDATA\[)?(https?:\/\/[^<\]]+)(?:\]\]>)?<\/link>/i.exec(block)
      || /<link[^>]*href="(https?:\/\/[^"]+)"/i.exec(block) || [])[1]?.trim() || '';
    const desc  = (/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i.exec(block) || [])[1]
      ?.replace(/<[^>]+>/g, '').trim().slice(0, 200) || '';
    const date  = (/<(?:pubDate|published|updated)[^>]*>(.*?)<\/(?:pubDate|published|updated)>/i.exec(block) || [])[1]?.trim() || '';

    if (title && link) {
      items.push({ title, url: link, excerpt: desc, publishedAt: date });
    }
  }

  return items;
}

// ── サイトから記事取得（RSS → fallback: sitemap）─────────────────────────
export async function fetchLatestArticles(category: string, limit = 5): Promise<FetchedArticle[]> {
  const baseUrl = CATEGORY_SITE_MAP[category];
  if (!baseUrl) return [];

  for (const path of RSS_PATHS) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'AsoventureBot/1.0' },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRSSItems(xml, limit);
      if (items.length > 0) {
        console.log(`[Articles] Fetched ${items.length} articles from ${baseUrl}${path}`);
        return items;
      }
    } catch {
      continue;
    }
  }

  console.warn(`[Articles] No RSS found for ${category} (${baseUrl})`);
  return [];
}

// ── 記事内容をGeminiで要約→CanvasItem生成 ────────────────────────────────
export async function generateCanvasItemFromArticle(
  article: FetchedArticle,
  category: string
): Promise<CanvasItem> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
以下の記事を元に、YouTube Shorts用のCanvas動画コンテンツを日本語で生成してください。

記事タイトル: ${article.title}
記事の内容（抜粋）: ${article.excerpt}
記事URL: ${article.url}

以下のJSON形式で出力してください（他のテキストは不要）:
{
  "title": "動画タイトル（25文字以内・インパクトのある表現）",
  "narration": "ナレーション（60〜90秒分・記事の核心を語る・最後に「詳しくはリンクをご覧ください」で終える）",
  "points": [
    "① ポイント名（10文字以内）\\n→ 補足説明（20文字以内）",
    "② ポイント名\\n→ 補足説明",
    "③ ポイント名\\n→ 補足説明",
    "④ ポイント名\\n→ 補足説明",
    "⑤ ポイント名\\n→ 補足説明"
  ]
}

条件:
- 記事に書いていないことを宣伝しない（うその宣言禁止）
- 動画はあくまで記事の要約・予告として機能させる
- 「〇〇ができます」という約束は記事に書いてある内容のみ
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // JSONパース
  const jsonMatch = text.match(/\{[\s\S]+\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON for article canvas');
  const parsed = JSON.parse(jsonMatch[0]) as {
    title: string;
    narration: string;
    points: string[];
  };

  return {
    topic: article.title,
    title: parsed.title,
    narration: parsed.narration,
    points: parsed.points,
    siteUrl: new URL(article.url).hostname,
    fullUrl: `${article.url}?utm_source=youtube&utm_medium=canvas&utm_campaign=${category}`,
    ctaText: `📖 記事を読む→`,
    lang: 'ja',
  };
}

// ── フォールバック用スタティックプール（RSS取得失敗時）──────────────────
// RSS取得が失敗した場合のみ使用（うその宣言回避のため最小限に）
export const FALLBACK_CANVAS: Record<string, CanvasItem> = {
  health: {
    topic: '健康的な生活習慣',
    title: '毎日続けられる健康習慣5選💚',
    narration: '健康的な生活は積み重ねから始まります。睡眠・食事・運動の基本3つを少しずつ改善するだけで体調が変わります。詳しい方法はチャンネルの記事をご確認ください。',
    points: ['① 毎日7時間の睡眠\n→ 免疫機能と集中力の基盤', '② 朝食を必ず食べる\n→ 代謝が上がり午前中の集中力UP', '③ 1日8000歩を目標\n→ 心肺機能と精神的健康の維持', '④ 水を1.5L以上飲む\n→ 代謝促進と疲労回復に必須', '⑤ 就寝1時間前にスマホを閉じる\n→ 睡眠の質を守る最重要習慣'],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 健康記事を読む→',
    lang: 'ja',
  },
};
