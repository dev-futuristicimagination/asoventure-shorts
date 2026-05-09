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
