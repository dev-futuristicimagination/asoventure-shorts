// app/api/education-canvas/route.ts — エデュさ 学習tips Canvas動画
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '📚 英語・資格・スキルアップの記事はこちら',
    '👇 Asoventure Education',
    'https://education.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=canvas_education',
    '',
    '📺 チャンネル登録で毎日学習tips！',
    '',
    '#勉強法 #英語 #TOEIC #資格 #スキルアップ #学習 #Shorts',
  ],
  tags: ['勉強法', '英語学習', 'TOEIC', '資格', 'スキルアップ', '学習', 'Shorts', '独学'],
  ytCategoryId: '27',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: 'TOEIC スコアアップの3習慣',
    title: 'TOEIC スコアが上がる人がやっている3つの習慣📖',
    narration: 'TOEICのスコアが伸びる人がやっている3つの習慣を教えます。毎日30分のリスニング、公式問題集を3周する、単語は文脈と一緒に覚える。3ヶ月継続で必ず結果が出ます。',
    points: ['毎日30分リスニングを継続', '公式問題集を最低3周する', '単語は例文と一緒に記憶'],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=toeic_habits',
    ctaText: '📖 TOEIC攻略記事はこちら→',
  },
  {
    topic: 'エビングハウス忘却曲線の活用',
    title: '暗記力3倍の科学的学習法 忘却曲線を使え🧠',
    narration: 'エビングハウスの忘却曲線を使った効率的な暗記法を教えます。学習後1日・3日・1週間・1ヶ月後に復習する。このタイミングを守るだけで記憶の定着率が劇的に上がります。',
    points: ['1日後・3日後・1週間後に復習', '復習のタイミングが定着率を決める', '正しいインターバルで記憶が固まる'],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=forgetting_curve',
    ctaText: '📖 科学的勉強法の詳細はこちら→',
  },
  {
    topic: 'プログラミング独学ロードマップ',
    title: 'プログラミング独学の正しいロードマップ3ステップ💻',
    narration: 'プログラミングを独学で習得するための正しいロードマップを教えます。HTML・CSSでウェブ基礎を学ぶ、JavaScriptで動きをつける、Reactで実際のアプリを作る。この順番が最も効率的です。',
    points: ['① HTML/CSSでウェブ基礎', '② JavaScriptでインタラクション', '③ Reactで実アプリを作る'],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=programming_roadmap',
    ctaText: '📖 プログラミング学習記事→',
  },
  {
    topic: 'ポモドーロ技法の使い方',
    title: 'ポモドーロ技法で集中力MAX！正しい使い方3ステップ⏰',
    narration: 'ポモドーロ技法の正しい使い方を3ステップで教えます。25分集中してタスクに取り組む、5分間の短い休憩を取る、4セット繰り返したら30分の長い休憩を取る。脳の仕組みに合った最強の集中法です。',
    points: ['25分集中→5分休憩を1セット', '4セット後に30分の長休憩', 'タスクを細かく分解して臨む'],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=pomodoro',
    ctaText: '📖 集中力向上記事はこちら→',
  },
  {
    topic: '英語シャドーイングの正しい方法',
    title: '英語スピーキングが上達するシャドーイング3つのコツ🗣️',
    narration: '英語のシャドーイングを正しくやるための3つのコツを教えます。ネイティブ音声を使う、0.5秒遅れで声に出す、スクリプトなしで練習する。毎日10分で3ヶ月後に確実に変わります。',
    points: ['ネイティブ音声を教材に選ぶ', '0.5秒遅れで声に出して真似る', 'まずスクリプトなしで挑戦'],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=shadowing',
    ctaText: '📖 英語学習記事はこちら→',
  },
  {
    topic: '資格取得の効率的な勉強法',
    title: '資格試験に合格する人がやっている勉強法3選📝',
    narration: '資格試験に合格する人が共通してやっている勉強法を3つ紹介します。過去問から始めて試験の傾向をつかむ、苦手な分野に時間を集中する、直前期は問題を解くだけにする。',
    points: ['まず過去問で傾向をつかむ', '苦手分野に時間を集中投下', '直前は新しい教材を開かない'],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=exam_study',
    ctaText: '📖 資格取得ガイドはこちら→',
  },
  {
    topic: 'AIツールを勉強に活用する方法',
    title: 'AI時代の勉強法 AIツールを学習に活用する3つの方法🤖',
    narration: 'AIツールを勉強に活用する3つの方法を教えます。ChatGPTで苦手な概念を質問する、AIに問題を作ってもらって練習する、間違えた問題の解説をAIに頼む。',
    points: ['AIに苦手概念を質問して理解', 'AIに練習問題を生成してもらう', '間違いの解説はAIに聞く'],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=ai_study',
    ctaText: '📖 AI学習活用記事はこちら→',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const result = await phaseCanvas('education', CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)], CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
