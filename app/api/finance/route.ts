// app/api/finance/route.ts — お金・キャリア収入tips Shorts
// 【2026-05-08 プロデューサー判断による全面改良】
// ✅ 「初任給の使い方」139回 → finance系は実用How to型が最強
// ✅ キャラ名（キツネ子）をタイトルから除外 → 情報系に統一
// ✅ 就活生×20代社会人の最大公約数（入社・副業・節約・投資）
// ✅ 全動画にCheese LINE CTA追加（月収・キャリアの悩みに誘導）
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const KITSUNEKO = `2.5D anime style VTuber character "Kitsuneko": young female fox, warm orange-gold fur, white chest, fox ears with inner white, navy blue blazer with gold coin brooch, cream blouse, dark pencil skirt, holds small golden abacus. Smart confident expression with slight smile. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💰 副業・収入アップの相談はAIに！',
    '🧀 Cheese 無料LINE登録',
    'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=finance_info',
    '',
    '#お金 #節約 #NISA #副業 #投資 #初任給 #20代 #Shorts #家計管理',
  ],
  tags: ['お金', '節約', 'NISA', '副業', '投資', '初任給', '20代', 'Shorts', '家計管理', '収入アップ'],
  ytCategoryId: '27',
};

// 【実データ根拠】
// 「初任給の使い方💰チーちゃんのAI家計術」= 139回（昨日の3位）
// → 「初任給」「の使い方」「具体的数字」が高エンゲージメントの原因
const POOLS: ShortItem[] = [
  // === 最強: 初任給・入社シリーズ（20〜24歳にドンピシャ）===
  {
    topic: '初任給の使い方で5年後の資産が変わる理由',
    title: '初任給の使い方で5年後の資産が100万円変わる理由',
    narration: '初任給の使い方は一生に一度のチャンスです。おすすめの配分は「生活費50%・貯蓄20%・投資20%・自己投資10%」。投資をゼロにして10年後に後悔する人が多い。月5,000円でもNISAを始めよう。',
    videoPrompt: `Opening scene: ${KITSUNEKO} with first paycheck and 5-year wealth comparison. Scene: Two parallel timelines - one with smart allocation showing growing wealth, one without showing stagnation. Percentage breakdown animation. Compelling wealth gap visualization.`,
  },
  {
    topic: '入社1年目に絶対やるべきお金の手続き5つ',
    title: '入社1年目にやらないと損するお金の手続き5つ',
    narration: '入社時に忘れがちな手続きがあります。①NISA口座開設②iDeCo確認③給与口座の複数化④ふるさと納税の上限確認⑤会社の株式持株会の確認。これだけで年間10〜30万円変わることも。',
    videoPrompt: `Opening scene: ${KITSUNEKO} with checklist and money bags growing with each completed item. Scene: 5 procedures as levels in a progress bar, each one unlocking financial benefit animation. Tax savings and investment returns visualized.`,
  },
  {
    topic: '月3万円節約して投資する最速方法',
    title: '月3万円節約して投資に回す最速の方法【固定費削減から】',
    narration: '月3万円の投資原資を作るには固定費の見直しが最速です。スマホ料金→格安SIM（月3,000〜5,000円削減）・サブスク整理（月2,000〜5,000円）・保険の見直し（月5,000〜20,000円）。合計で月3万円は確実。',
    videoPrompt: `Opening scene: ${KITSUNEKO} with scissors cutting fixed costs on flowing chart. Scene: Three cost categories being slashed with satisfying animation, coins accumulating in investment bucket. Monthly savings calculator visualization.`,
  },
  // === NISA・投資入門 ===
  {
    topic: 'NISAを20代で始めると老後に何百万変わるか',
    title: '20代でNISAを始めると老後に何百万円変わるのか計算してみた',
    narration: '20代から月30,000円をNISAに投資すると、年利5%で30年後には約2,500万円。同じ30年でも30代から始めると約1,800万円。700万円の差は「始めるのが10年早いかどうか」だけ。',
    videoPrompt: `Opening scene: ${KITSUNEKO} with compound interest graph showing dramatic upward curve. Scene: Side-by-side comparison of 20s vs 30s start with animated wealth accumulation. Final numbers appearing with "700万円の差！" dramatic reveal.`,
  },
  {
    topic: 'NISAで絶対やってはいけない3つのミス',
    title: 'NISAで損している人がやっているミス3つ',
    narration: 'NISAで失敗する人の共通ミスが3つ。①高配当株を買って利益を再投資しない②短期で売ってしまう③毎月少額より一括のほうが良いと思い込む。NISAは「長期・積立・分散」の3点セットが鉄則です。',
    videoPrompt: `Opening scene: ${KITSUNEKO} with three warning signs around NISA account. Scene: Each mistake shown as a detour on investment roadmap. Correct path appears as glowing golden route. Investment timeline visualization.`,
  },
  // === 副業・収入アップ ===
  {
    topic: '副業で月5万円稼ぐ最短ルート',
    title: '副業で月5万円稼ぐ最短ルートと現実的な始め方',
    narration: '副業で月5万円を目指す最短ルートは「スキルの棚卸し→需要確認→クラウドソーシング」の3ステップ。デザイン・ライティング・プログラミング・動画編集のどれかを持っているなら今すぐ始められます。',
    videoPrompt: `Opening scene: ${KITSUNEKO} with "月5万円" target and shortest path visualization. Scene: Three-step roadmap with skills inventory, demand check, crowdsourcing platform. Income growth timeline animation. Achievable and motivating aesthetic.`,
  },
  {
    topic: 'ふるさと納税で得する金額と正しいやり方',
    title: 'ふるさと納税でいくら得するのか年収別に計算してみた',
    narration: 'ふるさと納税は年収400万円なら約3〜4万円分、600万円なら約7〜8万円分の控除が受けられます。しかも返礼品がもらえる。やらないと純粋に損。ワンストップ特例なら確定申告も不要。',
    videoPrompt: `Opening scene: ${KITSUNEKO} with income levels and corresponding tax benefit amounts. Scene: Calculator showing year-by-year savings, gift boxes representing furusato returns. One-stop exception process simplified. Clear ROI visualization.`,
  },
  // === 節約・家計 ===
  {
    topic: '固定費を下げる最も効果的な順番',
    title: '固定費を下げるなら最も効果的なこの順番でやること',
    narration: '固定費削減の効果的な順番があります。①スマホ（月3,000〜10,000円）②保険（月3,000〜30,000円）③サブスク（月1,000〜5,000円）④電力会社（月500〜3,000円）⑤ジム（月5,000〜10,000円）。スマホから始めよう。',
    videoPrompt: `Opening scene: ${KITSUNEKO} with priority list of fixed costs ranked by savings potential. Scene: Each cost category being optimized in order, total savings accumulating. Monthly budget visualization improving step by step.`,
  },
  {
    topic: 'クレジットカードのポイントを最大化する方法',
    title: 'クレジットカードのポイントを年2万円分多く貯める方法',
    narration: 'カードのポイントを最大化する3つの鉄則：①メインカードを1枚に絞る（ポイント分散を防ぐ）②生活費全てをカード払いにする③年会費無料の高還元率カード（1%以上）を選ぶ。年2万円は普通に貯まります。',
    videoPrompt: `Opening scene: ${KITSUNEKO} with point meter maximizing with smart card usage. Scene: Three rules creating point optimization engine. Annual benefit calculator showing 20,000 yen accumulating. Smart money visualization.`,
  },
  {
    topic: '給与明細の見方と手取りを増やす方法',
    title: '給与明細の見方と手取りを合法的に増やす3つの方法',
    narration: '給与明細の控除項目を見たことありますか？社会保険料・所得税・住民税で約20〜25%引かれています。手取りを増やすには①NISA②iDeCo③ふるさと納税の3つが最強の節税ツールです。',
    videoPrompt: `Opening scene: ${KITSUNEKO} examining payslip with magnifying glass revealing deduction breakdown. Scene: Three tax reduction tools as shields protecting income. Before/after take-home pay comparison. Empowering financial literacy visualization.`,
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
