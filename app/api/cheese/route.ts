// app/api/cheese/route.ts — マップ君（黒猫♂）就活AI Shorts
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

// ─── キャラクター定義 ───────────────────────────────────────────
const MAPKUN = `2.5D anime style VTuber character "Map-kun": young male black cat, jet-black fur with white chest patch, navy blue explorer jacket with golden compass badge, khaki cargo shorts, black cat ears with inner gold, compass accessory, Cheese-yellow color accent. Bright confident expression. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🧀 LINEにひと言送るだけでガクチカが自動生成！',
    '👇 Cheese 無料登録（LINE追加）',
    'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=mapkun_cheese',
    '',
    '📱 サービス詳細',
    'https://cheese.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=mapkun_cheese_web',
    '',
    '#就活AI #ガクチカ #ES #内定 #就活生 #AI就活 #Cheese #Shorts #就活対策',
  ],
  tags: ['就活AI', 'ガクチカ自動生成', 'ES', '内定', '就活生', 'AI就活', 'Cheese', 'Shorts', '就活対策'],
  ytCategoryId: '27',
};

// ─── 動画プール ────────────────────────────────────────────────
const POOLS: ShortItem[] = [
  {
    topic: 'AI就活の始め方',
    title: '就活AI使ってみた！マップ君とガクチカ完成✨',
    narration: 'LINEにひと言送るだけで、ガクチカが完成するって知ってた？Cheeseを使えば、あなたの経験がESに変わります。今すぐ無料で試してみて！',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} holding glowing smartphone with "LINE" icon, bold white Japanese text "ガクチカ、AIで完成！" at top. Scene: Map-kun types one line into LINE chat, magical golden text fills an essay document instantly. He shows it to camera with a proud smile. Sparkle effects. Upbeat J-pop BGM.`,
  },
  {
    topic: 'ガクチカ作成の悩み',
    title: 'バイトしかない？AIがガクチカに変えます🧀',
    narration: 'バイトしかしてない、ゼミも普通...そんな人こそCheeseを使って。あなたの普通の経験を、ESで光る言葉に変えます。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} looking at blank paper worried, bold white text "バイトしかなくても大丈夫！" at top. Scene: Map-kun opens LINE, types "バイトしかありません", AI magic transforms it into glowing golden essay text. He reads it and tears up with joy. Warm golden light effect.`,
  },
  {
    topic: '面接対策AI',
    title: '面接の答え方、AIが教えてくれる時代🎯',
    narration: '面接で何を話せばいいかわからない？CheeseのAIと練習すれば、本番は怖くない。今日から始めよう。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} in interview pose with confident smile, bold white text "面接もAIで準備！" at top. Scene: Map-kun in virtual interview room, AI speech bubbles guide him with perfect answers. He nods confidently. Interviewer avatar gives thumbs up. Blue corporate aesthetic.`,
  },
  {
    topic: '志望動機の書き方',
    title: '志望動機が思いつかない→AIで10分で完成✅',
    narration: '志望動機、どう書けばいいかわからない。でも大丈夫。CheeseのAIが、あなたの気持ちを言葉にします。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with thinking expression, bold white text "志望動機、10分で完成！" at top. Scene: Map-kun stares at blank screen, types his feelings into Cheese LINE chat, AI constructs a compelling motivation letter with golden flowing text. He smiles and submits.`,
  },
  {
    topic: '自己PR強化',
    title: '自己PRが弱いと感じたら→AIで磨こう💎',
    narration: '自己PRって難しいよね。でもCheeseは、あなたの強みを引き出してくれます。LINEで今すぐ試してみて。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} flexing with golden aura, bold white text "自己PR、AIで最強に！" at top. Scene: Map-kun's dim self-PR glows brighter and brighter as AI refines it. Stars burst around him. Energetic anime style.`,
  },
];

// ─── API ────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') {
      const result = await phaseA('cheese', POOLS, 'cheese-used-idx');
      return NextResponse.json(result);
    }
    if (phase === 'b' || phase === 'B') {
      const result = await phaseB('cheese', CTA);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
