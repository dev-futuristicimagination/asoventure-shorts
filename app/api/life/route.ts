// app/api/life/route.ts — ライかえ（カエル♀）暮らしtips Shorts
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const RAIKAE = `2.5D anime VTuber "Raikae": female frog, mint-green hair, frog ear accessories, light green apron over white blouse, holds broom and cooking utensils. Cheerful homemaker expression. 9:16 vertical.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🌱 毎日30秒の暮らしtips配信中！',
    '👉 チャンネル登録で見逃しゼロ',
    'https://www.youtube.com/@asoventure_project?utm_source=shorts&utm_medium=desc&utm_campaign=raikae_life',
    '',
    '#節約 #一人暮らし #時間管理 #家事 #料理 #暮らし #Shorts',
  ],
  tags: ['節約', '一人暮らし', '時間管理', '家事', '料理', '暮らし', 'Shorts', '30秒tips'],
  ytCategoryId: '26',
};

const POOLS: ShortItem[] = [
  {
    topic: '一人暮らし節約術',
    title: '一人暮らし月3万円節約！ライかえの裏ワザ🐸',
    narration: '一人暮らしで節約するなら、食費・通信費・サブスクの3つを見直すだけで月3万円変わります。まず使ってないサブスクを全部解約しよう！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${RAIKAE} holding ¥30,000 saved, bold white text "月3万節約！". Scene: canceling unused subscriptions with satisfying X marks, phone plan comparison, meal prep montage. Coins accumulating.`,
  },
  {
    topic: '時短料理術',
    title: '10分で作れる栄養満点ご飯！ライかえのレシピ🍳',
    narration: '忙しい日でも10分でご飯が作れます。卵・豆腐・冷凍野菜を使った電子レンジ料理が最強。栄養もコストも完璧！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${RAIKAE} presenting finished dish with timer showing 10min, bold white text "10分栄養ご飯！". Scene: quick hands-on cooking montage with eggs, tofu, frozen veggies. Microwave magic. Delicious result with sparkles.`,
  },
  {
    topic: '部屋の整理整頓',
    title: '部屋が散らかる人の共通点とは？ライかえ解説🏠',
    narration: '部屋が散らかる原因は「定位置がない」こと。物を出したら必ず同じ場所に戻すルールを作るだけで劇的に変わります。チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${RAIKAE} with before/after room comparison, bold white text "部屋スッキリの秘訣！". Scene: messy room transforms to organized one. Each item gets assigned spot with glowing label. Satisfying declutter animation.`,
  },
  {
    topic: '洗濯の時短テクニック',
    title: '洗濯時間を半分に！ライかえの時短テク⚡',
    narration: '洗濯を時短するコツは、乾燥機付き洗濯機を使うか、部屋干し乾燥グッズを活用すること。たたむ時間も工夫すれば1/3に減らせます！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${RAIKAE} with folded laundry and timer, bold white text "洗濯時間を半分に！". Scene: efficient laundry routine demonstration. Clothes folding speedrun. Time-lapse style. Organized closet reveal.`,
  },
  {
    topic: '朝活の始め方',
    title: '朝30分早起きで人生が変わる！ライかえが解説☀️',
    narration: '朝30分早起きして、ストレッチ・朝食・今日の計画を立てるだけで一日が全然違います。最初の3日間が勝負。一緒に始めよう！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${RAIKAE} with sunrise and alarm clock, bold white text "朝30分で人生変わる！". Scene: peaceful morning routine - stretching, healthy breakfast, planning notebook. Golden morning light. Before/after energy comparison.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('life', POOLS));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('life', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
