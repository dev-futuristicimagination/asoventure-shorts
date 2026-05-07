// app/api/job-canvas/route.ts — 就職・転職 How to Canvas動画
// 【方針】就活専用ではなく「社会人キャリア全般」で最大公約数を狙う
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💼 転職・キャリアの記事はこちら',
    '👇 Asoventure Job',
    'https://job.asoventure.jp?utm_source=youtube&utm_medium=canvas&utm_campaign=job_canvas',
    '',
    '👍 いいね & 🔔 チャンネル登録お願いします！',
    '#転職 #キャリア #仕事術 #スキルアップ #Shorts',
  ],
  tags: ['転職', 'キャリア', '仕事術', 'スキルアップ', '面接', '職場', 'Shorts'],
  ytCategoryId: '27',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: '年収を上げる転職の進め方・How to',
    title: '年収100万円アップの転職を成功させる5ステップ📈',
    narration: '転職で年収を大幅に上げるためには戦略が必要です。まず現在の市場価値を把握すること。転職サイトに登録して同職種の求人を確認するだけで相場がわかります。年収交渉は内定後にするのが鉄則。オファーが出た後に「御社への入社を前提に、現在の年収○○円から○○円は可能でしょうか」と伝えます。複数社から内定を取ることで交渉力が上がります。',
    points: [
      '① 転職サイトで現在の市場価値を確認\n→ 同職種の求人を10件見れば相場がわかる',
      '② スキルの棚卸しと強みを整理する\n→ 転職で評価されるのは「再現性ある実績」',
      '③ 応募は量より質・相性のいい企業に絞る\n→ 手当たり次第は面接準備が薄くなる',
      '④ 年収交渉は内定後に行う\n→ 最も強い交渉カードは「内定を持っている」こと',
      '⑤ 複数社の内定を同時に持つ\n→ 比較材料があることで交渉力が格段に上がる',
    ],
    siteUrl: 'job.asoventure.jp',
    fullUrl: 'https://job.asoventure.jp?utm_source=yt_canvas&utm_campaign=salary_up',
    ctaText: '📖 転職年収アップ戦略はこちら→',
  },
  {
    topic: '職場でのコミュニケーション術・How to',
    title: '上司・同僚に好かれる職場コミュニケーション5つのコツ💬',
    narration: '職場でのコミュニケーションは仕事の成果に直結します。報告・連絡・相談を怠らないことが基本ですが、それ以上に「結論から話す」ことが重要です。5分で話せることを30分かけて説明する人は評価が下がります。また相手の忙しい時間帯を避けて話しかけること。ランチタイムや朝イチの報告は印象が良くなります。',
    points: [
      '① 報告は「結論→理由→詳細」の順で話す\n→ 5分で話せる内容を30分かけない',
      '② ホウレンソウ（報連相）は早めに\n→ 問題が大きくなる前に共有することが信頼の基本',
      '③ 相手が忙しくない時間を選ぶ\n→ 朝イチ・ランチ後が話しかけやすいタイミング',
      '④ 依頼するときは期限を明確にする\n→ 「いつまでに」がないと後回しになりやすい',
      '⑤ 失敗したらすぐに報告・謝罪する\n→ 隠蔽・先延ばしは信頼を大幅に損なう',
    ],
    siteUrl: 'job.asoventure.jp',
    fullUrl: 'https://job.asoventure.jp?utm_source=yt_canvas&utm_campaign=workplace_comm',
    ctaText: '📖 職場コミュニケーション記事はこちら→',
  },
  {
    topic: '仕事の生産性を2倍にするHow to',
    title: '仕事の生産性を2倍にするための5つの時間術⏱️',
    narration: '同じ時間で2倍の成果を出す人には共通の習慣があります。タスクを「緊急×重要」で4分類して優先順位をつけるアイゼンハワーマトリクスを使うこと。また深い集中が必要な作業は午前中の2時間に固めること。メール・Slackの返信は時間を決めて一括処理することで、集中が途切れる回数を大幅に減らせます。',
    points: [
      '① タスクを緊急×重要で4分類する\n→ アイゼンハワーマトリクスで優先度を即座に決定',
      '② 深い作業は午前中の2時間に集中する\n→ 脳のゴールデンタイムを最重要業務に使う',
      '③ メール・Slackは時間を決めて一括返信\n→ 都度確認は集中力を平均23分リセットする',
      '④ 1日の終わりに翌日のタスクを書く\n→ 朝の判断コストをゼロにして即スタートできる',
      '⑤ 会議は15〜30分を原則にする\n→ 60分の会議の半分は無駄という研究結果あり',
    ],
    siteUrl: 'job.asoventure.jp',
    fullUrl: 'https://job.asoventure.jp?utm_source=yt_canvas&utm_campaign=productivity',
    ctaText: '📖 生産性向上の全ガイドはこちら→',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const result = await phaseCanvas('job', CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)], CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
