// app/api/finance-canvas/route.ts
// 【オウンドメディア系 - 実記事ベース】
// finance.asoventure.jp の記事を取得 → AI要約 → Canvas動画 → 記事URLにリンク
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import { fetchLatestArticles, generateCanvasItemFromArticle } from '@/lib/articles';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💰 記事の詳細はリンクをご覧ください',
    '🔔 チャンネル登録でお金の知識を毎日お届け！',
    '👍 いいね & 🔔 チャンネル登録お願いします！',
    '#NISA #節約 #投資 #お金 #家計 #Shorts',
  ],
  tags: ['NISA', '節約', '投資', 'お金', '家計', '副業', 'Shorts', '資産形成'],
  ytCategoryId: '27',
};

const FALLBACK_ITEMS: CanvasItem[] = [
  {
    topic: '新NISAの始め方',
    title: '新NISAを今すぐ始めるべき理由と手順📈',
    narration: '2024年から始まった新NISAは年間360万円まで非課税で投資できます。一番の損は「始めないこと」。SBI証券か楽天証券で口座開設して月5000円から始めましょう。',
    points: ['① 年間360万円まで非課税\n→ 旧NISAの3倍の投資枠が使える', '② つみたて投資枠は月10万円\n→ 毎月自動で積み立て設定できる', '③ 全世界株式インデックスが初心者向け\n→ 世界中に自動分散でリスク管理不要', '④ 口座開設はSBI証券か楽天証券\n→ 手数料最安・UIが初心者に使いやすい', '⑤ 始めるのが早いほど複利が大きくなる\n→ 30年後の資産は20倍以上の差になることも'],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 NISA解説記事はこちら→',
    lang: 'ja',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const articles = await fetchLatestArticles('finance', 5);
    let item: CanvasItem;
    if (articles.length > 0) {
      const article = articles[Math.floor(Math.random() * Math.min(articles.length, 3))];
      item = await generateCanvasItemFromArticle(article, 'finance');
    } else {
      item = FALLBACK_ITEMS[Math.floor(Math.random() * FALLBACK_ITEMS.length)];
    }
    const result = await phaseCanvas('finance', item, CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
