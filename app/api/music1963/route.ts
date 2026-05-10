// app/api/music1963/route.ts — レコたん（フクロウ♀）昭和歌謡 Shorts
// 【2026-05-10 就活クロスカテゴリトピック追加】昭和名曲 × 就活/生き方テーマで就活層にリーチ
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const REKOTAN = `2.5D anime VTuber "Rekotan": female owl, golden-brown feather hair, owl ear tufts, retro kimono-style dress with vinyl record motifs, vintage microphone prop. Nostalgic warm expression. 9:16 vertical.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🎵 昭和・平成の名曲フルランキングはこちら',
    '👇 music1963.com',
    'https://music1963.com?utm_source=youtube&utm_medium=shorts&utm_campaign=rekotan_music',
    '',
    '#昭和歌謡 #懐メロ #昭和 #Shorts #名曲 #ランキング #昭和アイドル #昭和音楽',
  ],
  tags: ['昭和歌謡', '懐メロ', '昭和', 'Shorts', '名曲', 'ランキング', '昭和アイドル', 'music1963'],
  ytCategoryId: '10',
};

const POOLS: ShortItem[] = [
  {
    topic: '昭和歌謡名曲ランキング',
    title: '昭和の名曲TOP3！レコたんが厳選🎵',
    narration: 'レコたんが選ぶ昭和の名曲TOP3を発表します！3位は「およげ！たいやきくん」、2位は「川の流れのように」、1位は「いい日旅立ち」！フルランキングはmusic1963.comで確認！',
    videoPrompt: `Opening thumbnail frame: ${REKOTAN} with golden TOP3 podium. Scene: countdown reveal of 3 classic songs with retro TV aesthetic. Album art animations, nostalgic vinyl record spinning. Warm sepia-tone with golden accents.`,
  },
  {
    topic: '昭和アイドル全盛期',
    title: '昭和アイドル黄金期！あの名曲を振り返る✨',
    narration: '昭和50〜60年代、アイドル全盛期の名曲たち。松田聖子、中森明菜、少年隊...懐かしい名前が続々。あの時代の音楽はなぜこんなに心に残るのか？music1963.comで全曲チェック！',
    videoPrompt: `Opening thumbnail frame: ${REKOTAN} surrounded by vintage idol photos. Scene: montage of era-appropriate animations - vinyl records, cassette tapes, retro TV sets. Warm nostalgic filters. 80s pop aesthetic.`,
  },
  {
    topic: '昭和の隠れた名曲',
    title: '知る人ぞ知る昭和の隠れた名曲5選🎶',
    narration: '今回はレコたんが選ぶ、あまり知られていない昭和の隠れた名曲5曲を紹介します。聴けばきっと「あ、これ知ってる！」ってなるはず。music1963.comで全曲紹介中！',
    videoPrompt: `Opening thumbnail frame: ${REKOTAN} with magnifying glass finding hidden gems. Scene: treasure chest opening to reveal vintage record labels. Mystery reveal animation for each song. Warm amber lighting.`,
  },
  {
    topic: '昭和から平成ヒット変遷',
    title: '昭和→平成！音楽の変化を解説🎤レコたん',
    narration: '昭和から平成へ。音楽スタイルはどう変わった？演歌・歌謡曲からJ-POPへ。バブル期のディスコサウンドから小室ファミリーまで。music1963.comで時代を旅しよう！',
    videoPrompt: `Opening thumbnail frame: ${REKOTAN} with timeline from Showa to Heisei era. Scene: visual timeline showing music style evolution. Record player to CD player to digital. Style transformation animation.`,
  },
  {
    topic: '夏の昭和ヒット曲',
    title: '夏に聴きたい昭和の名曲ベスト！レコたん🌊',
    narration: '夏になると聴きたくなる昭和の名曲たち。海、花火、青春...あの時代の夏ソングには特別な力があります。music1963.comで今年の夏プレイリストを作ろう！',
    videoPrompt: `Opening thumbnail frame: ${REKOTAN} at summer beach with retro radio. Scene: summer beach animation with retro aesthetic - fireworks, beach waves, vintage swimsuit fashion. Nostalgic summer BGM.`,
  },
  // === 【2026-05-10追加】就活×昭和クロスカテゴリ ===
  {
    topic: '昭和の名曲から学ぶ諦めない精神と就活',
    title: '就活生必見！昭和名曲が教える不屈の心3選🎵',
    narration: '就活がつらくなったとき、昭和の名曲が支えになる。「負けないで」「サライ」...不屈の精神は時代を超える。AIキャリアコーチとも組み合わせて内定を掴もう！',
    videoPrompt: `Opening thumbnail frame: ${REKOTAN} with graduation cap and vinyl record. Scene: motivated student finding strength in music. Inspiring classic J-pop visuals. Warm encouraging atmosphere. Career achievement theme.`,
  },
  {
    topic: '昭和サラリーマン文化と令和就活の違い',
    title: '昭和vs令和の就活！何が変わった？3選📊',
    narration: '昭和のサラリーマンは終身雇用・会社一筋が当たり前。令和の就活は自分の強みをAIで言語化して複数社にアプローチ。時代は変わった。あなたはどっちを選ぶ？',
    videoPrompt: `Opening thumbnail frame: ${REKOTAN} comparing vintage businessman vs modern job seeker. Scene: split screen showing vintage office vs modern workspace with AI tools. Contrast of eras with humor. Vintage to modern transition.`,
  },
  {
    topic: '昭和の働き方から学ぶ年収UPの本質',
    title: '昭和名曲に学ぶ！年収を上げる働き方3つ',
    narration: '昭和の労働観と令和の年収UP術は実は繋がっている。「誠実さ」「継続力」「チームワーク」は時代を超えて評価される。現代はそこにAIスキルが加わるだけ。',
    videoPrompt: `Opening thumbnail frame: ${REKOTAN} with vintage work scenes and modern career icons. Scene: timeline from Showa work ethic to AI-enhanced career. Inspiring transformation animation. Golden and blue color palette.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('music1963', POOLS));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('music1963', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
