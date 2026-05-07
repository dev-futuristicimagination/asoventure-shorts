// app/api/finance-canvas/route.ts — キツネ子 お金tips Canvas動画（リッチ版）
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💰 お金・投資・節約の記事はこちら',
    '👇 Asoventure Finance',
    'https://finance.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=canvas_finance',
    '#お金 #節約 #NISA #投資 #副業 #Shorts #FP #資産形成',
  ],
  tags: ['お金', '節約', 'NISA', '投資', '副業', '家計管理', 'Shorts', 'FP', '資産形成'],
  ytCategoryId: '27',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: 'NISAで資産形成を始める5ステップ',
    title: 'NISA初心者が最初にやるべき5ステップ📈',
    narration: '2024年に新NISAが始まり、資産形成のチャンスが大幅に拡大しました。今日はNISA初心者が最初にやるべき5ステップを解説します。まず証券口座の開設から。SBI証券や楽天証券が初心者に使いやすくおすすめです。次に月々の投資額を決めます。最初は無理のない月5,000円から始めましょう。投資先は全世界株式インデックスファンドが初心者の鉄板です。リスク分散が自動的にされ、世界経済の成長をそのまま取り込めます。追加枠の年120万円のつみたて投資枠を最優先で使い切ることが鍵です。最後に30年間触らない覚悟を持つこと。時間が最大の武器になります。',
    points: [
      '① SBI証券か楽天証券で口座開設\n→ 初心者向けUIで手数料も業界最安水準',
      '② 月5,000円から無理なく始める\n→ 少額でも30年続けると複利で大きく育つ',
      '③ 全世界株式インデックスファンドを選ぶ\n→ 約3,000社に自動分散・リスク管理が不要',
      '④ つみたて投資枠を最優先に使う\n→ 年120万円・20年で最大2,400万円非課税',
      '⑤ 30年間売らない覚悟を持つ\n→ 複利の効果は時間が長いほど指数関数的に増大する',
    ],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=nisa_steps',
    ctaText: '📖 NISA完全ガイドはこちら→',
  },
  {
    topic: '固定費削減で月2万円節約する方法',
    title: '固定費を見直して月2万円節約する完全ガイド💡',
    narration: '節約の最大の敵は変動費ではなく固定費です。毎月自動的に引き落とされるため意識しにくいですが、一度見直すだけで継続的な効果が得られます。スマホを格安SIMに変えるだけで月3,000〜5,000円削減できます。使っていないサブスクは今すぐ棚卸しを。1サービス平均1,000円として5つ解約するだけで5,000円。電力会社の比較乗り換えで月1,000〜2,000円削減可能です。保険の見直しも重要で、不要な特約を外すだけで保険料が大幅に下がるケースが多いです。ふるさと納税を活用すれば、食費の一部を実質無料にできます。これらを組み合わせれば月2万円削減は十分に現実的です。',
    points: [
      '① 格安SIMに乗り換える\n→ 月3,000〜5,000円削減。年間最大6万円の差',
      '② 使っていないサブスクを全部解約\n→ 平均5サービス×1,000円＝月5,000円の無駄',
      '③ 電力会社を比較して乗り換える\n→ 同じ使用量で月1,000〜2,000円削減可能',
      '④ 保険の不要特約を外す\n→ 特約見直しだけで保険料が30%下がるケースも',
      '⑤ ふるさと納税で食費を実質無料に\n→ 2,000円負担で食品・日用品の返礼品が届く',
    ],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=fixed_cost_cut',
    ctaText: '📖 節約完全ガイドはこちら→',
  },
  {
    topic: '投資初心者が知るべき5つのリスク',
    title: '投資で失敗する人が見落としている5つのリスク📊',
    narration: '投資を始めた人の多くが最初に犯すミスがあります。今日は投資で失敗する人が見落としている5つのリスクを解説します。一番多いのが一括投資のリスク。まとまった資金を一度に投じると、相場の底で買えない可能性があります。積立投資のドルコスト平均法で時間分散することが基本です。集中投資も大きなリスクです。1銘柄や1セクターに集中すると、その企業や業界の不調がそのまま損失になります。流動性リスクも見逃せません。すぐに現金化できない商品は緊急時に困ります。レバレッジ商品は初心者には危険です。利益も損失も何倍にも増幅されます。最後に感情的な売買。暴落時に恐怖で売ると実損失が確定します。',
    points: [
      '① 一括投資のタイミングリスク\n→ 積立投資でドルコスト平均法を使う',
      '② 集中投資の銘柄・セクターリスク\n→ インデックスで自動分散が初心者の基本',
      '③ 流動性リスク（すぐ換金できない）\n→ 緊急予備費は別に確保してから投資する',
      '④ レバレッジ商品の損失増幅リスク\n→ 初心者はノーレバレッジ商品のみ',
      '⑤ 感情的な売買による実損失の確定\n→ 暴落時こそ売らず積み立て継続が正解',
    ],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=investment_risk',
    ctaText: '📖 投資リスク解説はこちら→',
  },
  {
    topic: '確定申告で取り戻せるお金5選',
    title: '確定申告で取り戻せるお金5選！知らないと損💴',
    narration: '確定申告をしていない人は毎年損をしているかもしれません。今日は確定申告で取り戻せるお金を5つ紹介します。医療費控除は年間10万円以上の医療費がある場合に適用されます。歯の治療費やメガネ代も対象になるケースがあります。ふるさと納税のワンストップ特例制度を使わなかった場合は確定申告が必要です。副業の経費計上も重要です。在宅ワークの通信費や書籍代は経費として計上できます。株式の損失と配当を損益通算すると税金が戻ってきます。住宅ローン控除は年末調整だけでは適用されず、最初の年は確定申告が必要です。',
    points: [
      '① 医療費控除\n→ 年10万円超の医療費で税金が戻る（歯科・眼鏡も対象）',
      '② ふるさと納税の申告漏れ\n→ ワンストップ未使用の場合は申告が必要',
      '③ 副業の経費を申告する\n→ 通信費・書籍・セミナー代は経費計上OK',
      '④ 株損失と配当の損益通算\n→ 損失を配当と相殺して税金を取り戻す',
      '⑤ 住宅ローン控除（初年度）\n→ 初年度は年末調整でなく確定申告が必要',
    ],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=tax_return',
    ctaText: '📖 確定申告ガイドはこちら→',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const result = await phaseCanvas('finance', CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)], CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
