// lib/articles.ts — 各サービスサイトから実際の記事を取得
// 【2026-05-08 改善】RSS未対応サイト対応:
//   sitemap.xml からURLリストを取得 → 記事ページ本文をスクレイプ → Geminiで要約
import type { CanvasItem } from './types';

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
  music1963: 'https://music1963.com',
};

// RSS候補パス（サービスによって異なる）
const RSS_PATHS = ['/feed.xml', '/rss.xml', '/rss', '/feed', '/atom.xml'];

export interface FetchedArticle {
  title: string;
  url: string;
  excerpt: string;
  publishedAt?: string;
  ogImage?: string; // 記事のog:image画像 URL
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
      ?.replace(/<[^>]+>/g, '').trim().slice(0, 300) || '';
    const date  = (/<(?:pubDate|published|updated)[^>]*>(.*?)<\/(?:pubDate|published|updated)>/i.exec(block) || [])[1]?.trim() || '';

    if (title && link) {
      items.push({ title, url: link, excerpt: desc, publishedAt: date });
    }
  }

  return items;
}

// ── sitemapからURLリストを取得（RSSがない場合のフォールバック）─────────────
function parseSitemapUrls(xml: string, baseUrl: string, limit = 5): string[] {
  const urls: string[] = [];
  // <loc>タグからURL抽出
  const locPattern = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
  let match;
  while ((match = locPattern.exec(xml)) !== null && urls.length < limit * 3) {
    const url = match[1].trim();
    // カテゴリページ・タグページ・トップページは除外
    const isArticle = !url.match(/\/(tag|category|tags|categories|page|search|about|contact|privacy|sitemap)\/?(\?.*)?$/)
      && url !== baseUrl + '/'
      && url !== baseUrl;
    if (isArticle) urls.push(url);
  }
  // 最新記事（URLが長いほど記事）を優先、最大 limit 件
  return urls.sort((a, b) => b.length - a.length).slice(0, limit);
}

// ── 記事ページの本文と画像をスクレイプ ──────────────────────────────────
async function scrapeArticlePage(url: string): Promise<{ text: string; ogImage?: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'AsoventureBot/1.0' },
    });
    if (!res.ok) return { text: '' };
    const html = await res.text();
    const baseUrl = new URL(url).origin;

    // タイトル抽出
    const title = (/<title[^>]*>([^<]+)<\/title>/i.exec(html) || [])[1]?.trim() || '';

    // 画像URL抽出（優先順位: og:image > twitter:image > サムネイル img > 最初の img）
    let ogImage: string | undefined;

    // 1. OGPメタタグ
    const metaMatch =
      (/<meta[^>]*property=["']og:image["'][^>]*content=["']([^>"']+)["']/i.exec(html) ||
       /<meta[^>]*content=["']([^>"']+)["'][^>]*property=["']og:image["']/i.exec(html) ||
       /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^>"']+)["']/i.exec(html) ||
       /<meta[^>]*content=["']([^>"']+)["'][^>]*name=["']twitter:image["']/i.exec(html));
    if (metaMatch?.[1]) {
      ogImage = metaMatch[1].trim();
    }

    // 2. サムネイル用img（/thumbnails/ /images/ /img/ を含むsrc）
    if (!ogImage) {
      const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^>"']+)["'][^>]*>/gi)];
      const thumbnailImg = imgMatches.find(m => {
        const src = m[1];
        return src && (
          src.includes('/thumbnail') ||
          src.includes('/thumb') ||
          src.includes('/cover') ||
          src.includes('/hero') ||
          src.includes('/stock')
        ) && !src.includes('icon') && !src.includes('logo');
      });
      if (thumbnailImg?.[1]) {
        // 相対URLを絶対URLに変換
        const src = thumbnailImg[1];
        ogImage = src.startsWith('http') ? src : baseUrl + (src.startsWith('/') ? src : '/' + src);
      }
    }

    // 3. 広告・アイコン以外の最初のimgタグ
    if (!ogImage) {
      const firstImg = [...html.matchAll(/<img[^>]+src=["']([^>"']+)["'][^>]*>/gi)]
        .find(m => {
          const src = m[1];
          return src && !src.includes('icon') && !src.includes('logo') &&
            !src.includes('gif') && !src.includes('avatar') &&
            !src.includes('a8.net') && !src.includes('tracking') && !src.includes('.gif');
        });
      if (firstImg?.[1]) {
        const src = firstImg[1];
        ogImage = src.startsWith('http') ? src : baseUrl + (src.startsWith('/') ? src : '/' + src);
      }
    }

    // メインコンテンツ抽出（article, main, .content など）
    const bodyMatch = html.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i)
      || html.match(/<div[^>]*class="[^"]*(?:content|article|post|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    let text = '';
    if (bodyMatch) {
      text = bodyMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
    }

    const resultText = text ? `${title} — ${text}` : title;
    console.log(`[Articles] 画像: ${ogImage ? ogImage.slice(0, 80) : 'なし'}`);
    return { text: resultText, ogImage };
  } catch {
    return { text: '' };
  }
}


// // Section 1 and 2
export async function fetchLatestArticles(category: string, limit = 5): Promise<FetchedArticle[]> {
    const baseUrl = CATEGORY_SITE_MAP[category];
    if (!baseUrl) return [];

  // 1. RSS Feed
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
                          console.log(`[Articles] RSS: ${items.length} from ${baseUrl}${path}`);
                          // Enrich RSS with ogImage
                  const enriched = await Promise.all(
                              items.slice(0, 3).map(async (item) => {
                                            if (item.ogImage) return item;
                                            try {
                                                            const { ogImage } = await scrapeArticlePage(item.url);
                                                            return { ...item, ogImage };
                                            } catch {
                                                            return item;
                                            }
                              })
                            );
                          return [...enriched, ...items.slice(3)];
                }
        } catch {
                continue;
        }
  }

  // 2. Sitemap + Page Scrape
  try {
        const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, {
                signal: AbortSignal.timeout(8000),
                headers: { 'User-Agent': 'AsoventureBot/1.0' },
        });
        if (sitemapRes.ok) {
                const sitemapXml = await sitemapRes.text();
                const urls = parseSitemapUrls(sitemapXml, baseUrl, limit);
                if (urls.length > 0) {
                          console.log(`[Articles] Sitemap: ${urls.length} urls from ${baseUrl}`);
                          const results: FetchedArticle[] = [];
                          for (const topUrl of urls.slice(0, 3)) {
                                      try {
                                                              const { text: pageText, ogImage } = await scrapeArticlePage(topUrl);
                                                  if (pageText) {
                                                                const slug = topUrl.split('/').filter(Boolean).pop() || '';
                                                                const guessedTitle = slug.replace(/-/g, ' ').replace(/\.[a-z]+$/, '');
                                                                results.push({
                                                                                title: guessedTitle,
                                                                                url: topUrl,
                                                                                excerpt: pageText.slice(0, 300),
                                                                                publishedAt: new Date().toISOString().split('T')[0],
                                                                                ogImage,
                                                                });
                                                  }
                                      } catch {
                                                  continue;
                                      }
                          }
                        if (results.length > 0) return results;
                }
        }
  } catch (e) {
      console.warn(`[Articles] Sitemap fallback failed: ${e}`);
  }

  console.warn(`[Articles] Failed to fetch articles for ${category}`);
    return [];
}

// ─── generateCanvasItemFromArticle（Julesにより削除→復元 2026-05-10）────────
// 記事データをGeminiでCanvasItem形式に変換する
export async function generateCanvasItemFromArticle(
  article: FetchedArticle,
  category: string
): Promise<CanvasItem> {
  const prompt = `以下の記事に、YouTube Shorts用のCanvas動画コンテンツを作成してください。

記事タイトル: ${article.title}
記事の内容（抜粋）: ${article.excerpt}
記事URL: ${article.url}
カテゴリ: ${category}

以下をJSON形式で出力してください（コードブロックや他のテキストは不要、JSONのみ）:
{
  "title": "タイトル（25文字以内・インパクトのある端的なタイトル・数字を含む）",
  "narration": "ナレーション（60〜80文字・記事の核心・最後に「詳しくは記事をチェック！」で終わる）",
  "points": [
    "① ポイント（10文字以内）\\n→ 補足説明（20文字以内）",
    "② ポイント\\n→ 補足",
    "③ ポイント\\n→ 補足",
    "④ ポイント\\n→ 補足",
    "⑤ ポイント\\n→ 補足"
  ]
}

注意:
- タイトルは「〇〇の方法N選！」「〇〇〇が重要な理由」「〇〇で失敗しない秘訣」的な具体的型
- 記事に書いていないことは書かない
- ポイントは記事の要約として機能させる
`;

  const text = (await callGemini(prompt)).trim();

  // JSONパース（コードブロック対応）
  const jsonMatch = text.match(/\{[\s\S]+\}/);
  if (!jsonMatch) throw new Error('Gemini did not return valid JSON for article canvas');
  const parsed = JSON.parse(jsonMatch[0]) as {
    title: string;
    narration: string;
    points: string[];
  };

  const baseUrl = CATEGORY_SITE_MAP[category] || 'https://job.asoventure.jp';

  return {
    topic: (() => { try { return decodeURIComponent(article.title); } catch { return article.title; } })(),
    title: parsed.title,
    narration: parsed.narration,
    points: parsed.points,
    siteUrl: new URL(article.url).hostname,
    fullUrl: `${article.url}?utm_source=youtube&utm_medium=canvas&utm_campaign=${category}`,
    ctaText: `📖 記事を読む`,
    lang: 'ja',
    bgImageUrl: article.ogImage, // 記事OGP画像 → 背景に使用
  };
}

// ─── FALLBACK_CANVAS（Julesにより削除→復元 2026-05-10）─────────────────────
// RSS/Sitemap取得失敗時のスタティックプール（全カテゴリ用意）
export const FALLBACK_CANVAS: Record<string, CanvasItem> = {
  health: {
    topic: '科学的な健康習慣',
    title: '科学的に証明された健康習慣5選！',
    narration: '健康な体は積み上げた習慣から生まれます。運動・食事・睡眠の基本3つ揃えるだけで体質が変わります。詳しくは記事をチェック！',
    points: [
      '① 7時間の睡眠\n→ 記憶力と集中力の基礎',
      '② 食後の軽い運動\n→ 血糖値スパイクUP防止',
      '③ 1日8000歩目標\n→ 全身機能を自然に維持',
      '④ 水を1.5L以上\n→ 疲労回復と代謝に必須',
      '⑤ 就寝2時間前スマホ断ち\n→ 睡眠の質で翌日が変わる',
    ],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '💪 健康記事を読む',
    lang: 'ja',
  },
  job: {
    topic: '就活・転職で失敗しないための準備',
    title: '転職・就活で差がつく方法5選！',
    narration: '採用面接で評価されるのはスキルじゃなく「再現性のある経験の語り方」です。業界と企業によって刺さる人物像は全く違います。詳しくは記事をチェック！',
    points: [
      '① 自己分析は他者評価\n→ では気づかない強みを発見',
      '② 「転職理由は何割本音」\n→ なら 通過率の核心',
      '③ ガクチカは行動ファースト\n→ 行動の数字は3倍になる',
      '④ 逆質問を3つ用意\n→ 意欲最後のチャンス',
      '⑤ 企業研究は同時進行\n→ ライバルに差をつける',
    ],
    siteUrl: 'job.asoventure.jp',
    fullUrl: 'https://job.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 就活・転職記事を読む',
    lang: 'ja',
  },
  finance: {
    topic: '20代から始めるお金の基本',
    title: '20代でやるべき習慣5選！',
    narration: '20代でのお金の使い方を間違えると10年後に大きな差がつきます。まずNISAで毎月1万円の積み立てを始めること。これが最もカンタンで最も効果的な投資です。詳しくは記事をチェック！',
    points: [
      '① NISA口座開設\n→ 毎月1万円積立スタート',
      '② 固定費を毎月\n→ スマホだけで月3,000円削減',
      '③ 先取り貯金\n→ 給与振込日に自動で決まる',
      '④ ふるさと納税の活用\n→ 年収の20%がお得で返ってくる',
      '⑤ iDeCoで節税しながら貯蓄\n→ 最も賢い老後資産形成',
    ],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '💰 お金の記事を読む',
    lang: 'ja',
  },
  education: {
    topic: 'AIの最強学習法',
    title: 'AIを使った最強学習法5選！',
    narration: 'AIで勉強法は従来と大きく変わります。ChatGPTとGeminiを使えば、わからない内容も数秒で教えてもらえます。詳しくは記事をチェック！',
    points: [
      '① AIに問いかけてもらう\n→ アウトプットが記憶定着3倍',
      '② 25分集中×5回休憩\n→ ポモドーロで集中を維持',
      '③ 学んだことを声に出す\n→ 語る記憶力が大幅UP',
      '④ 寝る20分前に復習\n→ 睡眠中に記憶が定着',
      '⑤ 資格取得は経験\n→ 採用面接で武器になる',
    ],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📚 学習記事を読む',
    lang: 'ja',
  },
  life: {
    topic: '一人暮らしを快適にする生活術',
    title: '一人暮らしで快適に暮らす術5選！',
    narration: '一人暮らしは自由な反面、管理も全て自分。料理・掃除・収納3つの仕組み化だけで暮らしの質が激変します。詳しくは記事をチェック！',
    points: [
      '① まとめ食べで食費30%削減\n→ 週2時間で楽になる',
      '③ 起床時刻を固定する\n→ 活動力リズムUP',
      '③ 15分で掃除完了\n→ 5つの動線ルーティン',
      '④ 出費を3分類に分ける\n→ 固定・変動・貯蓄で管理',
      '⑤ 週1は外出必須\n→ 孤独防止とメンタル',
    ],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '🌱 暮らしの記事を読む',
    lang: 'ja',
  },
  music1963: {
    topic: '昭和の名曲と時代背景',
    title: '昭和の名曲5つの理由',
    narration: '昭和の流行歌には現代音楽にない魅力があります。シンプルなメロディと心に染みる歌詞が、時代を超えて愛され続ける秘密です。詳しくは記事をチェック！',
    points: [
      '① メロディが覚えやすい\n→ シンプルな進行が記憶に残る',
      '② あの時代の空気感\n→ 次世代にも伝わる',
      '③ 昭和・平成・ポップスの融合\n→ ジャンルを超えた影響力',
      '④ 歌詞と感情が一致\n→ 年齢問わず共感が起きる',
      '⑤ 昭和の情景と言葉の力\n→ 日本のものはずっと残る',
    ],
    siteUrl: 'music1963.com',
    fullUrl: 'https://music1963.com?utm_source=youtube&utm_medium=canvas',
    ctaText: '🎵 音楽記事を読む',
    lang: 'ja',
  },
};