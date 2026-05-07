// app/api/life-canvas/route.ts — ライかえ 暮らしtips Canvas動画（リッチ版）
import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🌱 暮らし・節約・時間術の記事はこちら',
    '👇 Asoventure Life',
    'https://life.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=canvas_life',
    '#節約 #一人暮らし #時間管理 #Shorts #生活術',
  ],
  tags: ['節約', '一人暮らし', '時間管理', '家事', '料理', '暮らし', 'Shorts', '生活術'],
  ytCategoryId: '26',
};

const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: '一人暮らしで食費月1万円を実現する5つのルール',
    title: '一人暮らし食費月1万円を実現した5つのルール🛒',
    narration: '一人暮らしで食費を月1万円以下にすることは十分に可能です。ただし闇雲に節約するのではなく、正しい方法を知ることが大切です。週1回のまとめ買いで特売品を活用すること。食材のロスを防ぐために使い切りメニューを計画すること。冷凍を活用することで食材の寿命を3〜4倍に延ばせます。コンビニへの立ち寄りをやめること。1回500円でも週5回なら月1万円の差になります。外食は月4回まで予算内に収めること。これらを組み合わせれば食費1万円は現実的な目標です。',
    points: [
      '① 週1回まとめ買いで特売品を活用\n→ 毎日買い物は割高品を衝動買いするリスクが高い',
      '② 食材は使い切りメニューで計画する\n→ 食材ロスが食費を無意識に20〜30%押し上げている',
      '③ 冷凍を積極活用して食材寿命を延ばす\n→ 冷凍すれば肉・魚・野菜の保存が3〜4倍に',
      '④ コンビニへの立ち寄りをゼロにする\n→ 1回500円×週5回＝月1万円の無駄遣い',
      '⑤ 外食は月4回まで予算を決める\n→ 予算内での外食は楽しみとして継続可能',
    ],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=yt_canvas&utm_campaign=food_budget',
    ctaText: '📖 食費節約の全レシピはこちら→',
  },
  {
    topic: '朝活で人生が変わる理由と始め方',
    title: '朝30分早起きすると人生が変わる科学的な理由☀️',
    narration: '朝活が人生を変えると言われる理由を科学的に解説します。朝の脳は前日の睡眠でリフレッシュされており、意思決定力と集中力が1日の中で最も高い状態です。これを活用しない手はありません。また朝に自分のための時間を作ることで、1日の主導権を自分が持てるという心理的な効果もあります。成功者の約90%が早起きという調査もあります。ただし急に起床を早めると逆効果です。毎日15分ずつ早めるペースが最も継続しやすいことがわかっています。',
    points: [
      '① 朝は脳のゴールデンタイム\n→ 睡眠でリセットされた脳は集中力・判断力が最高値',
      '② 朝の自分時間が1日の主導権を生む\n→ 朝に主体性を持つと日中のパフォーマンスが上がる',
      '③ 就寝を15分ずつ早めることから始める\n→ 急な変更は体内時計を乱し逆に眠れなくなる',
      '④ 朝のルーティンを前夜に決めておく\n→ 起きてから何をするか考える時間を排除する',
      '⑤ 最初の1週間は15分の早起きだけ\n→ 小さな成功体験を積んで習慣化の土台を作る',
    ],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=yt_canvas&utm_campaign=morning_routine',
    ctaText: '📖 朝活習慣化ガイドはこちら→',
  },
  {
    topic: 'サブスク整理で月5000円節約する手順',
    title: 'サブスクを整理して月5000円節約する具体的な手順📱',
    narration: 'サブスクリプションサービスの平均利用数は1人あたり8〜12個という調査があります。そのうち本当に使っているものは半分以下というケースが多いです。今日はサブスクを整理して月5,000円を取り戻す具体的な手順を紹介します。まず全サブスクをクレジットカードの明細から洗い出します。次に過去3ヶ月のログイン履歴を確認します。3ヶ月ログインしていないものは即解約。使っているものは年払いに変えて10〜20%の割引を受ける。最後に残すサービスを月1回見直す習慣をつけることで、ズルズルと課金が続くことを防げます。',
    points: [
      '① カード明細から全サブスクを洗い出す\n→ 自分が契約しているサービスを把握できていない人が多い',
      '② 過去3ヶ月のログイン履歴を確認する\n→ 使っていないサービスが必ず2〜3個は見つかる',
      '③ 3ヶ月未ログインは即解約\n→ 「いつか使う」は永遠に来ない。迷わず解約',
      '④ 使うものは年払いに変更する\n→ 年払いで10〜20%の割引が受けられる',
      '⑤ 月1回サブスクを見直す習慣をつける\n→ 定期的な棚卸しで無駄の再発を防ぐ',
    ],
    siteUrl: 'life.asoventure.jp',
    fullUrl: 'https://life.asoventure.jp?utm_source=yt_canvas&utm_campaign=subscription_cut',
    ctaText: '📖 固定費削減の全ガイドはこちら→',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const result = await phaseCanvas('life', CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)], CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
