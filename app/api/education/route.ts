// app/api/education/route.ts — エデュさ（うさぎ♀）学習tips Shorts
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const EDUUSA = `2.5D anime VTuber "Edu-sa": female rabbit, white fur, long bunny ears, lavender twin-tails, gold-rimmed glasses, purple cardigan, holds books and pencil. Studious expression. 9:16 vertical.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '📚 毎日30秒の学習tips配信中！',
    '👉 チャンネル登録で見逃しゼロ',
    'https://www.youtube.com/@asoventure_project?utm_source=shorts&utm_medium=desc&utm_campaign=eduusa_education',
    '',
    '#勉強法 #英語学習 #TOEIC #資格 #スキルアップ #Shorts',
  ],
  tags: ['勉強法', '英語学習', 'TOEIC', '資格', 'スキルアップ', 'Shorts', '30秒tips'],
  ytCategoryId: '27',
};

const POOLS: ShortItem[] = [
  {
    topic: 'TOEIC800点への道',
    title: 'TOEIC800点の人がやっていること3つ📖エデュさ',
    narration: 'TOEIC800点を取る人の共通点は3つ。毎日30分リスニング、公式問題集を繰り返す、単語は文脈で覚える。3ヶ月続ければ必ず伸びます！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${EDUUSA} holding TOEIC certificate, bold white text "TOEIC800点の秘密！". Scene: 3 study habits on sparkle cards, score meter rising. Library setting.`,
  },
  {
    topic: '暗記の効率化',
    title: '暗記力が3倍に！エデュさの科学的勉強法🧠',
    narration: '暗記は読むだけではNG。忘却曲線を使って1日後・3日後・1週間後に復習する。これで定着率が劇的にアップ！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${EDUUSA} with brain glow, bold white text "暗記力3倍UP！". Scene: forgetting curve on whiteboard, optimal review timing animation. Knowledge particles into brain.`,
  },
  {
    topic: 'シャドーイング英語上達',
    title: '英語が話せるように！シャドーイングのやり方🗣️',
    narration: '英語を話したいならシャドーイングが最強。音声を聞きながら0.5秒遅れて声に出す。毎日10分で3ヶ月後には驚くほど話せます。チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${EDUUSA} with speech bubble, bold white text "シャドーイングで英語上達！". Scene: headphones on, audio plays, she repeats. Mirror improvement effect.`,
  },
  {
    topic: 'ポモドーロ集中法',
    title: '集中力が続かない→ポモドーロ技法を試して⏰',
    narration: '25分集中して5分休憩。これを繰り返すポモドーロ技法が効果抜群。脳に合ったリズムで同じ時間で倍の内容が入ります！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${EDUUSA} with timer and focused expression, bold white text "集中力MAX！ポモドーロ法". Scene: 25-min timer, intense study aura, 5-min break stretch. Productivity meter filling.`,
  },
  {
    topic: 'プログラミング独学',
    title: 'プログラミング独学ロードマップ！エデュさが解説💻',
    narration: 'プログラミング独学の王道はHTML/CSS→JavaScript→React。無料教材だけでも十分スタートできます。チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${EDUUSA} with coding screen, bold white text "プログラミング独学ロードマップ！". Scene: glowing roadmap HTML→JS→React, each milestone lighting up.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('education', POOLS));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('education', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
