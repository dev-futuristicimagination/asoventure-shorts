// app/api/life-canvas/route.ts
// 【オウンドメディア系 - 実記事ベース】
// life.asoventure.jp の記事を取得 → AI要約 → Canvas動画
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import { fetchLatestArticles, generateCanvasItemFromArticle } from '@/lib/articles';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🌱 記事の詳細はリンクをご覧ください',
    '🔔 チャンネル登録で暮らしのヒントをお届け！',
    '👍 いいね & 🔔 チャンネル登録お願いします！',
    '#節約 #一人暮らし #生活術 #時短 #Shorts',
  ],
  tags: ['節約', '一人暮らし', '生活術', '時短', '家事', '暮らし', 'Shorts'],
  ytCategoryId: '26',
};

const FALLBACK_ITEMS: CanvasItem[] = [
  {
    topic: '一人暮らしの食費節約',
    title: '一人暮らしで食費月1万円を実現する5ルール🛒',
    narration: '食費節約で最も効果的なのは週1回のまとめ買いとコンビニ断ちです。1日500円の節約でも月1.5万円変わります。記事で具体的なレシピと購入リストを紹介しています。',
    points: ['① 週1回のまとめ買いを徹底\n→ 毎日買い物は割高・衝動買いのリスク', '② コンビニ立ち寄りをゼロにする\n→ 1回500円×週5=月1万円の差', '③ 冷凍を活用して食材を無駄にしない\n→ 食材ロスが食費の20〜30%を占める', '④ 食材の使い切りメニューを計画する\n→ 週の献立を決めると無駄買いがなくなる', '⑤ 外食は月4回まで予算を決める\n→ 予算内での外食は楽しみとして継続可能'],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 節約レシピ記事はこちら→',
    lang: 'ja',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const articles = await fetchLatestArticles('life', 5);
    let item: CanvasItem;
    if (articles.length > 0) {
      const article = articles[Math.floor(Math.random() * Math.min(articles.length, 3))];
      item = await generateCanvasItemFromArticle(article, 'life');
    } else {
      item = FALLBACK_ITEMS[Math.floor(Math.random() * FALLBACK_ITEMS.length)];
    }
    const result = await phaseCanvas('life', item, CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
