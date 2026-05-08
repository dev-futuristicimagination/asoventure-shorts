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


// ── サイトから記事取得（RSS優先 → sitemap+スクレイプ）──────────────────────
export async function fetchLatestArticles(category: string, limit = 5): Promise<FetchedArticle[]> {
  const baseUrl = CATEGORY_SITE_MAP[category];
  if (!baseUrl) return [];

  // 1. RSS フィードを試みる
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
        console.log(`[Articles] RSS: ${items.length}件 from ${baseUrl}${path}`);
        return items;
      }
    } catch {
      continue;
    }
  }

  // 2. sitemap.xml + ページスクレイプ（RSSがない全サービス用）
  try {
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'AsoventureBot/1.0' },
    });
    if (sitemapRes.ok) {
      const xml = await sitemapRes.text();
      const urls = parseSitemapUrls(xml, baseUrl, limit);
      console.log(`[Articles] Sitemap: ${urls.length}件のURLを取得 from ${baseUrl}`);

      if (urls.length > 0) {
        // 上位3件のURLをスクレイプ（ogImageが取れるまで試みる）
        const results: FetchedArticle[] = [];
        for (const topUrl of urls.slice(0, 3)) {
          const { text: pageText, ogImage } = await scrapeArticlePage(topUrl);

          if (pageText) {
            const slug = topUrl.split('/').filter(Boolean).pop() || '';
            const guessedTitle = slug.replace(/-/g, ' ').replace(/\.[a-z]+$/, '');

            console.log(`[Articles] Scraped: ${topUrl} ${ogImage ? '+ OGP画像' : ''}`);
            results.push({
              title: guessedTitle,
              url: topUrl,
              excerpt: pageText.slice(0, 300),
              publishedAt: new Date().toISOString().split('T')[0],
              ogImage,
            });
          }
        }
        if (results.length > 0) return results;
      }
    }
  } catch (e) {
    console.warn(`[Articles] Sitemap fallback failed: ${e}`);
  }

  console.warn(`[Articles] 記事取得失敗 ${category} (${baseUrl})`);
  return [];
}

// ── 記事内容をGeminiで要約→CanvasItem生成 ────────────────────────────────
export async function generateCanvasItemFromArticle(
  article: FetchedArticle,
  category: string
): Promise<CanvasItem> {

  const prompt = `
以下の記事を元に、YouTube Shorts用のCanvas動画コンテンツを日本語で生成してください。

記事タイトル: ${article.title}
記事の内容（抜粋）: ${article.excerpt}
記事URL: ${article.url}
カテゴリ: ${category}

以下のJSON形式で出力してください（コードブロックや他のテキストは不要、JSONのみ）:
{
  "title": "動画タイトル（25文字以内・インパクトのある情報系タイトル・キャラ名不要）",
  "narration": "ナレーション（60〜80文字・記事の核心を語る・最後に「詳しくはリンクをご覧ください！」で終える）",
  "points": [
    "① ポイント名（10文字以内）\\n→ 補足説明（20文字以内）",
    "② ポイント名\\n→ 補足説明",
    "③ ポイント名\\n→ 補足説明",
    "④ ポイント名\\n→ 補足説明",
    "⑤ ポイント名\\n→ 補足説明"
  ]
}

条件:
- タイトルは「〇〇の方法N選」「〇〇より〇〇が重要な理由」「〇〇で失敗する人の共通点」形式が効果的
- 記事に書いていないことを宣伝しない
- 動画はあくまで記事の要約・予告として機能させる
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
    topic: article.title,
    title: parsed.title,
    narration: parsed.narration,
    points: parsed.points,
    siteUrl: new URL(article.url).hostname,
    fullUrl: `${article.url}?utm_source=youtube&utm_medium=canvas&utm_campaign=${category}`,
    ctaText: `📖 記事を読む→`,
    lang: 'ja',
    bgImageUrl: article.ogImage, // 記事OGP画像 → 動画背景に使用
  };
}

// ── フォールバック用スタティックプール（RSS/Sitemap取得失敗時）─────────────
// 全カテゴリに用意しておく
export const FALLBACK_CANVAS: Record<string, CanvasItem> = {
  health: {
    topic: '毎日続けられる健康習慣',
    title: '科学的に効果のある健康習慣5選',
    narration: '健康的な生活は積み重ねから始まります。睡眠・食事・運動の基本3つを少しずつ改善するだけで体調が変わります。詳しくはリンクをご覧ください！',
    points: [
      '① 毎日7時間の睡眠\n→ 免疫機能と集中力の基盤',
      '② 朝食を必ず食べる\n→ 代謝が上がり午前中の集中力UP',
      '③ 1日8000歩を目標\n→ 心肺機能と精神的健康の維持',
      '④ 水を1.5L以上飲む\n→ 代謝促進と疲労回復に必須',
      '⑤ 就寝1時間前スマホを閉じる\n→ 睡眠の質を守る最重要習慣',
    ],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 健康記事を読む→',
    lang: 'ja',
  },
  job: {
    topic: '就活・転職で失敗しないための準備',
    title: '転職・就活で差がつく準備の方法5選',
    narration: '採用面接で評価されるのはスキルより「再現性ある実績の語り方」です。自己分析と業界研究を先にやり終えた人が内定を取ります。詳しくはリンクをご覧ください！',
    points: [
      '① 自己分析は他者評価も聞く\n→ 自分では気づかない強みを発見',
      '② 志望動機は会社研究7割\n→ なぜここか が差別化の核心',
      '③ ガクチカは数字で語る\n→ 具体性が説得力を3倍にする',
      '④ 逆質問を3つ用意する\n→ 入社意欲を示す最後のチャンス',
      '⑤ 複数社を同時並行する\n→ 比較が年収交渉力を高める',
    ],
    siteUrl: 'job.asoventure.jp',
    fullUrl: 'https://job.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 就活・転職記事を読む→',
    lang: 'ja',
  },
  finance: {
    topic: '20代から始めるお金の基本',
    title: '20代でやるべきお金の習慣5選',
    narration: '20代でお金の使い方を間違えると10年後に大きな差がつきます。まずNISAで月1万円の投資を始めること。これが最も簡単で効果的な第一歩です。詳しくはリンクをご覧ください！',
    points: [
      '① NISA口座を今すぐ開く\n→ 月1万円から非課税投資',
      '② 固定費を毎月見直す\n→ スマホ代だけで月3,000円削減',
      '③ 先取り貯蓄を自動化\n→ 給料日に即振替で確実に貯まる',
      '④ ふるさと納税を活用\n→ 年収の20%が実質タダで返る',
      '⑤ iDeCoで節税しながら積立\n→ 所得税・住民税が即効で下がる',
    ],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 お金記事を読む→',
    lang: 'ja',
  },
  education: {
    topic: 'AI時代の最速学習法',
    title: 'AIを使った最速学習法5選',
    narration: 'AI時代の勉強法は従来と大きく変わりました。ChatGPTやGeminiを使えば、理解できない部分をすぐに解説してもらえます。詳しくはリンクをご覧ください！',
    points: [
      '① AIに問題を作ってもらう\n→ アウトプット中心で定着率3倍',
      '② 25分集中×5分休憩\n→ ポモドーロで集中力を維持',
      '③ 学んだことを声に出す\n→ 音読で記憶定着率が大幅UP',
      '④ 就寝前に復習する\n→ 睡眠中に記憶が長期保存される',
      '⑤ 資格より実績を作る\n→ 採用面接で評価されるのは経験',
    ],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 学習記事を読む→',
    lang: 'ja',
  },
  life: {
    topic: '一人暮らしを快適にする生活習慣',
    title: '一人暮らしを豊かにする習慣5選',
    narration: '一人暮らしは自由な反面、生活習慣が乱れやすい。食事・睡眠・掃除の3つを仕組み化するだけで毎日の質が変わります。詳しくはリンクをご覧ください！',
    points: [
      '① 作り置きで食費30%削減\n→ 週末2時間で平日が楽になる',
      '② 起床時間を固定する\n→ 体内時計が整い生産性UP',
      '③ 部屋を15分で整理する\n→ 朝5分×夜10分のルーティン化',
      '④ 支出を3つに分類する\n→ 固定費・変動費・投資で管理',
      '⑤ 週1回は外出する習慣\n→ 孤独感防止とメンタル安定',
    ],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 ライフ記事を読む→',
    lang: 'ja',
  },
  music1963: {
    topic: '昭和の名曲と時代背景',
    title: '昭和の名曲が今も愛される5つの理由',
    narration: '昭和の歌謡曲には現代の音楽にない温もりがあります。シンプルなメロディと心に刺さる歌詞が、世代を超えて愛される秘密です。詳しくはリンクをご覧ください！',
    points: [
      '① メロディが口ずさみやすい\n→ シンプルな進行が記憶に残る',
      '② 歌詞が日常の言葉\n→ 誰もが共感できる情景描写',
      '③ 演歌・歌謡・ポップスの融合\n→ ジャンルを超えた豊かさ',
      '④ 時代の記憶と結びつく\n→ 聴くたびに思い出が蘇る',
      '⑤ 歌唱力重視の文化\n→ 声そのものの魅力が際立つ',
    ],
    siteUrl: 'music1963.com',
    fullUrl: 'https://music1963.com?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 音楽記事を読む→',
    lang: 'ja',
  },
};
