// app/api/life-canvas/route.ts — ライかえ 暮らしtips Canvas動画
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🌱 暮らし・節約・生活術の記事はこちら',
    '👇 Asoventure Life',
    'https://life.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=canvas_life',
    '#節約 #一人暮らし #時間管理 #家事 #Shorts #生活術',
  ],
  tags: ['節約', '一人暮らし', '時間管理', '家事', '料理', '暮らし', 'Shorts', '生活術'],
  ytCategoryId: '26',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: '食費節約3原則',
    title: '食費を月1万円以下にする3原則🛒',
    narration: '食費を月1万円以下にする3原則。週1まとめ買い、冷凍食品の活用、外食は週1回まで。この3つだけで食費が大きく変わります。',
    points: ['週1まとめ買いで無駄を減らす', '冷凍食品を賢く活用', '外食は週1回以内に'],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=yt_canvas&utm_campaign=food_budget',
    ctaText: '📖 節約記事はこちら→',
  },
  {
    topic: '掃除習慣化3選',
    title: '部屋がきれいな人の掃除習慣3選🧹',
    narration: '部屋が常にきれいな人の掃除習慣を3つ紹介します。出したらすぐ片付ける、毎日5分掃除する、掃除道具を使う場所の近くに置く。',
    points: ['出したものはすぐ元の場所に', '毎日5分だけ掃除タイム', '掃除道具は使う場所の近くに'],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=yt_canvas&utm_campaign=cleaning',
    ctaText: '📖 掃除習慣化記事はこちら→',
  },
  {
    topic: '時短料理テクニック',
    title: '料理時間を半分にする時短テクニック3選🍳',
    narration: '料理時間を半分にする3つのテクニック。食材の下ごしらえをまとめる、電子レンジを最大活用する、週末に作り置きを3品作る。',
    points: ['下ごしらえは週1まとめて', '電子レンジ調理を活用', '週末に作り置き3品'],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=yt_canvas&utm_campaign=cooking',
    ctaText: '📖 時短料理記事はこちら→',
  },
  {
    topic: '朝活の始め方',
    title: '朝30分早起きで変わる！朝活の始め方☀️',
    narration: '朝活を始めるための3ステップ。就寝を30分早める、朝のタスクを前夜に決める、最初の1週間は15分から始める。',
    points: ['就寝を30分早めることから', 'やることは前夜に決める', '最初は15分から無理なく'],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=yt_canvas&utm_campaign=morning',
    ctaText: '📖 朝活習慣記事はこちら→',
  },
  {
    topic: 'サブスク整理術',
    title: 'サブスク整理で月5000円節約する3ステップ📱',
    narration: 'サブスクを整理して月5000円節約する方法。全サブスクをリストアップ、3ヶ月未使用は即解約、使うものは年払いで割引を受ける。',
    points: ['まず全サブスクをリスト化', '3ヶ月未使用は即解約', '使うものは年払いに変更'],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=yt_canvas&utm_campaign=subscription',
    ctaText: '📖 固定費削減記事はこちら→',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const result = await phaseCanvas('life', CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)], CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
