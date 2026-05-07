// app/api/japan-canvas/route.ts — ジャパ狐 Japan記事要約 Canvas動画（多言語リッチ版）
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🗾 Japan tips in 10 languages / 10言語で読める',
    '👇 Asoventure Japan',
    'https://japan.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=canvas_japan',
    '#Japan #JapanTravel #日本旅行 #VisitJapan #Shorts',
  ],
  tags: ['Japan', 'JapanTravel', '日本旅行', 'VisitJapan', 'Shorts', 'Travel', '日本', 'Tokyo'],
  ytCategoryId: '19',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: '外国人が日本で驚くこと5選',
    title: '外国人が初めて日本に来て驚く5つのこと🗾',
    narration: '外国人観光客が日本に来て最も驚くことをリサーチしました。コンビニのクオリティ、電車の正確さ、街の清潔さ、人々の親切さ、そしてトイレの多機能さが上位に挙がっています。観光業に関わる方は外国人がどんな価値に感動するかを知ることがインバウンド対策の第一歩です。詳しい記事はjapan.asoventure.jpでご覧いただけます。',
    points: [
      '① コンビニのクオリティが世界最高\n→ 食品・ATM・印刷まで何でもできる24時間店舗',
      '② 電車が秒単位で正確に来る\n→ 遅延3分でアナウンスが流れる精度に外国人は驚愕',
      '③ 街がとにかくきれい\n→ ゴミ箱がないのになぜゴミが落ちていないのか',
      '④ 見知らぬ人が親切に助けてくれる\n→ 迷子になっても誰かが必ず助けてくれる安心感',
      '⑤ トイレが多機能で清潔\n→ ウォシュレット・暖房便座・消音機能が当たり前',
    ],
    siteUrl: 'japan.asoventure.jp',
    fullUrl: 'https://japan.asoventure.jp?utm_source=yt_canvas&utm_campaign=surprising_japan',
    ctaText: '📖 詳しい記事はこちら→',
    lang: 'ja',
  },
  {
    topic: '5 things tourists must know before visiting Japan',
    title: '5 essential things to know before visiting Japan 🇯🇵',
    narration: 'Before you visit Japan, there are five things that will make your trip much smoother. Japan is one of the most rewarding travel destinations in the world, but preparation makes all the difference. Getting a Suica IC card saves you from buying tickets every time. Carrying cash is essential because many local restaurants and smaller shops do not accept cards. Learning a few basic Japanese phrases goes a long way with locals. Understanding onsen etiquette means you can enjoy hot spring baths without awkward moments. Finally, downloading offline maps before you land is crucial since data plans can be expensive.',
    points: [
      '① Get a Suica IC card on arrival\n→ Works on trains, buses, and even convenience stores',
      '② Always carry cash (min. 5,000 yen)\n→ Many local spots are still cash-only in Japan',
      '③ Learn 5 basic Japanese phrases\n→ Locals appreciate even minimal effort at Japanese',
      '④ Know onsen etiquette before you go\n→ Shower first, no swimwear, no phones inside',
      '⑤ Download Google Maps offline at the airport\n→ Japan WiFi is not always free outside cities',
    ],
    siteUrl: 'japan.asoventure.jp',
    fullUrl: 'https://japan.asoventure.jp?utm_source=yt_canvas&utm_campaign=japan_travel_tips',
    ctaText: '📖 Full Japan travel guide →',
    lang: 'en',
  },
  {
    topic: 'インバウンド対応の基本5ステップ',
    title: '外国人客に選ばれる店の基本対応5ステップ🌍',
    narration: '2025年の訪日外国人は過去最高水準を更新しています。この機会を逃さないために、今日は外国人客に選ばれる店になるための基本対応5ステップを紹介します。Googleビジネスプロフィールを英語で登録すること、キャッシュレス決済への対応、英語メニューの準備、スタッフの簡単な英語フレーズの習得、そしてInstagramやGoogleへのレビューへの返信。これらは大きなコストなく今日から始められる施策です。',
    points: [
      '① Googleビジネスを英語で登録\n→ 外国人はGoogleマップで検索して店を選ぶ',
      '② キャッシュレス決済を必ず導入\n→ 外国人はVisaとMastercardのクレカが必須',
      '③ 写真付き英語メニューを用意\n→ 言語の壁を写真で解消。注文ミスもなくなる',
      '④ スタッフが使える英語10フレーズ\n→ これだけで外国人への対応が劇的に改善する',
      '⑤ Googleレビューへの返信を習慣化\n→ 返信率が高い店は検索結果で上位に表示される',
    ],
    siteUrl: 'japan.asoventure.jp',
    fullUrl: 'https://japan.asoventure.jp?utm_source=yt_canvas&utm_campaign=inbound_steps',
    ctaText: '📖 インバウンド対策ガイドはこちら→',
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
