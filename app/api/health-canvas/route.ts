// app/api/health-canvas/route.ts — パンダ子 健康tips Canvas動画（Veo3なし・コスト$0）
// 【役割】
// Veo3版(health)との並行運用。1日1本Canvas + 週3本Veo3の組み合わせ
// Canvas版はhealth.asoventure.jp記事への流入導線
// → 記事タイトル・3ポイント要約・サイトCTAという構造でSEO連動

import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💚 健康・メンタルウェルネスの記事はこちら',
    '👇 Asoventure Health',
    'https://health.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=canvas_health',
    '',
    '📺 チャンネル登録で毎日30秒健康tips！',
    '',
    '#健康 #健康習慣 #メンタルヘルス #睡眠 #ストレス #Shorts #wellness',
  ],
  tags: ['健康', '健康習慣', 'メンタルヘルス', '睡眠改善', 'ストレス解消', 'Shorts', 'wellness', '30秒tips'],
  ytCategoryId: '26',
};

// ─── Canvas記事要約プール（記事のtips → 3ポイント → サイト誘導）────
const CANVAS_POOLS: CanvasItem[] = [
  {
    topic: '睡眠の質を上げる3つの習慣',
    title: '睡眠の質が劇的に上がる3つの習慣💤',
    narration: '睡眠の質を上げる3つの習慣を教えます。寝る1時間前にスマホをオフ、部屋の温度を18〜20度に設定、カフェインは午後2時まで。この3つだけで睡眠が変わります。',
    points: ['スマホは1時間前にオフ', '室温18〜20度が最適', 'カフェインは午後2時まで'],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=yt_canvas&utm_campaign=sleep_tips',
    ctaText: '📖 詳しい記事はこちら→',
  },
  {
    topic: 'ストレス解消の科学的方法',
    title: 'ストレスを科学的に解消する3ステップ🧘',
    narration: 'ストレス解消に科学的根拠のある方法を3つ紹介します。深呼吸4-7-8法、10分間のウォーキング、感謝日記を書くこと。これらはコルチゾールを実際に下げます。',
    points: ['4-7-8呼吸法を試す', '10分ウォーキングで気分転換', '感謝日記でポジティブ習慣'],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=yt_canvas&utm_campaign=stress_tips',
    ctaText: '📖 詳しい記事はこちら→',
  },
  {
    topic: '免疫力を上げる食事のポイント',
    title: '免疫力を上げる食べ物と食べ方のコツ🥗',
    narration: '免疫力を上げる食事のコツを3つ。腸活のためのヨーグルト・発酵食品、ビタミンCが豊富な緑黄色野菜、亜鉛を含む肉類と貝類。腸が整うと免疫も整います。',
    points: ['ヨーグルト・納豆で腸活', 'ビタミンC：緑黄色野菜を毎日', '亜鉛：牡蠣・肉類を週2回'],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=yt_canvas&utm_campaign=immunity_tips',
    ctaText: '📖 詳しい記事はこちら→',
  },
  {
    topic: 'メンタルヘルスの基本ケア',
    title: 'メンタルを整える毎日の3習慣🌿',
    narration: 'メンタルヘルスを整えるための毎日の習慣を3つ紹介します。朝日を浴びる、人と話す、自分を責めない。特に朝日は体内時計をリセットしてセロトニンを増やします。',
    points: ['朝日を15分浴びる', '1日1回誰かと話す', '自分へのセルフコンパッション'],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=yt_canvas&utm_campaign=mental_tips',
    ctaText: '📖 詳しい記事はこちら→',
  },
  {
    topic: '目の疲れを取る方法',
    title: 'PC・スマホ疲れの目を30秒で回復👁️',
    narration: 'デジタル疲れの目を回復する3つの方法。20-20-20ルールで定期的に遠くを見る、蒸しタオルで温める、意識的にまばたきを増やす。目の筋肉をほぐしましょう。',
    points: ['20分毎に20秒遠くを見る', '蒸しタオルで目を温める', 'まばたきを意識的に増やす'],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=yt_canvas&utm_campaign=eye_tips',
    ctaText: '📖 詳しい記事はこちら→',
  },
  {
    topic: '腰痛予防のストレッチ',
    title: 'デスクワーク腰痛を防ぐ3分ストレッチ💪',
    narration: 'デスクワーカーの腰痛予防ストレッチを3つ紹介します。股関節の屈伸、ハムストリングのストレッチ、腹筋を意識した骨盤前傾矯正。1時間に1回3分でOKです。',
    points: ['股関節屈伸30秒×2セット', 'ハムストリング前屈30秒', '腹筋意識で骨盤を立てる'],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=yt_canvas&utm_campaign=back_pain_tips',
    ctaText: '📖 詳しい記事はこちら→',
  },
  {
    topic: '水分補給の正しい方法',
    title: '正しい水分補給で体が変わる3つのポイント💧',
    narration: '水分補給の正しい方法を3つ教えます。起きたらすぐコップ1杯の水、食事と一緒には飲まない、スポーツ時は電解質入りの水を選ぶ。1日2リットルを目安に。',
    points: ['起床後すぐコップ1杯', '食中は飲み過ぎない', '運動時は電解質水を選ぶ'],
    siteUrl: 'health.asoventure.jp',
    fullUrl: 'https://health.asoventure.jp?utm_source=yt_canvas&utm_campaign=hydration_tips',
    ctaText: '📖 詳しい記事はこちら→',
  },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phase = url.searchParams.get('phase');
  if (phase !== 'canvas') {
    return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  }
  try {
    const idx = Math.floor(Math.random() * CANVAS_POOLS.length);
    const result = await phaseCanvas('health', CANVAS_POOLS[idx], CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
