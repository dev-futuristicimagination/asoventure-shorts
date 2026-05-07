// app/api/article-pipeline/route.ts
// 【2026-05-07 実装】記事自動生成 → X投稿 → Canvas Short の一気通貫パイプライン
// フロー:
//   1. RSS/SitemapからそのカテゴリのLatest記事を取得
//   2. Geminiで X投稿文を生成 → Buffer API でX自動投稿
//   3. Geminiで Canvas動画スクリプト生成 → /{category}-canvas に内部リクエスト
//   4. Discord に結果通知
//
// Cron: 毎日 JST 9:00〜10:00 (各カテゴリ時差あり) ← vercel.json で設定
// Auth: Authorization: Bearer {CRON_SECRET}

import { NextResponse } from 'next/server';
import { fetchLatestArticles, generateCanvasItemFromArticle } from '@/lib/articles';
import { generateXPost, notifyDiscord } from '@/lib/gemini';
import { postArticleToBuffer } from '@/lib/youtube';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asoventure-shorts.vercel.app';

export async function GET(req: Request) {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const category = new URL(req.url).searchParams.get('category') || 'health';
  const results: Record<string, unknown> = { category };

  try {
    // ─── STEP 1: 最新記事をRSSから取得 ─────────────────────────────
    const articles = await fetchLatestArticles(category, 3);
    if (!articles.length) {
      return NextResponse.json({ ok: false, error: 'No articles found', category });
    }

    // 最新記事（または未投稿記事）を選択
    const article = articles[0];
    results.article = { title: article.title, url: article.url };

    // ─── STEP 2: X投稿文生成 → Buffer API ───────────────────────────
    const xPostText = await generateXPost(article, category);
    results.xPostText = xPostText;

    const xPosted = await postArticleToBuffer(xPostText);
    results.xPosted = xPosted;

    // ─── STEP 3: Canvas動画スクリプト生成 ────────────────────────────
    const canvasItem = await generateCanvasItemFromArticle(article, category);
    results.canvasTitle = canvasItem.title;

    // Canvas生成APIに内部リクエスト（canvas routeが動画生成+YouTube投稿を行う）
    // CanvasItemをbodyで渡す形式（各canvas routeがサポートしていれば）
    const canvasUrl = `${BASE_URL}/api/${category}-canvas`;
    let canvasTriggered = false;
    try {
      const canvasRes = await fetch(canvasUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          'X-Article-Override': JSON.stringify(canvasItem), // canvas routeが対応していれば使用
        },
        signal: AbortSignal.timeout(25000), // 25s timeout (Vercel limit)
      });
      canvasTriggered = canvasRes.ok;
      results.canvasStatus = canvasRes.status;
    } catch {
      // canvas routeが存在しないカテゴリ or タイムアウト → スキップ
      canvasTriggered = false;
      results.canvasStatus = 'skipped';
    }
    results.canvasTriggered = canvasTriggered;

    // ─── STEP 4: Discord通知 ─────────────────────────────────────────
    const msg = [
      `[article-pipeline] ${category} 完了`,
      `📰 記事: ${article.title}`,
      `🐦 X投稿: ${xPosted ? '✅成功' : '❌失敗'}`,
      `🎬 Canvas: ${canvasTriggered ? '✅起動' : '⏭️スキップ'}`,
      `🔗 ${article.url}`,
    ].join('\n');
    await notifyDiscord(msg);

    return NextResponse.json({ ok: true, ...results });

  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await notifyDiscord(`[article-pipeline] ${category} エラー: ${errMsg}`);
    return NextResponse.json({ ok: false, error: errMsg, ...results }, { status: 500 });
  }
}
