// app/api/japan/route.ts — ジャパ狐 インバウンドJapan Shorts（多言語展開）
// 【戦略修正：なんで英語だけ？→ 多言語対応が正解】
// japan.asoventureは10言語サイト。訪日外国人の最大市場は中・韓・英語圏
// → プール内を言語別に分散させ、YouTubeのアルゴリズムで多言語視聴者にリーチ
//
// 言語戦略:
// 🇬🇧 英語（6本）   : 欧米・東南アジア・グローバル
// 🇯🇵 日本語（4本）  : 日本人向け（観光業・移住検討・インバウンド情報収集）
// 🇰🇷 韓国語（3本）  : 訪日韓国人（訪日数Top3・YouTube高利用）
// 🇨🇳 中国語（2本）  : 訪日中国・台湾・香港（最大訪日市場の一つ）
//
// CTAは全言語でjapan.asoventure.jpへ（サイトが多言語対応済み）

import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const JAPAKO = `2.5D anime style VTuber character "Japako": young female fox with traditional Japanese aesthetic, warm amber-orange fur, white inner ears, wearing a stylish modern outfit with red-and-white shrine maiden color scheme, gold torii pin, holds a paper map of Japan and a green tea cup. Welcoming curious expression. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🗾 Japan tips & travel guides in 10 languages',
    '👇 Asoventure Japan',
    'https://japan.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=japako_japan',
    '',
    '📺 チャンネル登録で毎日Japantips / Subscribe for daily Japan tips!',
    '',
    '#Japan #JapanTravel #VisitJapan #日本旅行 #일본여행 #日本観光 #Tokyo #Shorts',
  ],
  tags: ['Japan', 'JapanTravel', 'VisitJapan', 'JapanTips', '日本旅行', '일본여행', 'Tokyo', 'Shorts', 'Travel', '日本観光'],
  ytCategoryId: '19',
};

const POOLS: ShortItem[] = [
  // ─── 英語（グローバル・欧米・東南アジア）─────────────────────
  {
    topic: 'Japan hidden gems',
    title: 'Japan hidden gems tourists always miss 🗾✨',
    narration: "Most tourists in Japan miss the best spots. Skip the crowds in Kyoto and try Nara's hidden temples, or Kanazawa's samurai district. Japan's real magic is off the beaten path!",
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} pointing at glowing hidden map locations, bold white text "Japan Hidden Gems!" at top. Scene: Japako reveals secret off-the-beaten-path locations. Torii gates, quiet temples, local markets. Cinematic Japan aesthetic.`,
  },
  {
    topic: 'Japan conbini secrets',
    title: "Japan convenience store secrets foreigners don't know 🏪",
    narration: "Japan's convenience stores are legendary. You can pay bills, print documents, get fresh food 24/7. The egg sandwich and oden are must-tries. Once you try Family Mart, you never go back.",
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} inside glowing konbini with arms full of goods, bold text "Japan Konbini Secrets!" at top. Scene: surprising conbini services - ATM, printing, hot food. Each with surprise animation. Warm store lighting.`,
  },
  {
    topic: 'Japan train system',
    title: 'Japan train system explained in 30 seconds 🚄',
    narration: "Japan's train system looks complicated but there's one rule: get a Suica card. IC card works on all trains, buses, and even convenience stores. No need to buy tickets every time.",
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with glowing Suica card, bold text "Japan Train: One Rule!" at top. Scene: complex train map simplifies into one Suica card. Japako taps on station gates. Clean transit animation.`,
  },
  {
    topic: 'Japan cash culture',
    title: "Japan is NOT cashless - bring cash ⚠️💴",
    narration: "Japan myth: cards work everywhere. Reality: many restaurants and shrines are cash only. Carry at least 5,000 yen. 7-Eleven ATMs work with foreign cards everywhere.",
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with yen bills and warning sign, bold text "Japan: Bring Cash!" at top. Scene: cash-only restaurant sign, then 7-Eleven ATM as savior. Practical travel warning aesthetic.`,
  },
  {
    topic: 'Japan onsen etiquette',
    title: 'Japan onsen rules - avoid embarrassment 🛁♨️',
    narration: "Onsen in Japan is unmissable. Rules: shower first, no swimwear, no phones, tattoos may not be allowed. Follow these and enjoy one of Japan's best traditions.",
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with onsen steam and checklist, bold text "Onsen Rules!" at top. Scene: step-by-step guide with clear dos and don'ts. Serene hot spring with mountain view aesthetic.`,
  },
  {
    topic: 'Japan temple vs shrine',
    title: 'Temple vs Shrine in Japan ⛩️🛕 whats the difference?',
    narration: "Temple or shrine? Temples are Buddhist, shrines are Shinto. Orange torii gate means shrine. Bow twice, clap twice, bow once at a shrine. At a temple, just bow with hands together.",
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} between temple and shrine silhouettes, bold text "Temple vs Shrine!" at top. Scene: clear visual comparison. Japako demonstrates proper etiquette at each with animation guide.`,
  },
  // ─── 日本語（日本人向け：観光業・移住・インバウンド情報収集）────
  {
    topic: '外国人に人気の観光スポット',
    title: '外国人観光客が必ず行く日本のスポット5選🗾',
    narration: '外国人観光客が実際にどこに行くのか知ってる？富士山・浅草・伏見稲荷・広島・白川郷。インバウンド対応を考えるなら、このルートを押さえておこう！',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with tourist map and foreign visitor icons, bold Japanese text "外国人が必ず行く5スポット！" at top. Scene: map lighting up 5 popular spots with visitor count animations. Inbound tourism data visualization.`,
  },
  {
    topic: '日本移住のリアル',
    title: '外国から日本に移住した人がびっくりした10のこと',
    narration: '日本に移住した外国人が一番驚くのは何だと思う？コンビニのクオリティ・電車の正確さ・深夜の安全性。でも夏の湿気と言語の壁は本物らしい。',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with surprised foreign visitor expressions, bold text "外国人が驚く日本の10のこと！" at top. Scene: reaction compilation - konbini amazement, train punctuality, late night safety. Surprising discovery animation.`,
  },
  {
    topic: 'インバウンド対策',
    title: '外国人客に選ばれるお店の共通点とは？インバウンド対策',
    narration: '外国人観光客に選ばれる店の共通点は3つ。英語メニューがある、キャッシュレス対応、Googleマップに英語情報がある。この3つだけで選ばれる確率が大きく変わります。',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with foreign customers entering store, bold text "外国人に選ばれる店の秘訣！" at top. Scene: 3-point checklist illuminating - English menu, QR payment, Google Maps profile. Business inbound guide aesthetic.`,
  },
  {
    topic: '日本語と英語の文化的違い',
    title: '外国人が日本語を難しいと感じる本当の理由',
    narration: '外国人が日本語を難しいというのは文字のせいだけじゃない。敬語・曖昧表現・空気を読む文化。日本人でも難しいこれらが外国人には大きな壁になります。',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with Japanese language symbols and confused foreign character, bold text "日本語が難しい本当の理由！" at top. Scene: cultural layers of Japanese language revealed. Keigo, reading the room, indirect speech visualized as layers.`,
  },
  // ─── 韓国語（訪日韓国人：YouTube利用率高・訪日数Top3）─────────
  {
    topic: '일본 여행 꿀팁',
    title: '일본 여행 전 꼭 알아야 할 꿀팁 5가지 🇯🇵',
    narration: '일본 여행 가기 전에 꼭 알아두세요! 교통카드 스이카 발급, 편의점 활용법, 현금 필수 지참, 온천 예절, 그리고 구글맵 다운로드. 이 5가지만 알면 일본 여행 완벽해요!',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with Korean text overlay "일본 여행 꿀팁!", bold Korean text at top. Scene: 5 Japan travel tips for Korean visitors revealed one by one with Korean text annotations. Practical travel guide aesthetic. K-style clean design.`,
  },
  {
    topic: '도쿄 vs 오사카',
    title: '도쿄 vs 오사카, 어디가 더 좋을까? 현실 비교 🤔',
    narration: '도쿄는 세련된 도시, 오사카는 맛과 인정의 도시. 도쿄는 쇼핑과 관광지, 오사카는 저렴하고 사람들이 친근해요. 둘 다 가는 게 정답이지만, 처음이라면 오사카 추천!',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} between Tokyo and Osaka with Korean text labels, bold Korean text "도쿄 vs 오사카!" at top. Scene: fun comparison with Korean-style reaction expressions. City highlights side by side. Energetic K-content style.`,
  },
  {
    topic: '일본 편의점 완벽 가이드',
    title: '일본 편의점에서 꼭 사야 할 것 TOP5 🏪',
    narration: '일본 편의점은 진짜 최고예요. 달걀 샌드위치, 온오뎅, 551호라이 돈만, 롤케이크, 야키소바빵. 한국에서는 못 먹는 이 맛들, 일본 가면 꼭 드세요!',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with Japanese convenience store food items with Korean labels, bold Korean text "편의점 TOP5!" at top. Scene: delicious food items revealed with Korean food reaction expressions. Appetite-stimulating warm lighting.`,
  },
  // ─── 中国語（訪日中国・台湾・香港：最大訪日市場の一つ）─────────
  {
    topic: '日本旅游必知',
    title: '去日本旅游前必须知道的5件事 🗾🇯🇵',
    narration: '去日本旅游之前，这5件事一定要知道！买Suica交通卡，准备现金，学会用便利店，了解温泉礼仪，还有下载离线地图。准备好了，日本之旅完美！',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with Chinese text overlay "日本旅游必知5件事!", scene showing 5 tips for Chinese visitors with Chinese text annotations. Suica card, yen cash, konbini, onsen, offline map. Clean informational style.`,
  },
  {
    topic: '日本购物攻略',
    title: '日本购物攻略：哪里最值得买？当地人才知道的秘密',
    narration: '很多游客只去新宿和涩谷购物，其实下北泽有超多复古好货，吉祥寺又便宜又有趣。避开旅游陷阱，跟着当地人走才是王道！',
    videoPrompt: `Opening thumbnail frame: ${JAPAKO} with Chinese shopping guide map and bargain finds, bold Chinese text "日本购物秘密！" at top. Scene: hidden shopping districts revealed with Chinese text. Shimokitazawa vintage finds, Koenji subculture. Bargain discovery aesthetic.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('japan', POOLS));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('japan', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
