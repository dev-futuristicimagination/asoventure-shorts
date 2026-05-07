// app/api/education-canvas/route.ts
// 【2026-05-07 設計修正】実記事ベース生成
// education.asoventure.jp の実際の記事を取得 → AI要約 → Canvas動画
// CTAは実際の記事URLにリンク（整合性100%・うその宣言なし）
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import { fetchLatestArticles, generateCanvasItemFromArticle } from '@/lib/articles';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '📚 記事の詳細はリンクをご覧ください',
    '🔔 チャンネル登録で毎日学習のヒントをお届け！',
    '👍 いいね & 🔔 チャンネル登録お願いします！',
    '#勉強法 #学習 #スキルアップ #Shorts',
  ],
  tags: ['勉強法', '英語学習', 'TOEIC', '資格', 'スキルアップ', 'Shorts', '学習'],
  ytCategoryId: '27',
};

// フォールバック用（RSS取得失敗時のみ使用）
const FALLBACK_ITEMS: CanvasItem[] = [
  {
    topic: '効率的な学習習慣',
    title: '科学的に効率のいい勉強法5選🧠',
    narration: '記憶の定着に最も重要なのは復習のタイミングです。学習直後・翌日・1週間後・1ヶ月後の4回の復習で長期記憶に移行します。詳しい学習法は記事をご覧ください。',
    points: ['① 学習直後に必ず復習\n→ 忘却曲線の最初の落下を防ぐ', '② 翌日・1週間後に再復習\n→ 定着率が3倍になる', '③ 単語は例文で覚える\n→ 文脈記憶は単語帳の3倍定着する', '④ 詰まったら15分で見切る\n→ 考え込む時間は学習効率を下げる', '⑤ 毎日30分の継続\n→ 週1回3時間より効果が高い'],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 詳しい学習法はこちら→',
    lang: 'ja',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });

  try {
    // ① 実際の記事を取得（education.asoventure.jp のRSS）
    const articles = await fetchLatestArticles('education', 5);
    let item: CanvasItem;

    if (articles.length > 0) {
      // ② 最新3記事からランダムに選んでAI要約
      const article = articles[Math.floor(Math.random() * Math.min(articles.length, 3))];
      item = await generateCanvasItemFromArticle(article, 'education');
    } else {
      // ③ RSS失敗時フォールバック
      console.warn('[education-canvas] RSS取得失敗 → フォールバック使用');
      item = FALLBACK_ITEMS[Math.floor(Math.random() * FALLBACK_ITEMS.length)];
    }

    const result = await phaseCanvas('education', item, CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
