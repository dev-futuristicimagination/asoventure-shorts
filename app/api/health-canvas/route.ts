// app/api/health-canvas/route.ts
// 【2026-05-07 設計修正】実記事ベース生成
// health.asoventure.jp の実際の記事を取得 → AI要約 → Canvas動画
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import { fetchLatestArticles, generateCanvasItemFromArticle } from '@/lib/articles';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💚 記事の詳細はリンクをご覧ください',
    '🔔 チャンネル登録で毎日健康情報をお届け！',
    '👍 いいね & 🔔 チャンネル登録お願いします！',
    '#健康 #健康習慣 #ダイエット #睡眠 #Shorts',
  ],
  tags: ['健康', '健康習慣', 'ダイエット', '睡眠', '栄養', 'Shorts', '免疫力'],
  ytCategoryId: '26',
};

const FALLBACK_ITEMS: CanvasItem[] = [
  {
    topic: '睡眠の質を高める方法',
    title: '睡眠の質を劇的に改善する5つの習慣💤',
    narration: '睡眠は量だけでなく質が重要です。就寝前のスマホ使用、カフェイン、室温の管理が睡眠の質を大きく左右します。科学的に証明された改善習慣を紹介します。',
    points: ['① 就寝1時間前にスマホオフ\n→ ブルーライトがメラトニン分泌を阻害する', '② 寝室の温度は18〜20℃に\n→ 深部体温の低下が入眠を促す', '③ 毎日同じ時間に起床する\n→ 体内時計のリズムを固定する', '④ 就寝前のカフェインを避ける\n→ 半減期が6時間あるため午後3時以降は注意', '⑤ 起床後すぐに太陽光を浴びる\n→ セロトニン分泌で体内時計をリセット'],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 詳しい健康記事はこちら→',
    lang: 'ja',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });

  try {
    const articles = await fetchLatestArticles('health', 5);
    let item: CanvasItem;

    if (articles.length > 0) {
      const article = articles[Math.floor(Math.random() * Math.min(articles.length, 3))];
      item = await generateCanvasItemFromArticle(article, 'health');
    } else {
      console.warn('[health-canvas] RSS取得失敗 → フォールバック使用');
      item = FALLBACK_ITEMS[Math.floor(Math.random() * FALLBACK_ITEMS.length)];
    }

    const result = await phaseCanvas('health', item, CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
