// app/api/article-pipeline/route.ts
// 【役割】記事RSS → X（Twitter）投稿 の自動化パイプライン
// 【設計判断 2026-05-07】Canvas生成は09:xxのcronが担当。
//   このrouteはX投稿のみに特化（記事URLを含む本格的なX投稿）
//
// フロー:
//   1. RSS/SitemapからカテゴリのLatest記事を取得
//   2. GeminiでX投稿文を生成（フォロー誘導・RT誘導・記事URL付き）
//   3. Buffer API でX自動投稿
//   4. Discord に結果通知
//
// Cron: 毎日 JST 10:00〜10:25（UTC 01:00〜01:25）← vercel.jsonで設定
// Auth: Authorization: Bearer {CRON_SECRET}

import { NextResponse } from 'next/server';
import { fetchLatestArticles } from '@/lib/articles';
import { generateXPost, notifyDiscord } from '@/lib/gemini';
import { postArticleToBuffer } from '@/lib/youtube';

export async function GET(req: Request) {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const category = new URL(req.url).searchParams.get('category') || 'health';

  try {
    // ─── STEP 1: 最新記事をRSSから取得 ─────────────────────────────
    const articles = await fetchLatestArticles(category, 3);
    if (!articles.length) {
      await notifyDiscord(`[article-pipeline] ${category}: RSS記事なし → スキップ`);
      return NextResponse.json({ ok: false, error: 'No articles found', category });
    }
    const article = articles[0];

    // ─── STEP 2: X投稿文生成 ─────────────────────────────────────────
    const xPostText = await generateXPost(article, category);

    // ─── STEP 3: Buffer API でX自動投稿 ─────────────────────────────
    const xPosted = await postArticleToBuffer(xPostText);

    // ─── STEP 4: Discord通知 ─────────────────────────────────────────
    const msg = [
      `[article-pipeline] ${category}`,
      `📰 ${article.title}`,
      `🐦 X投稿: ${xPosted ? '✅成功' : '❌失敗（Buffer token確認）'}`,
      `🔗 ${article.url}`,
    ].join('\n');
    await notifyDiscord(msg);

    return NextResponse.json({ ok: true, category, article: { title: article.title, url: article.url }, xPosted });

  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await notifyDiscord(`[article-pipeline] ${category} エラー: ${errMsg}`);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
