// app/api/job/route.ts — ジョブわん（柴犬♂）就活tips Shorts
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const JOBWAN = `2.5D anime style VTuber character "Jobwan": young male Shiba Inu, warm tan fur, crisp white dress shirt with navy blue tie, black slacks, golden star pin on lapel, Shiba ears with inner white, brown eyes with determined spark. Professional yet approachable. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '✅ ガクチカ・ES・面接対策をAIで解決',
    '👇 Cheese 無料LINE登録',
    'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=jobwan_job',
    '',
    '#就活 #ガクチカ #ES #面接対策 #AI #Shorts #就活生 #内定 #自己PR',
  ],
  tags: ['就活', 'ガクチカ', 'ES', '面接対策', 'AI', 'Shorts', '就活生', '内定', 'Cheese'],
  ytCategoryId: '27',
};

const POOLS: ShortItem[] = [
  {
    topic: '面接でよく聞かれる質問TOP3',
    title: '面接で必ず聞かれるTOP3の答え方🎯ジョブわん流',
    narration: '面接でよく聞かれる「学生時代に力を入れたこと」「志望理由」「自己PR」。この3つをおさえれば怖くない。詳しくはCheese無料登録で練習しよう！',
    videoPrompt: `Opening thumbnail frame: ${JOBWAN} holding "TOP3" sign with confident smile, bold white text "面接TOP3の答え方！" at top. Scene: Jobwan lists 3 interview questions on glowing whiteboard, demonstrates perfect answer for each with energy. Clock ticking urgently in background. Exam room setting.`,
  },
  {
    topic: 'ESの通過率を上げる方法',
    title: 'ESで落とされる人の共通点とは？ジョブわんが解説',
    narration: 'ESで落とされる人には共通点がある。具体性がない、数字がない、誰でも言えることを書く。Cheeseのエキスパートと一緒に克服しよう。',
    videoPrompt: `Opening thumbnail frame: ${JOBWAN} with magnifying glass examining paper, bold white text "ES通過率UP！" at top. Scene: Jobwan shows two ESes side by side - bad one with red X marks, good one with gold checkmarks. He circles key differences. Clean office setting.`,
  },
  {
    topic: 'インターン選考突破術',
    title: 'インターン倍率10倍でも受かる方法🏆ジョブわん',
    narration: 'インターンの倍率は10倍以上のところも多い。でもコツをつかめば大丈夫。Cheeseで選考対策を始めよう。',
    videoPrompt: `Opening thumbnail frame: ${JOBWAN} jumping through "10x difficulty" barrier triumphantly, bold white text "倍率10倍でも受かる！" at top. Scene: Jobwan navigates obstacle course representing interview stages, clears each hurdle with strategy tips floating above. Victory pose at end.`,
  },
  {
    topic: '就活スケジュール管理',
    title: '就活スケジュール完璧管理術📅ジョブわん流',
    narration: '説明会・ES・面接が重なって混乱してない？Cheeseで就活スケジュールをまるごと管理しよう。',
    videoPrompt: `Opening thumbnail frame: ${JOBWAN} with organized colorful calendar, bold white text "スケジュール完璧管理！" at top. Scene: Jobwan transforms chaotic overlapping calendar into color-coded organized schedule. He sighs with relief and gives thumbs up.`,
  },
  {
    topic: 'OB訪問の準備方法',
    title: 'OB訪問で失敗しない質問リスト📝ジョブわん',
    narration: 'OB訪問、何を聞けばいいかわからない？ジョブわんが厳選した10の質問を教えます。Cheese無料登録でさらに詳しく！',
    videoPrompt: `Opening thumbnail frame: ${JOBWAN} with notebook and pen ready, bold white text "OB訪問10の質問！" at top. Scene: Jobwan walks through office setting, pulls out golden notebook with glowing questions list. Each question lights up as he explains. Professional networking vibe.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('job', POOLS));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('job', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
