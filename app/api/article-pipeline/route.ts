// app/api/article-pipeline/route.ts
// 【役割】記事RSS → X投稿 + Canvas動画生成 → YouTube投稿 の完全自動化パイプライン
// 【2026-05-08 プロデューサー判断により拡張】
//
// 旧フロー:
//   RSS取得 → X投稿
//
// 新フロー（3段ファネル完成）:
//   RSS取得 → [X投稿] → [記事要約Canvas動画 → YouTube投稿]
//   Shorts動画の概要欄に記事URLを入れることで:
//   Shorts（新規流入） → 記事（SEO強化） → Cheese LINE（CV）
//
// Cron: 毎日 JST 10:00〜10:25（UTC 01:00〜01:25）← vercel.jsonで設定
// Auth: Authorization: Bearer {CRON_SECRET}

import { NextResponse } from 'next/server';
import { fetchLatestArticles, generateCanvasItemFromArticle, FALLBACK_CANVAS } from '@/lib/articles';
import { generateXPost, notifyDiscord } from '@/lib/gemini';
import { postArticleToBuffer } from '@/lib/youtube';
import { phaseCanvas } from '@/lib/pipeline';
import type { CtaConfig } from '@/lib/types';

// ── カテゴリ別 CTA 設定 ──────────────────────────────────────────────────
// 記事要約動画は「続きを記事で読む」→「Cheese LINEへ」の2段構成
const CATEGORY_CTA: Record<string, CtaConfig> = {
  job: {
    block: [
      '━━━━━━━━━━━━━━━━━━━━',
      '📖 記事の全文はこちら↓',
      'https://job.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=article_job',
      '',
      '✅ AIが就活・転職をサポート！',
      '🧀 Cheese 無料LINE登録',
      'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=article_job_line',
      '',
      '#就活 #転職 #キャリア #仕事術 #Shorts',
    ],
    tags: ['就活', '転職', 'キャリア', '仕事術', 'Shorts', 'AI', '内定'],
    ytCategoryId: '27',
  },
  health: {
    block: [
      '━━━━━━━━━━━━━━━━━━━━',
      '📖 記事の全文はこちら↓',
      'https://health.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=article_health',
      '',
      '🧀 就活・キャリアの悩みはAIに相談！',
      'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=article_health_line',
      '',
      '#健康 #睡眠 #メンタルヘルス #生産性 #Shorts',
    ],
    tags: ['健康', '睡眠', 'メンタルヘルス', '生産性', 'Shorts', '免疫', '習慣'],
    ytCategoryId: '26',
  },
  finance: {
    block: [
      '━━━━━━━━━━━━━━━━━━━━',
      '📖 記事の全文はこちら↓',
      'https://finance.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=article_finance',
      '',
      '💰 収入アップ・副業の相談はAIに！',
      '🧀 Cheese 無料LINE登録',
      'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=article_finance_line',
      '',
      '#お金 #節約 #NISA #副業 #投資 #Shorts',
    ],
    tags: ['お金', '節約', 'NISA', '副業', '投資', 'Shorts', '家計'],
    ytCategoryId: '27',
  },
  education: {
    block: [
      '━━━━━━━━━━━━━━━━━━━━',
      '📖 記事の全文はこちら↓',
      'https://education.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=article_edu',
      '',
      '🧀 学習・スキルアップの相談はAIに！',
      'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=article_edu_line',
      '',
      '#勉強法 #スキルアップ #資格 #学習 #Shorts',
    ],
    tags: ['勉強法', 'スキルアップ', '資格', '学習', 'Shorts', 'AI学習'],
    ytCategoryId: '27',
  },
  life: {
    block: [
      '━━━━━━━━━━━━━━━━━━━━',
      '📖 記事の全文はこちら↓',
      'https://life.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=article_life',
      '',
      '🧀 ライフスタイルの相談はAIに！',
      'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=article_life_line',
      '',
      '#ライフスタイル #暮らし #生活 #Shorts',
    ],
    tags: ['ライフスタイル', '暮らし', '生活', 'Shorts', '一人暮らし'],
    ytCategoryId: '22',
  },
  music1963: {
    block: [
      '━━━━━━━━━━━━━━━━━━━━',
      '📖 記事の全文はこちら↓',
      'https://music1963.com?utm_source=youtube&utm_medium=shorts&utm_campaign=article_music',
      '',
      '#音楽 #昭和 #歌謡曲 #Shorts',
    ],
    tags: ['音楽', '昭和', '歌謡曲', '懐メロ', 'Shorts'],
    ytCategoryId: '10',
  },
};

// デフォルトCTA（上記に含まれないカテゴリ用）
const DEFAULT_CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '📖 記事の全文はこちら↓',
    'https://job.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=article',
    '',
    '🧀 Cheese 無料LINE登録',
    'https://lin.ee/8VAVNEk',
    '',
    '#Shorts',
  ],
  tags: ['Shorts', 'アソベンチャー'],
  ytCategoryId: '27',
};

export async function GET(req: Request) {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const category = new URL(req.url).searchParams.get('category') || 'health';
  const cta = CATEGORY_CTA[category] ?? DEFAULT_CTA;

  // 結果サマリ（Discord通知用）
  const results: { step: string; status: '✅' | '❌' | '⚠️'; detail: string }[] = [];

  try {
    // ────────────────────────────────────────────────────────────────
    // STEP 1: 最新記事を RSS から取得
    // ────────────────────────────────────────────────────────────────
    const articles = await fetchLatestArticles(category, 3);

    if (!articles.length) {
      await notifyDiscord(`[article-pipeline] ${category}: RSS記事なし → フォールバック使用`);
      results.push({ step: 'RSS取得', status: '⚠️', detail: '記事なし・フォールバック使用' });
    } else {
      results.push({ step: 'RSS取得', status: '✅', detail: `${articles[0].title}` });
    }

    const article = articles[0] ?? null;

    // ────────────────────────────────────────────────────────────────
    // STEP 2: X投稿文生成 → Buffer投稿
    // ────────────────────────────────────────────────────────────────
    let xPosted = false;
    if (article) {
      try {
        const xPostText = await generateXPost(article, category);
        xPosted = await postArticleToBuffer(xPostText);
        results.push({ step: 'X投稿', status: xPosted ? '✅' : '❌', detail: xPosted ? '成功' : 'Buffer token確認' });
      } catch (e) {
        results.push({ step: 'X投稿', status: '❌', detail: String(e) });
      }
    }

    // ────────────────────────────────────────────────────────────────
    // STEP 3: 記事 → Canvas動画生成 → YouTube投稿
    // 【3段ファネルの核心】
    //   Shorts動画: 記事の要約（30〜60秒）
    //   概要欄: 記事URL（クリック誘導）→ Cheese LINE（CV）
    // ────────────────────────────────────────────────────────────────
    let canvasResult: { ok: boolean; message: string; youtubeUrl?: string } = {
      ok: false, message: '未実行'
    };

    try {
      let canvasItem;

      if (article) {
        // 記事が取得できた場合: 記事内容からCanvas動画を生成（本命ルート）
        canvasItem = await generateCanvasItemFromArticle(article, category);
        results.push({ step: 'Canvas変換', status: '✅', detail: `タイトル: ${canvasItem.title}` });
      } else {
        // RSS失敗時: フォールバックCanvasを使用
        const fallback = FALLBACK_CANVAS[category];
        if (!fallback) {
          results.push({ step: 'Canvas変換', status: '⚠️', detail: 'フォールバックなし → スキップ' });
          throw new Error('no fallback canvas');
        }
        canvasItem = fallback;
        results.push({ step: 'Canvas変換', status: '⚠️', detail: 'フォールバック使用' });
      }

      // Canvas動画生成 + YouTube投稿
      canvasResult = await phaseCanvas(category, canvasItem, cta);
      results.push({
        step: 'YouTube投稿',
        status: canvasResult.ok ? '✅' : '❌',
        detail: canvasResult.youtubeUrl ?? canvasResult.message,
      });

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg !== 'no fallback canvas') {
        results.push({ step: 'YouTube投稿', status: '❌', detail: errMsg });
      }
    }

    // ────────────────────────────────────────────────────────────────
    // STEP 4: Discord通知（全ステップのサマリ）
    // ────────────────────────────────────────────────────────────────
    const summary = results.map(r => `  ${r.status} ${r.step}: ${r.detail}`).join('\n');
    const discordMsg = [
      `[article-pipeline] 📰 ${category} — ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
      article ? `📄 ${article.url}` : '📄 記事なし',
      summary,
      canvasResult.youtubeUrl ? `🎬 ${canvasResult.youtubeUrl}` : '',
    ].filter(Boolean).join('\n');

    await notifyDiscord(discordMsg);

    return NextResponse.json({
      ok: true,
      category,
      article: article ? { title: article.title, url: article.url } : null,
      xPosted,
      canvas: {
        ok: canvasResult.ok,
        youtubeUrl: canvasResult.youtubeUrl,
      },
      steps: results,
    });

  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await notifyDiscord(`[article-pipeline] ${category} 致命的エラー: ${errMsg}`);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
