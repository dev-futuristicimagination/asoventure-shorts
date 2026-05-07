// app/api/finance-canvas/route.ts — キツネ子 お金tips Canvas動画
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💰 お金・投資・節約の記事はこちら',
    '👇 Asoventure Finance',
    'https://finance.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=canvas_finance',
    '',
    '📺 チャンネル登録で毎日お金tips！',
    '',
    '#お金 #節約 #NISA #投資 #副業 #家計管理 #Shorts #FP',
  ],
  tags: ['お金', '節約', 'NISA', '投資', '副業', '家計管理', 'Shorts', 'FP', '資産形成'],
  ytCategoryId: '27',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: 'NISA入門 3つのポイント',
    title: 'NISA入門：始める前に知るべき3つのこと📈',
    narration: 'NISAを始める前に知っておくべき3つのポイントを解説します。非課税の仕組み、年間投資上限、つみたてNISAとの違い。この3つを理解してから始めると失敗しません。',
    points: ['利益が非課税になる制度', '年間360万円まで投資可能', 'まず月1000円から始めよう'],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=nisa_intro',
    ctaText: '📖 NISA詳細記事はこちら→',
  },
  {
    topic: '固定費削減の3ステップ',
    title: '月1万円節約できる固定費削減の3ステップ💡',
    narration: '固定費を削減して月1万円節約する3ステップを教えます。スマホ料金を格安SIMに変える、使っていないサブスクを解約する、電力会社を比較して乗り換える。',
    points: ['格安SIMで月3,000円以上削減', '不要サブスクを棚卸しする', '電力会社の比較・乗り換え'],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=fixed_cost',
    ctaText: '📖 節約記事の詳細はこちら→',
  },
  {
    topic: 'ふるさと納税 基本の仕組み',
    title: 'ふるさと納税を今すぐやるべき3つの理由🏯',
    narration: 'ふるさと納税をまだやっていない人に伝えたい3つの理由。税金から控除される、返礼品がもらえる、上限2000円の自己負担だけでOK。今年の分は12月31日が締め切りです。',
    points: ['2000円負担で税金が戻る', '食品・日用品の返礼品あり', '12月31日が申し込み期限'],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=furusato_nozei',
    ctaText: '📖 ふるさと納税詳細はこちら→',
  },
  {
    topic: 'クレジットカード ポイント最大化',
    title: 'カードポイントを最大化する3つのルール💳',
    narration: 'クレジットカードのポイントを最大化するための3つのルール。生活費を全てカード払いにする、ポイント還元率の高いカードを選ぶ、期限切れに注意する。年間1〜2万円の差が出ます。',
    points: ['生活費はすべてカード払い', '還元率1%以上のカードを選ぶ', 'ポイント期限を定期確認'],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=credit_points',
    ctaText: '📖 おすすめカード比較記事→',
  },
  {
    topic: '緊急予備費の正しい積み方',
    title: '緊急予備費 いくら必要？積み方の3原則💰',
    narration: '緊急予備費の積み方の3原則を解説します。最低3ヶ月分の生活費を目標にする、普通預金に置く（投資しない）、月収の10〜20%を毎月積み立てる。',
    points: ['目標：生活費3ヶ月分', '普通預金で管理（投資NG）', '毎月収入の10〜20%を積立'],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=emergency_fund',
    ctaText: '📖 家計管理記事はこちら→',
  },
  {
    topic: '投資初心者の3ステップ',
    title: '投資初心者が最初にやるべき3ステップ📊',
    narration: '投資を始めたい初心者がまずやるべき3ステップを教えます。証券口座を開設する、月5000円から積立NISAを始める、最初は全世界株インデックスを選ぶ。',
    points: ['まず証券口座を開設', '月5000円から積立NISAを開始', '全世界株インデックスが安定'],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=invest_beginner',
    ctaText: '📖 投資初心者ガイドはこちら→',
  },
  {
    topic: '副業収入の確定申告',
    title: '副業収入の確定申告 知らないと損する3つのこと',
    narration: '副業収入の確定申告で知らないと損することを3つ教えます。年20万円を超えたら申告が必要、経費として計上できるものがある、e-Taxで自宅から申告できる。',
    points: ['年20万円超で申告が必要', '通信費・書籍代は経費計上OK', 'e-Taxで自宅申告が簡単'],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp?utm_source=yt_canvas&utm_campaign=side_job_tax',
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
