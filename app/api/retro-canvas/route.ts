// app/api/retro-canvas/route.ts — レトロカルチャー Canvas動画
// 【2026-05-12 プロデューサー新設】
// ターゲット: 35〜54歳男性（YouTube実測視聴者属性と完全一致）
// 目的: retro.asoventure.jp への口頭誘導 + Amazon アフィリエイト流入
// コンテンツ: ファミコン・スーファミ・昭和アニメ・平成Jpop・たまごっち・ミニ四駆
// フォーマット: ランキング型・比較型・懐かし暴露型（いいね率高パターン）

import { NextResponse } from 'next/server';
import { phaseCanvas } from '@/lib/pipeline';
import type { CanvasItem, CtaConfig } from '@/lib/types';

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '🕹️ レトロカルチャー記事はこちら',
    '👇 Asoventure Retro',
    'https://retro.asoventure.jp?utm_source=youtube&utm_medium=canvas&utm_campaign=retro_canvas',
    '',
    '👍 いいね & 🔔 チャンネル登録お願いします！',
    '#レトロゲーム #昭和 #平成 #懐かし #Shorts',
  ],
  tags: ['レトロゲーム', '昭和', '平成', '懐かし', 'ファミコン', 'Shorts'],
  ytCategoryId: '24', // Entertainment
};

const CANVAS_POOLS: CanvasItem[] = [
  // ─── ランキング型（ループ率★★★）───────────────────────────────────────
  {
    topic: 'ファミコン名作ランキングTOP5',
    title: 'ファミコン名作ランキングTOP5！3位が衝撃すぎた【昭和平成】',
    narration: 'ファミコンの名作ゲームを知っていますか？あの頃夢中になったタイトルをランキングにしました。実は3位は意外なあの作品です。最後まで見ないと損しますよ。「レトロasoventureで検索」で全ランキングが見られます。',
    points: [
      '🥇 1位: スーパーマリオブラザーズ（1985）\n→ 世界累計4,024万本・ゲーム史を変えた伝説',
      '🥈 2位: ドラゴンクエスト（1986）\n→ 発売日に学校休む子供が続出・社会現象に',
      '🥉 3位: 実は…メトロイド（1986）\n→ 女性主人公サムスの正体を知ったあの衝撃',
      '4位: ロックマン2（1988）\n→ 音楽が神がかり・BGMを今も口ずさめる人多数',
      '5位: 忍者龍剣伝（1988）\n→ ムービーシーン搭載で当時は映画を超えた',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp/game/famicom-ranking?utm_source=yt_canvas',
    ctaText: '🕹️ ファミコン全ランキングはこちら→',
  },
  {
    topic: 'スーファミRPG名作ランキング',
    title: 'スーファミRPG名作ランキングTOP5！今でも遊べる神ゲー',
    narration: 'スーパーファミコンのRPGは今遊んでも面白い神ゲーがたくさんあります。実はあのゲームが1位じゃないと知っていましたか？「レトロasoventureで検索」で全ランキング確認できます。',
    points: [
      '🥇 1位: クロノ・トリガー（1995）\n→ 時間旅行テーマ・エンディング13種・完璧な作品',
      '🥈 2位: ファイナルファンタジーVI（1994）\n→ 14人のキャラ全員に物語・大人のRPGの到達点',
      '🥉 3位: 聖剣伝説2（1993）\n→ リングコマンドの発明・3人マルチで何時間も遊んだ',
      '4位: ドラゴンクエストV（1992）\n→ 花嫁選択・子供時代から父親になる壮大な物語',
      '5位: マザー2（1994）\n→ 糸井重里の天才ライティング・ラスボス戦が今も語り継がれる',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp/game/superfamicom-rpg?utm_source=yt_canvas',
    ctaText: '🕹️ スーファミRPG全ガイドはこちら→',
  },
  // ─── 比較型・暴露型（いいね率★★★）──────────────────────────────────────
  {
    topic: 'ドラクエよりFFが上だった理由',
    title: 'ドラクエよりFFが上だった時代があった理由【昭和平成ゲーム史】',
    narration: '実はドラクエとFFどちらが上かという議論は永遠に続きます。でも1990年代にFFが逆転した時期があったのを知っていましたか？その理由は音楽でも戦闘でもなく、あの要素です。',
    points: [
      '理由① FF4（1991）でシネマティックRPGを発明\n→ ストーリー演出でドラクエを一気に追い越した',
      '理由② FF7（1997）で3D・ムービーCGで衝撃\n→ ドラクエ7（2000）の3年前に次元が違う表現',
      '理由③ 音楽の植松伸夫 vs すぎやまこういち\n→ 実はどちらも別次元の天才・比べること自体が野暮',
      '結論: 今も続く議論こそがRPG黄金時代の証\n→ retro.asoventure.jp で全ゲーム史を読む',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp/game/dragonquest-vs-ff?utm_source=yt_canvas',
    ctaText: '🕹️ ドラクエvsFF徹底比較はこちら→',
  },
  {
    topic: 'たまごっちが社会現象になった本当の理由',
    title: 'たまごっちが社会問題になった本当の理由【平成レトロ】',
    narration: '1996年にたまごっちが発売されて大社会現象になりました。でも本当の理由は「可愛いから」じゃないって知っていましたか？あの時代にしか生まれなかった特別な要因があります。',
    points: [
      '理由① 「死」という概念を初めて手のひらに乗せた\n→ 当時の子供が初めて命の責任を感じたデジタル体験',
      '理由② 学校への持ち込み禁止→希少性・欲求が爆発\n→ 禁止されるほど欲しくなる人間心理を突いた',
      '理由③ 「友達のたまごっちと通信できる」という革命\n→ SNSのない時代のつながりがたまごっちだった',
      '余談: 2023年に復刻版が240万個売れた理由\n→ 35〜40代が「子供に体験させたい」と購入殺到',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp/toy/tamagotchi?utm_source=yt_canvas',
    ctaText: '🕹️ たまごっち全歴史はこちら→',
  },
  // ─── 懐かしシェア型（拡散率★★★）─────────────────────────────────────
  {
    topic: '昭和歌謡ランキングTOP5',
    title: '昭和歌謡ランキングTOP5！今でも口ずさめる名曲',
    narration: '昭和の名曲、今でも口ずさめますか？実はこのランキング1位は全世代で知っている、あの歌です。「レトロasoventureで検索」で全ランキングを確認できます。',
    points: [
      '🥇 1位: 川の流れのように（美空ひばり/1989）\n→ 昭和最後の名曲・世界が認めた日本の至宝',
      '🥈 2位: また逢う日まで（尾崎紀世彦/1971）\n→ レコード大賞・今でもカラオケ不朽の名曲',
      '🥉 3位: 勝手にしやがれ（沢田研二/1977）\n→ ジュリーの色気が時代を超えて刺さる',
      '4位: 赤いスイートピー（松田聖子/1982）\n→ 松本隆×細野晴臣の奇跡のコラボ',
      '5位: 少女A（中森明菜/1982）\n→ 不良少女イメージが当時の常識をぶち破った',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp/music/showa-ranking?utm_source=yt_canvas',
    ctaText: '🎵 昭和歌謡全ランキングはこちら→',
  },
  {
    topic: '平成Jpopランキングとあの名曲',
    title: '平成Jpopランキングで衝撃の事実が判明した【30代40代必見】',
    narration: '平成のJpopを振り返ると、実はあの時代がJpopの黄金期だったことがわかります。30代40代の方なら必ず知っているあの曲が、なぜ今でも通用するのか解説します。',
    points: [
      '黄金期① 1995〜2000年: ミリオン連発時代\n→ globe・SPEED・Every Little Thing・宇多田ヒカル',
      '黄金期② 宇多田ヒカル「First Love」765万枚\n→ 日本の音楽史上最も売れたアルバムの事実',
      '黄金期③ CDが売れなくなった2010年代との差\n→ テレビ・カラオケ・CD文化の三位一体が崩れた',
      '今でも通用する理由: メロディーラインの強さ\n→ サビがないと生き残れなかった平成Jpopの法則',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp/music/heisei-jpop?utm_source=yt_canvas',
    ctaText: '🎵 平成Jpop全ランキングはこちら→',
  },
  {
    topic: 'ドラゴンボールZ世代が知らない裏話',
    title: 'ドラゴンボールZ世代が知らない裏話3選【昭和平成アニメ】',
    narration: 'ドラゴンボールZを子供の頃見ていた人に聞いてほしいことがあります。実はあのシーンは予算の都合で生まれた即興だったり、声優さんが知らなかったことが多いんです。',
    points: [
      '裏話① フリーザ戦が長引いたのは編集方針のせい\n→ 原作の圧縮率が追いつかず「引き延ばし」が誕生',
      '裏話② 悟空の声・野沢雅子さんは孫一家全員担当\n→ 悟空・悟飯・悟天・悟空少年期の4役を同時演技',
      '裏話③ 「カカロット！」セリフの誕生は偶然だった\n→ ベジータの名シーンは台本にない即興だったという説',
      '🕹️ レトロアニメ全裏話はretro.asoventure.jpで',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp/anime/dragonball-z?utm_source=yt_canvas',
    ctaText: '🎌 ドラゴンボール全ガイドはこちら→',
  },
  {
    topic: 'ミニ四駆が社会現象になった理由',
    title: 'ミニ四駆が2度も社会現象になった理由【昭和平成レトロ】',
    narration: 'ミニ四駆が1980年代と1990年代に2度も大ブームになったのを知っていますか？実は2度目のブームの仕掛け人は子供ではなく、意外なあのグループでした。',
    points: [
      '第1次ブーム（1985〜1988）: 「レーサーミニ四駆」\n→ 田宮模型とコロコロコミックの完璧なメディア戦略',
      '第2次ブーム（1994〜1999）: 「爆走兄弟レッツ&ゴー!!」\n→ アニメ×コロコロで小学生が全員ミニ四駆に',
      '意外な仕掛け人: 実は大人（お父さん世代）\n→ 第1次ブームを体験した父親が「子供に買う」という連鎖',
      '2024年現在も: 国内市場が年100億円規模で継続\n→ 大人向け限定版が即完売する不滅のブランド力',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp/toy/mini-yonku?utm_source=yt_canvas',
    ctaText: '🕹️ ミニ四駆全歴史はこちら→',
  },
  {
    topic: 'セーラームーンが世界を変えた理由',
    title: 'セーラームーンが世界のアニメを変えた本当の理由【平成アニメ史】',
    narration: '美少女戦士セーラームーンは日本だけでなく世界のアニメ史を変えました。実はその理由は「可愛い変身」ではなく、ある革命的な設定にあります。',
    points: [
      '革命① 戦う少女ヒーローという概念の発明\n→ 守られるだけだった少女が戦う側になった転換点',
      '革命② 5人の個性＋恋愛＋友情の三位一体\n→ 少女漫画×バトルの掛け算を世界で初めて実現',
      '革命③ 欧米での爆発的ヒット（80カ国以上）\n→ 日本アニメが初めて「クール・ジャパン」になった瞬間',
      '現在: 30年後も新グッズが即完売\n→ 35〜45歳女性の「ノスタルジア消費」が最強',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp/anime/sailor-moon?utm_source=yt_canvas',
    ctaText: '🎌 セーラームーン全ガイドはこちら→',
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (phase !== 'canvas') return NextResponse.json({ error: 'phase=canvas required' }, { status: 400 });
  try {
    const item = CANVAS_POOLS[Math.floor(Math.random() * CANVAS_POOLS.length)];
    const result = await phaseCanvas('retro', item, CTA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
