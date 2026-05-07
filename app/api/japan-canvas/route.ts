// app/api/japan-canvas/route.ts
// 【オウンドメディア系 - 実記事ベース】
// japan.asoventure.jp の記事を取得 → AI要約 → Canvas動画（多言語対応）
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import { fetchLatestArticles, generateCanvasItemFromArticle } from '@/lib/articles';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🗾 Read the full article at the link below',
    '🔔 Subscribe for daily Japan tips!',
    '👍 Like & 🔔 Subscribe please!',
    '#Japan #JapanTravel #VisitJapan #日本 #Shorts',
  ],
  tags: ['Japan', 'JapanTravel', 'VisitJapan', '日本旅行', 'Tokyo', 'Shorts'],
  ytCategoryId: '19',
};

const FALLBACK_ITEMS: CanvasItem[] = [
  {
    topic: 'Japan travel essentials',
    title: '5 things to know before visiting Japan 🇯🇵',
    narration: 'Japan is one of the most rewarding destinations in the world. Before you go, get a Suica card, carry cash, and learn a few Japanese phrases. The full guide is in the article linked below.',
    points: ['① Get a Suica IC card on arrival\n→ Works on trains, buses, convenience stores', '② Always carry cash (5,000+ yen)\n→ Many local spots are still cash only', '③ Learn 5 basic Japanese phrases\n→ Locals deeply appreciate even minimal effort', '④ Know onsen etiquette before you go\n→ Shower first, no swimwear, no phones inside', '⑤ Download offline maps at the airport\n→ Data roaming can be expensive in Japan'],
    siteUrl: 'japan.asoventure.jp',
    fullUrl: 'https://japan.asoventure.jp?utm_source=youtube&utm_medium=canvas',
    ctaText: '📖 Full Japan guide →',
    lang: 'en',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const articles = await fetchLatestArticles('japan', 5);
    let item: CanvasItem;
    if (articles.length > 0) {
      const article = articles[Math.floor(Math.random() * Math.min(articles.length, 3))];
      item = await generateCanvasItemFromArticle(article, 'japan');
    } else {
      item = FALLBACK_ITEMS[Math.floor(Math.random() * FALLBACK_ITEMS.length)];
    }
    const result = await phaseCanvas('japan', item, CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
