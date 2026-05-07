// app/api/health/route.ts — パンダ子（パンダ♀）健康tips Shorts
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const PANDAKO = `2.5D anime style VTuber character "Pandako": young female Giant Panda, white and black fur, black panda eye markings, white-silver short bob hair, green sports jacket with white stripes and red medical cross badge, white shorts, black fingerless gloves, holds red apple and water bottle. Energetic healthy expression. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💚 毎日30秒の健康tips配信中！',
    '👉 チャンネル登録で見逃しゼロ',
    'https://www.youtube.com/@asoventure_project?utm_source=shorts&utm_medium=desc&utm_campaign=pandako_health',
    '',
    '#健康 #健康習慣 #睡眠 #ストレス解消 #メンタルヘルス #ダイエット #Shorts',
  ],
  tags: ['健康', '健康習慣', '睡眠改善', 'ストレス解消', 'メンタルヘルス', 'ダイエット', 'Shorts', '30秒tips'],
  ytCategoryId: '26',
};

const POOLS: ShortItem[] = [
  {
    topic: '睡眠の質を上げる方法',
    title: '睡眠の質が劇的に上がる！パンダ子の3つのtips💤',
    narration: '睡眠不足で集中できてない？寝る1時間前にスマホを置いて、部屋を少し暗くして、温かい飲み物を飲む。これだけで睡眠の質がグンと上がります！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${PANDAKO} holding pillow with sleepy cozy expression, bold white text "睡眠の質UP！3つのtips" at top. Scene: Pandako demonstrates 3 sleep tips in sequence - putting down phone, dimming lights, drinking warm tea. Each tip shown with satisfying result animation. Peaceful bedroom setting.`,
  },
  {
    topic: 'ストレス解消法',
    title: '就活のストレス、今すぐ解消！パンダ子流メソッド🌿',
    narration: '就活のプレッシャー、しんどいよね。まず深呼吸を3回。次に好きな音楽を1曲聴く。最後に5分間散歩する。この3ステップを試してみて！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${PANDAKO} with stress lines then relaxed smile, bold white text "ストレス即解消！" at top. Scene: Pandako demonstrates deep breathing, music listening with headphones, short walk. Each step shows tension melting away with color changing from grey to bright green. Nature sounds BGM.`,
  },
  {
    topic: '朝のルーティン',
    title: '朝5分で一日が変わる！パンダ子の最強モーニング☀️',
    narration: 'いい一日は朝で決まる。起きたらコップ一杯の水、ストレッチ1分、今日のタスクを3つ決める。たったこれだけで生産性が全然違います！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${PANDAKO} stretching with sunrise background, bold white text "朝5分モーニングルーティン！" at top. Scene: Quick montage - Pandako drinks water with sparkle effect, does quick stretch with energy bars filling up, writes 3 tasks on glowing notepad. Sunrise colors, upbeat morning music.`,
  },
  {
    topic: '目の疲れ対策',
    title: '画面見すぎで目が痛い？パンダ子の即効ケア👁️',
    narration: '就活でパソコンやスマホを見る時間が増えてる人へ。20-20-20ルールを試して！20分ごとに20フィート先を20秒見る。簡単で効果抜群です！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${PANDAKO} with tired eyes then refreshed expression, bold white text "目の疲れ即解消！" at top. Scene: Pandako demonstrates 20-20-20 rule - shows timer, looks at distance, eyes sparkle with refreshed glow. Computer and phone visible in scene. Office + nature combined setting.`,
  },
  {
    topic: '免疫力アップ食品',
    title: '免疫力を上げる食べ物TOP3！パンダ子が選ぶ🥗',
    narration: '免疫力を上げたいなら、ヨーグルト・キノコ類・緑茶を食べて。腸活しながら体の防御力もアップ。就活本番に備えて体を作ろう！チャンネル登録で毎日tips！',
    videoPrompt: `Opening thumbnail frame: ${PANDAKO} presenting 3 glowing food items, bold white text "免疫力UP！食材TOP3" at top. Scene: Pandako introduces yogurt, mushrooms, green tea one by one, each creating protective shield animation around her. Health bars filling up. Colorful food styling.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('health', POOLS, 'health-used-idx'));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('health', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
