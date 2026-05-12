// app/api/station-canvas/route.ts — station.asoventure.jp 就活生向けCanvas動画
// ターゲット: 就活生（大学3〜4年生 / 既卒 / 第二新卒）
// 誘導先: station.asoventure.jp（就活オウンドメディア）

import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🚉 就活対策の記事はこちら',
    '👇 Asoventure Station',
    'https://station.asoventure.jp?utm_source=youtube&utm_medium=canvas&utm_campaign=station_canvas',
    '',
    '👍 いいね & 🔔 チャンネル登録お願いします！',
    '#就活 #就活対策 #ES #面接対策 #インターン #Shorts',
  ],
  tags: ['就活', '就活対策', 'ES', '面接対策', 'インターン', 'ガクチカ', 'Shorts'],
  ytCategoryId: '27',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: '就活ES・ガクチカの書き方',
    title: '選考通過率が上がるガクチカの書き方【就活生必見】📝',
    narration: 'ガクチカで落ちる人には共通のパターンがあります。「部活で頑張りました」「バイトで売上を上げました」これだけでは選考を通過できません。採用担当が見ているのは「あなたが何を学び、どう活かすか」です。STAR法（状況・課題・行動・結果）で書くと説得力が格段に上がります。',
    points: [
      '① STAR法で書く\n→ 状況・課題・行動・結果の順で構成する',
      '② 数字で実績を示す\n→「売上20%アップ」「参加者50名」のように具体化',
      '③ 「学び」と「入社後の活かし方」で締める\n→ これがない人が圧倒的に多い',
      '④ 200〜400字で完結させる\n→ 長すぎるガクチカは読まれない',
      '⑤ 複数エピソードを準備する\n→ 企業によって聞かれる経験が違う',
    ],
    siteUrl: 'station.asoventure.jp',
    fullUrl: 'https://station.asoventure.jp?utm_source=yt_canvas&utm_campaign=gakuchika',
    ctaText: '📖 ガクチカ完全攻略はこちら→',
  },
  {
    topic: '就活面接の頻出質問と答え方',
    title: '就活面接で必ず聞かれる5つの質問と攻略法🎯',
    narration: '就活面接には「絶対に聞かれる質問」があります。自己紹介・自己PR・志望動機・ガクチカ・逆質問の5つです。この5つを完璧に準備するだけで、面接通過率が大幅に変わります。特に「逆質問」は多くの就活生が「特にありません」と答えてしまいますが、これは致命的です。',
    points: [
      '① 自己紹介は1分で話す練習をする\n→ 名前・大学・強みを簡潔に',
      '② 自己PRは「強み+エピソード+入社後活用」の型で\n→ 具体的な数字があると説得力UP',
      '③ 志望動機は企業研究を3時間以上してから書く\n→「なぜ他社ではなく御社か」を言語化',
      '④ ガクチカは複数準備する\n→ 学業・部活・バイト・ボランティアなど',
      '❌ 逆質問で「特にありません」は絶対NG\n→ 入社意欲がないと判断される',
    ],
    siteUrl: 'station.asoventure.jp',
    fullUrl: 'https://station.asoventure.jp?utm_source=yt_canvas&utm_campaign=mensetsu_qa',
    ctaText: '📖 面接頻出質問を全部対策→',
  },
  {
    topic: 'インターンシップ選考の通り方',
    title: 'インターン選考に通る人がやっている3つのこと💼',
    narration: 'インターンシップの選考で落ちる就活生には共通点があります。エントリーシートで「何を学びたいか」が書けていない、グループディスカッションで「まとめ役ばかり狙う」、これが主な原因です。インターンは本採用に直結する企業が増えているので、選考を甘く見てはいけません。',
    points: [
      '① ESに「このインターンで具体的に学びたいこと」を書く\n→ 「成長したい」は全員書く。差別化できない',
      '② GDでは「タイムキーパー」が最も評価されやすい\n→ 議論を整理して時間を守る役が安全',
      '③ 逆質問で社員の仕事のリアルを聞く\n→「やりがいと大変さ」を聞くと好印象',
    ],
    siteUrl: 'station.asoventure.jp',
    fullUrl: 'https://station.asoventure.jp?utm_source=yt_canvas&utm_campaign=intern',
    ctaText: '📖 インターン選考攻略はこちら→',
  },
  {
    topic: '就活スケジュール・時期別やること',
    title: '就活スケジュール完全版！時期別にやること一覧📅',
    narration: '就活で失敗する人の多くは「スケジュールを知らない」か「後回しにする」かのどちらかです。大学3年の6月から逆算して動くことが最重要です。特にインターンの選考は夏・冬に集中するため、3年の春から準備を始めた人と秋から始めた人では選択肢の数が全く違います。',
    points: [
      '大3・6月〜: 自己分析・業界研究スタート\n→ 夏インターンのESは6〜7月に締切が多い',
      '大3・8〜9月: 夏インターン参加\n→ 本採用直結型も多い。積極的に参加',
      '大3・12月〜: 冬インターン + OB/OG訪問\n→ 志望業界を3つに絞り込むタイミング',
      '大4・3月: 本選考エントリー解禁\n→ 準備済みの人とそうでない人で差が出る',
      '大4・6月: 内定解禁（経団連加盟企業）\n→ 外資・ベンチャーはもっと早い',
    ],
    siteUrl: 'station.asoventure.jp',
    fullUrl: 'https://station.asoventure.jp?utm_source=yt_canvas&utm_campaign=schedule',
    ctaText: '📖 就活スケジュール全ガイド→',
  },
  {
    topic: '就活で評価されるガクチカエピソードの選び方',
    title: 'ガクチカは何を書けばいい？企業が評価するネタ5選🏆',
    narration: 'ガクチカに書く経験は「すごいこと」でなくていいです。重要なのは「経験から何を学んだか」と「それをどう仕事に活かすか」です。留学経験がなくても、アルバイトや部活のエピソードで十分です。ただし「頑張りました」だけでは評価されません。数字と学びが必須です。',
    points: [
      '✅ 評価されるネタ① アルバイトでの課題解決\n→「売上を〇%改善した工夫」があれば最強',
      '✅ 評価されるネタ② 部活・サークルのリーダー経験\n→ チームをまとめた「プロセス」を詳しく',
      '✅ 評価されるネタ③ ゼミ・研究・学業\n→ 理系・文系問わず「なぜ選んだか」を言語化',
      '✅ 評価されるネタ④ ボランティア・地域活動\n→ 継続性と社会への視点をアピール',
      '❌ NGネタ: 「何もしていなかった」\n→ 小さい経験でも数字と学びで評価される',
    ],
    siteUrl: 'station.asoventure.jp',
    fullUrl: 'https://station.asoventure.jp?utm_source=yt_canvas&utm_campaign=gakuchika_neta',
    ctaText: '📖 ガクチカネタ選び完全版→',
  },
  {
    topic: '就活で落ちる人の共通点と対策',
    title: '就活で落ち続ける人がやりがちな5つのNG習慣😱',
    narration: '就活で20社以上落ちている人には、共通のパターンがあります。自己分析が甘いまま応募している、ESをコピペして使い回している、OB訪問を一切していない、この3つが特に多いです。落ちた後に原因分析をしない人は同じ失敗を繰り返します。',
    points: [
      '❌ NG① 自己分析をしないまま応募する\n→「強みを3つ言ってください」に答えられない',
      '❌ NG② ESを全企業コピペで使い回す\n→ 採用担当には一目でわかる',
      '❌ NG③ OB/OG訪問を一切しない\n→ リアルな社風・仕事内容がわからない',
      '❌ NG④ 落ちた後に原因分析しない\n→ 同じ失敗を次の選考でも繰り返す',
      '❌ NG⑤ 志望度が低い企業を「練習」と思う\n→ 本気で臨まないと実力がつかない',
    ],
    siteUrl: 'station.asoventure.jp',
    fullUrl: 'https://station.asoventure.jp?utm_source=yt_canvas&utm_campaign=ng_habits',
    ctaText: '📖 就活NG習慣と改善法を読む→',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const result = await phaseCanvas('station', CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)], CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
