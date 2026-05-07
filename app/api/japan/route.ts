// app/api/japan/route.ts — ジャパ狐（キツネ♀・英語/日本語ミックス）インバウンドJapan Shorts
// 【戦略】
// ✅ ターゲット: グローバル（英語圏・アジア圏）＋日本に興味ある外国人・インバウンド
// ✅ 言語: 英語タイトル + 英語narration（job英語動画428回の実績あり）
// ✅ コンテンツ: Japan travel tips / hidden gems / culture / living tips
// ✅ CTA: japan.asoventure.jp への誘導 + チャンネル登録
// ✅ インバウンド需要: 2025-2026年訪日観光客過去最高水準

import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const JAPAKO = `2.5D anime style VTuber character "Japako": young female fox with traditional Japanese aesthetic, warm amber-orange fur, white inner ears, wearing a stylish modern outfit with red-and-white shrine maiden color scheme, gold torii pin, holds a paper map of Japan and a green tea cup. Welcoming curious expression. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🗾 More Japan tips & travel guides',
    '👇 Asoventure Japan',
    'https://japan.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=japako_japan',
    '',
    '📺 Subscribe for daily Japan tips!',
    '',
    '#Japan #JapanTravel #VisitJapan #JapanTips #Tokyo #Shorts #Japanese #JapanLife #Travel',
  ],
  tags: ['Japan', 'JapanTravel', 'VisitJapan', 'JapanTips', 'Tokyo', 'Shorts', 'Japanese', 'JapanLife', 'Travel', 'Osaka'],
  ytCategoryId: '19', // Travel & Events
};

const POOLS: ShortItem[] = [
  {
    topic: 'Japan hidden gems',
    title: 'Japan hidden gems tourists always miss 🗾✨',
    narration: 'Most tourists in Japan miss the best spots. Skip the crowds in Kyoto and try Nara\'s hidden temples, or Kanazawa\'s samurai district. Japan\'s real magic is off the beaten path!',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} pointing at glowing hidden map locations, bold white text "Japan Hidden Gems!" at top. Scene: Japako reveals secret off-the-beaten-path locations in Japan with magical reveal animation. Torii gates, quiet temples, local markets appear. Cinematic Japan aesthetic.`,
  },
  {
    topic: 'Japan convenience store secrets',
    title: 'Japan convenience store secrets foreigners don\'t know 🏪',
    narration: 'Japan\'s convenience stores are legendary. You can pay bills, print documents, get fresh food 24/7. The egg sandwich and oden are must-tries. Once you try Family Mart, you never go back.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} inside glowing konbini with arms full of goods, bold text "Japan Konbini Secrets!" at top. Scene: Japako demonstrates surprising conbini services - ATM, printing, hot food. Each revelation with surprise animation. Warm store lighting aesthetic.`,
  },
  {
    topic: 'Japan transportation tips',
    title: 'Japan train system explained in 30 seconds 🚄',
    narration: 'Japan\'s train system looks complicated but there\'s one rule: get a Suica card. IC card works on all trains, buses, and even convenience stores. No need to buy tickets every time.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with Suica card glowing, bold text "Japan Train System Simplified!" at top. Scene: complex train map simplifies into one highlighted Suica card. Japako demonstrates tapping on gates at stations. Clean transit animation.`,
  },
  {
    topic: 'Japan food culture',
    title: 'Japan food rules you must know before visiting 🍱',
    narration: 'Japan has food rules tourists often break. Don\'t eat while walking, don\'t tip your server, always say itadakimasu before eating. Knowing these shows respect and locals will love you.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with Japanese food spread and etiquette guide, bold text "Japan Food Rules!" at top. Scene: Japako demonstrates do\'s and don\'ts with clear green/red indicators. Respectful restaurant scene with warm Japanese atmosphere.`,
  },
  {
    topic: 'Japan budget travel',
    title: 'How to travel Japan on $50/day - budget guide 💴',
    narration: 'Japan doesn\'t have to be expensive. Budget accommodation, convenience store meals, and local transport can bring your daily cost under $50. The 100-yen shop is your best friend.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with wallet and Japan map, bold text "Japan on $50/day!" at top. Scene: Japako demonstrates budget choices - capsule hotel, konbini meal, day pass ticket. Running total showing affordable Japan travel. Practical travel aesthetic.`,
  },
  {
    topic: 'Japan cherry blossom season',
    title: 'Japan cherry blossom: when to go for the best view 🌸',
    narration: 'Cherry blossom season in Japan is magical but timing is everything. Tokyo peaks in late March, Kyoto early April, Hokkaido mid-May. Check the official forecast and book early. Worth every yen.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} under blooming sakura with calendar showing dates, bold text "Cherry Blossom Perfect Timing!" at top. Scene: Japan map with bloom forecast animation showing wave moving from south to north. Dreamy pink aesthetic.`,
  },
  {
    topic: 'Tokyo vs Osaka',
    title: 'Tokyo vs Osaka: which city is better for tourists? 🤔',
    narration: 'Tokyo or Osaka? Tokyo for modern Japan, shopping, anime culture. Osaka for food, humor, and friendlier locals. Osaka food is cheaper and portions are bigger. My vote? Do both.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} between Tokyo and Osaka icons, bold text "Tokyo vs Osaka - Which Wins?" at top. Scene: side-by-side comparison with fun stats for each city. Japako keeps switching sides. Playful debate aesthetic with city skylines.`,
  },
  {
    topic: 'Japan cashless tips',
    title: 'Japan is NOT as cashless as you think - bring cash 💰',
    narration: 'Japan myth: you can use cards everywhere. Reality: many restaurants, shrines, and local shops are cash only. Always carry at least 5,000 yen. ATMs at 7-Eleven work with foreign cards.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with cash and card with warning sign, bold text "Japan: Bring Cash!" at top. Scene: Japako at cash-only ramen shop with no card sign. 7-Eleven ATM highlighted as solution. Practical travel advisory aesthetic.`,
  },
  {
    topic: 'Japan onsen etiquette',
    title: 'Japan onsen rules - avoid embarrassment 🛁',
    narration: 'Onsen in Japan is an experience you can\'t miss. But there are rules. Shower before you enter, no swimwear, no phones, tattoos may not be allowed. Follow these and enjoy an incredible Japanese tradition.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with onsen steam and checklist, bold text "Onsen Rules for Tourists!" at top. Scene: step-by-step guide with clear dos and don\'ts. Respectful bathing culture explanation. Serene hot spring aesthetic.`,
  },
  {
    topic: 'Japan temple vs shrine',
    title: 'Temple vs Shrine in Japan - what\'s the difference? ⛩️',
    narration: 'Temple or shrine? Temples are Buddhist, shrines are Shinto. Orange torii gate means shrine. At a shrine, bow twice, clap twice, bow once. At a temple, just bow with hands together. Now you know.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} between temple and shrine silhouettes, bold text "Temple vs Shrine Explained!" at top. Scene: clear visual comparison with key features highlighted. Japako demonstrates proper etiquette at each. Educational cultural animation.`,
  },
  {
    topic: 'Japan overnight bus',
    title: 'Japan overnight bus: save money, see more cities 🚌',
    narration: 'Japan overnight buses are budget traveler gold. Tokyo to Osaka for 4,000 yen vs 13,000 for Shinkansen. You sleep and save money. Willer Express and Bushiking are good options. Book 2 weeks ahead.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} sleeping on cozy bus with price comparison shown, bold text "Save Big with Night Bus!" at top. Scene: Japako shows price comparison dramatically - bus vs bullet train. Comfortable bus interior reveal. Budget travel victory.`,
  },
  {
    topic: 'Living in Japan reality',
    title: 'Living in Japan: honest truths after 1 year 🏠',
    narration: 'Living in Japan is amazing but not perfect. Language barrier is real, apartments are small, summers are brutal. But safety, food quality, and quality of life? Unmatched. Would I do it again? Absolutely.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with Japan apartment and honest expression, bold text "Japan Living - Real Talk!" at top. Scene: honest pros and cons list with anime-style reactions for each. Authentic expat life aesthetic. Balanced realistic tone.`,
  },
  {
    topic: 'Japan shopping districts',
    title: 'Japan shopping: where locals actually go vs tourist traps',
    narration: 'Don\'t shop only in Harajuku or Shinjuku. Locals go to Shimokitazawa for vintage, Koenji for subculture, Kichijoji for everything. These neighborhoods have real Japan culture AND better prices.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with shopping bags from hidden neighborhood stores, bold text "Where Locals Shop in Japan!" at top. Scene: map revealing local shopping districts away from tourist areas. Japako finds great deals. Discovery adventure aesthetic.`,
  },
  {
    topic: 'Japan vending machine culture',
    title: 'Japan vending machine secrets: what\'s actually inside 🥤',
    narration: 'Japan has 5 million vending machines. Hot and cold drinks in the same machine. Sake, ramen, umbrellas, fresh eggs. The most interesting ones are in rural areas. They\'re part of daily life here.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with glowing vending machine display showing surprising items, bold text "Japan Vending Machine Secrets!" at top. Scene: surprise reveal of unusual vending machine items with reaction animations. Rural Japan aesthetic with machine in scenic location.`,
  },
  {
    topic: 'Japan work culture',
    title: 'Japan work culture explained: the truth about overtime 💼',
    narration: 'Japan work culture is changing. The old overwork culture is being challenged. Remote work, shorter hours, side jobs becoming normal. If you\'re considering working in Japan, it\'s a good time to enter.',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with work-life balance scale improving, bold text "Japan Work Culture 2025!" at top. Scene: evolution of Japan work culture shown as timeline. Modern flexible work replacing traditional overtime culture. Optimistic corporate change aesthetic.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('japan', POOLS, 'japan-idx'));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('japan', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
