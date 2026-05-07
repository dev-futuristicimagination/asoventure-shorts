// app/api/education-canvas/route.ts — エデュさ 学習tips Canvas動画（リッチ版）
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '📚 英語・資格・学習法の記事はこちら',
    '👇 Asoventure Education',
    'https://education.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=canvas_education',
    '#勉強法 #英語 #TOEIC #資格 #Shorts',
  ],
  tags: ['勉強法', '英語学習', 'TOEIC', '資格', 'スキルアップ', 'Shorts', '独学'],
  ytCategoryId: '27',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: 'TOEIC900点を取った人の勉強法',
    title: 'TOEIC900点取得者が共通してやった勉強法5選📖',
    narration: 'TOEICで900点を取った人には共通の習慣があります。公式問題集を最低3周すること。毎日30分のリスニング継続。単語は例文の文脈で覚えること。シャドーイングで口を動かすこと。パート7の時間配分を徹底練習すること。この5つを3ヶ月続ければ必ず結果が変わります。詳しい学習計画は記事をご覧ください。',
    points: [
      '① 公式問題集を最低3周する\n→ 出題パターンを体で覚えることが最優先',
      '② リスニングを毎日30分継続\n→ 耳が慣れるには最低3ヶ月の積み上げが必要',
      '③ 単語は例文の文脈で覚える\n→ 文脈記憶は単語帳暗記より定着率が3倍高い',
      '④ シャドーイングで口を動かす\n→ 音の認識スピードが劇的に向上する',
      '⑤ パート7の時間配分を練習する\n→ 1問1分以内のペースが900点への鍵',
    ],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=toeic_900',
    ctaText: '📖 TOEIC900点攻略はこちら→',
  },
  {
    topic: 'AI時代に必要なスキル5選',
    title: 'AI時代に仕事を失わない人が持つ5つのスキル🤖',
    narration: 'ChatGPTの登場で多くの仕事が自動化されるリスクが現実になっています。今日はAI時代でも価値を持ち続けるスキルを5つ紹介します。プロンプトエンジニアリング、批判的思考力、対人コミュニケーション能力、専門領域の深い判断力、継続的な学習能力。この5つを持つ人はAIを脅威でなく武器として使いこなすことができます。',
    points: [
      '① プロンプトエンジニアリング\n→ AIへの指示精度が生産性10倍の差を生む',
      '② 批判的思考力（AIの出力を検証）\n→ AIは自信満々に間違える。判断は人間の仕事',
      '③ 対人コミュニケーション能力\n→ 交渉・共感・説得はAIが最も不得意な領域',
      '④ 専門領域の深い判断力\n→ 最終意思決定と責任は人間にしか担えない',
      '⑤ ラーナビリティ（継続的学習力）\n→ 技術変化に適応し続ける力が最大の差別化',
    ],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=ai_era_skills',
    ctaText: '📖 AI時代のスキル戦略はこちら→',
  },
  {
    topic: '記憶定着率を3倍にする暗記法',
    title: '科学が証明した記憶の定着率を3倍にする方法🧠',
    narration: 'エビングハウスの忘却曲線によると、人は学習後24時間で約70%を忘れます。しかし、適切なタイミングで復習するだけで定着率が劇的に上がります。学習直後・翌日・3日後・1週間後・1ヶ月後という5回の復習タイミングを守ることが重要です。AnkiというアプリはこのSRS理論を実装しており、自動で最適なタイミングを管理してくれます。',
    points: [
      '① 学習直後に必ず1回目の復習\n→ 最初の急激な忘却曲線の落下を防ぐ',
      '② 翌日・3日後・1週間後に復習\n→ このタイミングを守ると定着率3倍になる',
      '③ 1ヶ月後の復習で長期記憶に固定\n→ 長期記憶化すると試験で安定して使える',
      '④ AnkiでSRS学習を自動化する\n→ 忘却曲線に合わせた復習をAIが管理',
      '⑤ 不正解の問題だけに時間を集中\n→ 正解済みを繰り返すのは時間の無駄',
    ],
    siteUrl: 'education.asoventure.jp',
    fullUrl: 'https://education.asoventure.jp?utm_source=yt_canvas&utm_campaign=memory_science',
    ctaText: '📖 科学的暗記法の詳細はこちら→',
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
