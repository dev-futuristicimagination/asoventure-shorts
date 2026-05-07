// app/api/cheese-canvas/route.ts — 🧀 Cheeseキャリア相談 Canvas動画（How to系特化）
// 【設計方針 2026-05-07 128回実証データ基準】
// 勝ちパターン: How to系 × Finance × 就活生＋社会人の最大公約数
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🧀 AIキャリアコーチ Cheese（無料）',
    '👇 LINE登録で無料相談スタート',
    'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=canvas&utm_campaign=cheese_canvas',
    '🤖 https://cheese.asoventure.jp?utm_source=yt_canvas',
    '',
    '👍 いいね & 🔔 チャンネル登録お願いします！',
    '#転職 #キャリア #就活 #AIコーチ #Shorts',
  ],
  tags: ['転職', 'キャリア', '就活', 'AIコーチ', '面接対策', 'Shorts', '仕事術'],
  ytCategoryId: '27',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: '初任給の使い方・AIが最適な家計プランを作る方法',
    title: '初任給の使い方をAIで最適化する方法💰',
    narration: '初任給をどう使うかで、5年後の資産が大きく変わります。まず生活費は手取りの50%以内に抑えること。次に貯蓄は最低10%を先取り貯金。残りを自己投資と娯楽に。AIキャリアコーチのCheeseなら、あなたの収入に合わせた家計プランを無料で作成できます。',
    points: [
      '① 生活費は手取りの50%以内にする\n→ これを守るだけで将来の選択肢が広がる',
      '② 貯蓄は給料日に先取り自動積立\n→ 残ったら貯めるは永遠に貯まらない',
      '③ 自己投資に10%（書籍・スキル）\n→ 社会人1年目の自己投資は最高の利回り',
      '④ NISA口座を今すぐ開設する\n→ 早く始めるほど複利の効果が大きくなる',
      '⑤ AIで家計プランを自動作成する\n→ Cheeseで無料でシミュレーション可能',
    ],
    siteUrl: 'cheese.asoventure.jp',
    fullUrl: 'https://cheese.asoventure.jp?utm_source=yt_canvas&utm_campaign=salary_plan',
    ctaText: '🧀 AIに家計プランを作ってもらう→',
  },
  {
    topic: '転職面接で落ちる理由と対策5選',
    title: '転職面接で落ちる人がやっている5つのNG行動❌',
    narration: '転職の面接で不合格になる理由には共通のパターンがあります。準備不足・志望動機が薄い・前職の愚痴を言う・給与の話を最初にする・逆質問がないという5つが主な原因です。AIキャリアコーチのCheeseなら、あなたの弱点を特定して面接対策プランを作成します。',
    points: [
      '① 企業研究が浅く志望動機が薄い\n→ 「なぜその会社か」を具体的に言えるか',
      '② 前職への不満・愚痴を言ってしまう\n→ ネガティブな理由はポジティブに言い換える',
      '③ 給与・福利厚生の話を自分から最初にする\n→ 待遇の話は企業側から聞いてくるまで待つ',
      '④ 「特にありません」の逆質問\n→ 逆質問は入社意欲を示す最後のチャンス',
      '⑤ 自己PR・強みが抽象的すぎる\n→ 具体的なエピソード＋数字で裏付けする',
    ],
    siteUrl: 'cheese.asoventure.jp',
    fullUrl: 'https://cheese.asoventure.jp?utm_source=yt_canvas&utm_campaign=interview_ng',
    ctaText: '🧀 面接対策をAIに相談する→',
  },
  {
    topic: '副業で月5万円稼ぐためのHow to',
    title: '副業で月5万円稼ぐために最初にやること5ステップ💻',
    narration: '副業で月5万円は、正しい方法を知れば3〜6ヶ月で現実的に達成できる目標です。まずスキルを棚卸しして「すぐに売れるもの」を特定することから始めます。クラウドワークスやランサーズで最初の案件を取り、実績を作ること。実績ができたら単価を上げ、特定のニッチに専門化することで収入が安定します。',
    points: [
      '① 自分のスキルを棚卸しする\n→ Excel・文章・SNS運用・デザインは需要大',
      '② クラウドワークスで最初の1件を取る\n→ 最初は安くても「実績」が最重要',
      '③ プロフィールに実績を積み上げる\n→ 実績3件以上で単価交渉ができる',
      '④ 特定ニッチに専門化する\n→ 広く浅くより狭く深いほど高単価になる',
      '⑤ 月5万円達成後は自動化・外注を検討\n→ 労働時間を増やさず収入を拡大する',
    ],
    siteUrl: 'cheese.asoventure.jp',
    fullUrl: 'https://cheese.asoventure.jp?utm_source=yt_canvas&utm_campaign=side_hustle',
    ctaText: '🧀 副業プランをAIで設計する→',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const result = await phaseCanvas('cheese', CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)], CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
