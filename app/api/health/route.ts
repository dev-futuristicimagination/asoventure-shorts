// app/api/health/route.ts — 健康・メンタルtips Shorts
// 【2026-05-08 プロデューサー判断による全面改良】
// ✅ キャラ名（パンダ子）をタイトルから除外 → 情報系タイトルに統一
// ✅ 就活生×社会人の最大公約数をターゲット（Cheese LINE CTA追加）
// ✅ 「〇〇する方法N選」「なぜ〇〇なのか」「〇〇の人が知らないこと」
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const PANDAKO = `2.5D anime style VTuber character "Pandako": young female Giant Panda, white and black fur, black panda eye markings, white-silver short bob hair, green sports jacket with white stripes and red medical cross badge, white shorts, black fingerless gloves, holds red apple and water bottle. Energetic healthy expression. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💚 就活・仕事のストレスをAIに相談してみよう',
    '🧀 Cheese 無料LINE登録',
    'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=health_info',
    '',
    '#健康 #メンタルヘルス #ストレス解消 #就活 #睡眠 #生産性 #Shorts',
  ],
  tags: ['健康', 'メンタルヘルス', 'ストレス解消', '就活', '睡眠改善', '集中力', 'Shorts', '生産性'],
  ytCategoryId: '26',
};

const POOLS: ShortItem[] = [
  // === A: 逆説型 ===
  {
    topic: '睡眠時間より睡眠の質が集中力を決める理由',
    title: '睡眠時間より睡眠の質が集中力を決める科学的な理由',
    narration: '8時間寝ても疲れが取れない人はいませんか？実は睡眠の「質」が「量」より重要です。深い睡眠を取るには、寝る90分前の入浴、部屋温度18〜20℃、スマホを充電器から離すことが効果的。',
    videoPrompt: `Opening scene: ${PANDAKO} showing 8h clock vs quality sleep diagram. Scene: Sleep quality visualization with deep sleep waves. Three tips appearing with satisfying implementation animations. Scientific aesthetic with calm blue tones.`,
  },
  {
    topic: '運動より食事がメンタルを安定させる理由',
    title: '運動より食事がメンタルを安定させる理由【科学的根拠あり】',
    narration: 'メンタルが不安定な人に足りていない栄養素がほぼ決まっています。トリプトファン（セロトニンの原料）・マグネシウム・ビタミンD。納豆・バナナ・鮭を週3回食べるだけで変わります。',
    videoPrompt: `Opening scene: ${PANDAKO} holding food items glowing with mental health benefits. Scene: Nutritional pathway showing food→brain chemistry visualization. Mental stability meter rising with each healthy food. Colorful and energetic animation.`,
  },
  // === B: 数字+問題型 ===
  {
    topic: '就活ストレスを3分で解消する方法',
    title: '就活のストレスを3分で解消する方法3選【科学的に効果あり】',
    narration: '就活のプレッシャーを即効で解消する方法が3つあります。①4-7-8呼吸法（4秒吸う・7秒止める・8秒吐く）②5分間の散歩③「今日うまくいったこと」を3つ書く。全部3分以内でできます。',
    videoPrompt: `Opening scene: ${PANDAKO} stress meter going from red to green with timer showing 3 minutes. Scene: Three techniques demonstrated in sequence - breathing pattern animation, quick walk visualization, gratitude journaling. Scientific effectiveness indicators.`,
  },
  {
    topic: '集中力が続かない人が知らない5つの原因',
    title: '集中力が続かない人が知らない本当の原因5つ',
    narration: '集中できないのは意志力の問題ではありません。①血糖値の急上昇下落②デジタル通知③水分不足（2%の脱水で集中力30%低下）④室温（26℃以上で急低下）⑤ポモドーロ未使用。まず水を飲もう。',
    videoPrompt: `Opening scene: ${PANDAKO} with concentration meter showing 5 leak points. Scene: Each cause revealed with dramatic "Aha!" animation. Solutions appearing next to each problem. Brain activation visualization with increasing focus levels.`,
  },
  {
    topic: '免疫力を上げる食べ物TOP3',
    title: '免疫力が上がる食べ物TOP3と正しい食べ方',
    narration: '免疫力を上げるなら、①ヨーグルト（腸内環境の改善）②キノコ類（βグルカンで免疫活性化）③緑茶（カテキンが抗菌）。大事なのは毎日少量を続けること。1日置きより毎日少量の方が効果的です。',
    videoPrompt: `Opening scene: ${PANDAKO} with immunity shield getting stronger with three food items. Scene: Yogurt, mushrooms, green tea each creating protective barrier animation. Consistency vs quantity comparison. Vibrant healthy food aesthetic.`,
  },
  // === C: How to型 ===
  {
    topic: '朝5分でできる最強のコンディション作り',
    title: '朝5分でコンディションが整う最強ルーティン【科学的根拠あり】',
    narration: '朝5分の投資で1日のパフォーマンスが変わります。①コップ一杯の水（睡眠中の脱水を補う）②太陽光を30秒浴びる（体内時計リセット）③今日のタスクを3つだけ決める（認知負荷を下げる）。',
    videoPrompt: `Opening scene: ${PANDAKO} in bright morning with 5-minute timer. Scene: Three morning rituals with scientific benefit labels. Energy levels rising with each action. Morning sunshine and fresh energy aesthetic.`,
  },
  {
    topic: '目の疲れを20秒で解消する20-20-20ルール',
    title: '目の疲れが20秒で取れる20-20-20ルール【PC作業必見】',
    narration: 'パソコン作業で目が疲れている人は「20-20-20ルール」を試してください。20分ごとに、20フィート（約6m）先を、20秒間見る。これだけで目の筋肉の緊張がほぐれます。タイマーをセットしよう。',
    videoPrompt: `Opening scene: ${PANDAKO} with tired red eyes then refreshed bright eyes. Scene: 20-20-20 timer animation with distance visualization. Eye muscle relaxation shown as expanding rings. PC worker transformation aesthetic.`,
  },
  {
    topic: '夜の睡眠準備で翌日の生産性が変わる方法',
    title: '寝る前の30分の過ごし方で翌日の生産性が決まる理由',
    narration: '翌日の仕事の質は、実は前夜の過ごし方で決まります。寝る30分前にやるべきこと：①明日のタスクを3つ紙に書く②スマホをベッドから遠ざける③室温を下げる。寝る直前のスマホが最もNGです。',
    videoPrompt: `Opening scene: ${PANDAKO} preparing for sleep with evening routine checklist. Scene: Three pre-sleep rituals with brain preparation visualization. Next-day performance preview showing high productivity. Before/after sleep quality comparison.`,
  },
  {
    topic: '食事制限なしでダイエットする方法',
    title: '食事制限なしで体重が落ちる理由と正しいアプローチ',
    narration: '食事制限ダイエットが続かない理由は「ストレスホルモンが食欲を増やす」から。正解は①食事の質を上げる（GI値が低いものを選ぶ）②食べる順番を変える（野菜→タンパク質→炭水化物）③7時間以上睡眠。',
    videoPrompt: `Opening scene: ${PANDAKO} showing food restriction crossed out vs quality food glowing. Scene: Low GI foods presented as premium choices, eating order visualization, sleep-metabolism connection animation. Science-backed weight management aesthetic.`,
  },
  {
    topic: 'メンタルを強くする習慣3つ',
    title: 'メンタルが強い人が毎日やっている習慣3つ',
    narration: 'メンタルが強い人は生まれつきではありません。①認知の歪みを直す（最悪を想定しすぎない）②感謝日記を書く（ネガティブバイアスをリセット）③適切な距離を置く（全員に好かれようとしない）。',
    videoPrompt: `Opening scene: ${PANDAKO} with mental strength meter being actively maintained. Scene: Three daily habits as armor pieces clicking into place. Cognitive distortion being corrected, gratitude journal glowing, healthy boundary visualization.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('health', POOLS));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('health', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
