// app/api/finance/route.ts — キツネ子（キツネ♀）お金tips Shorts
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const KITSUNEKO = `2.5D anime style VTuber character "Kitsuneko": young female fox, warm orange-gold fur, white chest, fox ears with inner white, navy blue blazer with gold coin brooch, cream blouse, dark pencil skirt, holds small golden abacus. Smart confident expression with slight smile. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💰 毎日30秒のお金tips配信中！',
    '👉 チャンネル登録で見逃しゼロ',
    'https://www.youtube.com/@asoventure_project?utm_source=shorts&utm_medium=desc&utm_campaign=kitsuneko_finance',
    '',
    '#お金 #節約 #NISA #投資 #副業 #家計管理 #Shorts',
  ],
  tags: ['お金', '節約', 'NISA', '投資入門', '副業', '家計管理', 'Shorts', '30秒tips'],
  ytCategoryId: '27',
};

const POOLS: ShortItem[] = [
  {
    topic: 'NISA入門',
    title: 'NISAって結局何？キツネ子が30秒で解説📈',
    narration: 'NISAは投資の利益が非課税になる制度。年間360万円まで投資できて、利益に税金がかからない。まずは月1000円から始めてみよう。チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${KITSUNEKO} holding golden NISA card with sparkling background, bold white text "NISAを30秒で解説！" at top. Scene: Kitsuneko draws simple diagram showing NISA tax-free benefit vs regular investment. Numbers animate showing savings. Clean infographic style with gold accents.`,
  },
  {
    topic: '節約の始め方',
    title: '月1万円節約する具体的な方法💡キツネ子流',
    narration: '月1万円節約したいなら、まず固定費から見直そう。スマホ料金を格安SIMにするだけで月3,000〜5,000円下がります。チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${KITSUNEKO} holding ¥10,000 bill with scissors, bold white text "月1万円節約！" at top. Scene: Kitsuneko presents phone bill before/after switching to cheaper plan, coins visually accumulate. Satisfying money-saving animation. Home setting with calculator.`,
  },
  {
    topic: 'クレジットカード活用術',
    title: 'カードを賢く使えば年2万円得する！キツネ子解説',
    narration: 'クレジットカードのポイントを活用してる？生活費をカード払いにするだけで、年間1〜2%のポイントが貯まります。正しく使えばお得。チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${KITSUNEKO} with multiple cards fanning out like a deck, bold white text "カードで年2万円得！" at top. Scene: Kitsuneko shows shopping payment with card, point meter filling up dramatically. Gold coins raining down. Retail setting with register.`,
  },
  {
    topic: '副業で稼ぐ方法',
    title: '副業初心者が最初にやるべき3つ📝キツネ子',
    narration: '副業を始めるなら、クラウドソーシング・スキル販売・せどりの中から自分に合うものを選ぼう。最初は月1万円を目標にするのがコツ。チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${KITSUNEKO} with three option cards floating around her, bold white text "副業ビギナーの始め方！" at top. Scene: Kitsuneko presents 3 side job types with pros/cons icons. Bar graph shows income growth over time. Motivating gold and navy color scheme.`,
  },
  {
    topic: 'ふるさと納税の基本',
    title: 'ふるさと納税は絶対やって！キツネ子が解説🏯',
    narration: 'ふるさと納税、まだやってない人は損してます。寄付した金額-2000円が税金から返ってくる上に、返礼品ももらえる。控除上限はサラリーマンなら年収の20%が目安。チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${KITSUNEKO} surrounded by hometown gift boxes, bold white text "ふるさと納税で得する！" at top. Scene: Kitsuneko demonstrates the donation flow with animated tax return visualization. Gift boxes pop open with special items. Map of Japan in background.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('finance', POOLS));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('finance', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
