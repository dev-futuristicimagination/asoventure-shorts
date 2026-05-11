// app/api/music1963-canvas/route.ts — music1963 Canvas動画
// 【2026-05-12 プロデューサー新設】vercel.json Cron設定済みだがルート未作成だったため追加
// 目的: music1963.com への口頭誘導 + AdSense流入（GA4実測で最多7セッション）
// ターゲット: 35-54歳男性（昭和生まれ・平成初期世代）
// フォーマット: テキストCanvasでランキング型・アーティスト特集型

import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🎵 フルランキングはこちら',
    '👇 music1963.com',
    'https://music1963.com?utm_source=youtube&utm_medium=canvas&utm_campaign=music_canvas',
    '',
    '👍 いいね & 🔔 チャンネル登録お願いします！',
    '#昭和歌謡 #懐メロ #名曲 #ランキング #Shorts',
  ],
  tags: ['昭和歌謡', '懐メロ', '名曲', 'ランキング', 'music1963', 'Shorts'],
  ytCategoryId: '10', // Music
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: '昭和歌謡ランキングTOP5',
    title: '昭和歌謡ランキングTOP5！あなたは何曲知ってる？',
    narration: '昭和の名曲、今でも口ずさめますか？実はこのランキングの1位は全世代が知っているあの歌です。フルランキングはmusic1963.comで確認できます。チャンネル登録で毎日昭和歌謡tips！',
    points: [
      '🥇 1位: 川の流れのように（美空ひばり/1989）\n→ 昭和最後の年に生まれた不滅の名曲',
      '🥈 2位: また逢う日まで（尾崎紀世彦/1971）\n→ レコード大賞・カラオケ永遠の定番',
      '🥉 3位: 勝手にしやがれ（沢田研二/1977）\n→ ジュリーの色気が時代を超えて響く',
      '4位: 赤いスイートピー（松田聖子/1982）\n→ 松本隆×細野晴臣の奇跡のコラボ',
      '5位: 少女A（中森明菜/1982）\n→ 不良少女イメージが当時の常識を破った',
    ],
    siteUrl: 'music1963.com',
    fullUrl: 'https://music1963.com/ranking/showa-top?utm_source=yt_canvas',
    ctaText: '🎵 昭和歌謡全ランキングはこちら→',
  },
  {
    topic: '美空ひばり名曲ベスト3選',
    title: '美空ひばりの名曲ベスト3【昭和の歌姫・永遠の記憶】',
    narration: '昭和の歌姫・美空ひばりの名曲を知っていますか？実は代表曲は「川の流れのように」だけじゃないんです。フルランキングはmusic1963.comで。チャンネル登録で昭和名曲情報毎日！',
    points: [
      '① 川の流れのように（1989）\n→ 昭和最後の年・秋元康作詞の壮大なフィナーレ',
      '② 悲しい酒（1966）\n→ 演歌の女王を確立した一曲・売上160万枚',
      '③ リンゴの唄（1945）\n→ 終戦直後に歌った奇跡・国民に希望を与えた',
      '📖 美空ひばり全曲ランキングはmusic1963.comで',
    ],
    siteUrl: 'music1963.com',
    fullUrl: 'https://music1963.com/artist/misora-hibari?utm_source=yt_canvas',
    ctaText: '🎵 美空ひばり全ランキングはこちら→',
  },
  {
    topic: '松田聖子vs中森明菜どっちが上？',
    title: '松田聖子vs中森明菜！あなたはどっち派？【昭和アイドル比較】',
    narration: '昭和のアイドル対決といえば松田聖子vs中森明菜。実は売上データで見ると意外な結果が出ています。知っていましたか？フルデータはmusic1963.comで確認できます。',
    points: [
      '松田聖子: シングル累計2,400万枚以上\n→ 「聖子ちゃんカット」が社会現象に',
      '中森明菜: シングル累計2,200万枚以上\n→ 翳りあるカリスマで対照的な存在感',
      '実は両者の差は紙一重\n→ どちらが上かは今でも決着がつかない理由',
      'music1963.com で全シングルランキング公開中',
    ],
    siteUrl: 'music1963.com',
    fullUrl: 'https://music1963.com/artist/seiko-vs-akina?utm_source=yt_canvas',
    ctaText: '🎵 昭和アイドル完全比較はこちら→',
  },
  {
    topic: 'オフコース名曲ランキング',
    title: 'オフコース名曲ランキング！35〜50代なら必ず知ってる3選',
    narration: '「さよなら」「言葉にできない」…オフコースの名曲を知っていますか？実は今の35〜50代が青春時代に一番聴いたバンドはオフコースという調査結果があります。',
    points: [
      '① さよなら（1979）\n→ 小田和正の声と別れの哲学・累計200万枚',
      '② 言葉にできない（1982）\n→ CM使用で再評価・世代を超えた名バラード',
      '③ YES-YES-YES（1982）\n→ ポップでキャッチー・オフコース唯一の踊れる曲',
      '🎵 オフコース全ランキングはmusic1963.comで',
    ],
    siteUrl: 'music1963.com',
    fullUrl: 'https://music1963.com/artist/off-course?utm_source=yt_canvas',
    ctaText: '🎵 オフコース全ランキングはこちら→',
  },
  {
    topic: '平成Jポップ黄金期ランキング',
    title: '平成Jpop黄金期ランキング！CD時代の名曲TOP5',
    narration: 'CD全盛期の平成Jポップを覚えていますか？実はあの時代の売上TOP5は今でも信じられない数字です。フルランキングはmusic1963.comで。チャンネル登録で毎日昭和平成tips！',
    points: [
      '🥇 1位: First Love（宇多田ヒカル/1999）\n→ 765万枚・日本音楽史上最大セールス',
      '🥈 2位: CAN YOU CELEBRATE?（安室奈美恵/1997）\n→ 結婚発表翌日に330万枚・社会現象',
      '🥉 3位: LArc~en~Ciel名曲群（1999〜）\n→ 年間シングル4枚連続ミリオンという前人未到の記録',
      '4位: SPEED時代（1997〜）\n→ 平均年齢15歳のグループが売上1,000万枚超え',
      '5位: SMAP「世界に一つだけの花」（2003）\n→ 累計325万枚・Jポップ史上唯一の平和ソング１位',
    ],
    siteUrl: 'music1963.com',
    fullUrl: 'https://music1963.com/ranking/heisei-jpop?utm_source=yt_canvas',
    ctaText: '🎵 平成Jpop全ランキングはこちら→',
  },
  {
    topic: 'さだまさし名曲ランキング35-54歳男性特化',
    title: 'さだまさし名曲ランキング！知る人ぞ知る名曲3選',
    narration: 'さだまさしの曲を聴いたことがありますか？実は代表曲「関白宣言」は発売当時物議をかもした問題作でした。今聴くと感じ方が全く違います。フルランキングはmusic1963.comで。',
    points: [
      '① 関白宣言（1979）\n→ 妻への要求を歌った「問題作」→今では時代の鏡',
      '② 秋桜（コスモス）（1977）\n→ 山口百恵に提供→自身版も大ヒット・親子の情感',
      '③ 北の国から（1981）\n→ ドラマ主題歌・北海道の大地と父子の物語',
      '🎵 さだまさし全ランキングはmusic1963.comで',
    ],
    siteUrl: 'music1963.com',
    fullUrl: 'https://music1963.com/artist/sada-masashi?utm_source=yt_canvas',
    ctaText: '🎵 さだまさし全ランキングはこちら→',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const item = CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)];
    const result = await phaseCanvas('music1963', item, CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
