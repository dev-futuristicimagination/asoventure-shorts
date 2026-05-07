// app/api/japan-canvas/route.ts — ジャパ狐 Japan記事要約 Canvas動画（多言語）
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🗾 Japan tips in 10 languages / 10言語で読める',
    '👇 Asoventure Japan',
    'https://japan.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=canvas_japan',
    '#Japan #JapanTravel #日本旅行 #日本 #VisitJapan #Shorts #일본 #日本観光',
  ],
  tags: ['Japan', 'JapanTravel', '日本旅行', 'VisitJapan', 'Shorts', 'Travel', '日本', 'Tokyo'],
  ytCategoryId: '19',
};

const CANVAS_POOLS: CanvasItem[] = [
  // 英語
  {
    topic: 'Japan travel essentials',
    title: '3 things to know before visiting Japan 🗾',
    narration: 'Three things you must know before visiting Japan. Get a Suica IC card for all transport, carry cash because many places are cash only, and download Google Maps offline before you arrive.',
    points: ['Get Suica IC card for transport', 'Always carry cash (¥5,000+)', 'Download offline Google Maps'],
    siteUrl: 'japan.asoventure.jp',
    fullUrl: 'https://japan.asoventure.jp?utm_source=yt_canvas&utm_campaign=travel_essentials',
    ctaText: '📖 Full Japan travel guide →',
    lang: 'en',
  },
  {
    topic: 'Japan budget tips',
    title: 'How to save money in Japan: 3 budget tips 💴',
    narration: 'Three ways to save money while traveling Japan. Eat at convenience stores for great cheap meals, use overnight buses instead of Shinkansen, and look for 100-yen shops for souvenirs.',
    points: ['Konbini meals are cheap and great', 'Night bus = fraction of Shinkansen', '100-yen shops for souvenirs'],
    siteUrl: 'japan.asoventure.jp',
    fullUrl: 'https://japan.asoventure.jp?utm_source=yt_canvas&utm_campaign=budget_tips',
    ctaText: '📖 Japan budget guide →',
    lang: 'en',
  },
  // 日本語
  {
    topic: '外国人に人気のスポット3選',
    title: '外国人観光客に大人気！日本のスポット3選⛩️',
    narration: '外国人観光客に本当に人気がある日本のスポットを3つ紹介します。伏見稲荷大社の朱い鳥居、渋谷のスクランブル交差点、奈良の鹿と大仏。どれもインスタ映え抜群です。',
    points: ['伏見稲荷：朱い鳥居が圧巻', '渋谷スクランブル：世界最大の交差点', '奈良：鹿と大仏のふれあい'],
    siteUrl: 'japan.asoventure.jp',
    fullUrl: 'https://japan.asoventure.jp?utm_source=yt_canvas&utm_campaign=popular_spots',
    ctaText: '📖 観光スポット記事はこちら→',
    lang: 'ja',
  },
  {
    topic: 'インバウンド対応の基本3つ',
    title: '外国人客を受け入れるための基本対応3つ🌍',
    narration: '外国人観光客を受け入れるための基本対応を3つ教えます。Googleビジネスプロフィールを英語で登録する、キャッシュレス決済に対応する、メニューに写真をつける。これだけで選ばれる確率が大きく変わります。',
    points: ['Googleビジネスを英語登録', 'キャッシュレス決済を導入', 'メニューに写真・英語表記'],
    siteUrl: 'japan.asoventure.jp',
    fullUrl: 'https://japan.asoventure.jp?utm_source=yt_canvas&utm_campaign=inbound_basic',
    ctaText: '📖 インバウンド対策記事→',
    lang: 'ja',
  },
  // 韓国語
  {
    topic: '일본 여행 필수 앱',
    title: '일본 여행 전 필수 앱 3가지 📱',
    narration: '일본 여행 전에 꼭 설치해야 할 앱 3가지를 소개합니다. 구글 맵스 오프라인 저장, 구글 번역기, 그리고 일본 철도 앱 재팬 오피셜 트래블 앱. 이 3가지면 일본 여행 완벽!',
    points: ['구글맵스 오프라인 저장', '구글 번역기 설치', '재팬 공식 트래블 앱 필수'],
    siteUrl: 'japan.asoventure.jp',
    fullUrl: 'https://japan.asoventure.jp?utm_source=yt_canvas&utm_campaign=travel_apps_kr',
    ctaText: '📖 일본 여행 가이드 →',
    lang: 'ja',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const result = await phaseCanvas('japan', CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)], CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
