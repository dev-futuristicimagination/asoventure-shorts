// app/api/preview-canvas/route.ts
// 【動画プレビュー専用エンドポイント】
// YouTube投稿なし・動画ファイルを直接ブラウザに返す
// 使い方: GET /api/preview-canvas?category=job&tts=1
// → mp4 ファイルがブラウザでダウンロード/再生される

import { NextResponse } from 'next/server';
import { generateCanvasVideo } from '@/lib/canvas';
import { generateDynamicContent } from '@/lib/gemini';

// カテゴリ別テスト用サンプルコンテンツ
const PREVIEW_CONTENT: Record<string, {
  topic: string; title: string; narration: string;
  points: string[]; siteUrl: string; fullUrl: string; ctaText: string;
}> = {
  job: {
    topic: '転職で年収アップする方法',
    title: '年収100万円アップの転職を成功させる5ステップ📈',
    narration: '転職で年収を大幅に上げるには戦略が必要です。まず転職サイトで市場価値を確認。年収交渉は内定後が鉄則。複数社から内定を取って交渉力を上げましょう。チャンネル登録で毎日キャリアtipsをお届けします。',
    points: [
      '① 転職サイトで市場価値を確認\n→ 同職種10件で相場がわかる',
      '② スキルの棚卸し・強みを整理\n→ 再現性ある実績が評価される',
      '③ 年収交渉は内定後に行う\n→ 最強の交渉カードは「内定を持っている」',
    ],
    siteUrl: 'job.asoventure.jp',
    fullUrl: 'https://job.asoventure.jp',
    ctaText: '💼 転職・キャリア記事はこちら→',
  },
  cheese: {
    topic: 'ガクチカAI自動生成',
    title: 'ES自動生成！就活生が知らないAIの使い方5選',
    narration: 'Cheese AIコーチを使えばガクチカが0分で完成します。LINEにひと言送るだけでAIがあなたの経験を整理して自己PRを作ります。無料で登録できるのでぜひ試してみてください。',
    points: [
      '① LINEで経験を話すだけ\n→ AIが自動でガクチカに変換',
      '② ES・自己PR・志望動機を一括生成\n→ 手直しも最小限でOK',
      '③ 面接想定QAも自動生成\n→ 対策時間を90%短縮',
    ],
    siteUrl: 'cheese.asoventure.jp',
    fullUrl: 'https://cheese.asoventure.jp',
    ctaText: '🧀 Cheese 無料登録はこちら→',
  },
  finance: {
    topic: 'NISA節税術',
    title: '手取り月30万の人が月5万増やした節税術3選',
    narration: '実はサラリーマンでも年間数十万円の節税が可能です。ふるさと納税・NISAの組み合わせで手取りが大幅に変わります。今すぐできる方法を3つ紹介します。',
    points: [
      '① ふるさと納税を限度額まで使う\n→ 年収500万で約7万円の節税効果',
      '② 新NISAで年360万まで非課税投資\n→ 複利効果で20年後に大きな差',
      '③ iDeCoで所得控除を最大化\n→ 毎月の掛金が全額控除対象に',
    ],
    siteUrl: 'finance.asoventure.jp',
    fullUrl: 'https://finance.asoventure.jp',
    ctaText: '💰 節税・投資記事はこちら→',
  },
  music1963: {
    topic: '昭和歌謡ランキングTOP5',
    title: '昭和歌謡ランキングTOP5！3位が意外すぎた【懐メロ】',
    narration: 'レコたんが選ぶ昭和名曲ランキングです。実は3位はあの大ヒット曲なんです。フルランキングはmusic1963.comで見られます。チャンネル登録でランキング更新通知が届きます。',
    points: [
      '🥇 1位: 川の流れのように（美空ひばり）\n→ 昭和の集大成・没後も愛され続ける名曲',
      '🥈 2位: 勝手にしやがれ（沢田研二）\n→ レコード大賞受賞・昭和を代表するロック',
      '🥉 3位: 実は…木綿のハンカチーフ\n→ 太田裕美の切なすぎる歌声が世代を超える',
    ],
    siteUrl: 'music1963.com',
    fullUrl: 'https://music1963.com',
    ctaText: '🎵 全ランキングはmusic1963.com→',
  },
  retro: {
    topic: 'ファミコン名作ランキング',
    title: 'ファミコン名作ランキングTOP5！3位が衝撃すぎた',
    narration: 'ファミコンの名作ゲームランキングです。実は3位は意外な作品なんです。retro.asoventureで全ランキングが見られます。チャンネル登録でレトロゲーム情報を毎日お届けします。',
    points: [
      '🥇 1位: スーパーマリオブラザーズ\n→ 世界累計4,024万本・ゲーム史を変えた伝説',
      '🥈 2位: ドラゴンクエスト\n→ 発売日に学校休む子が続出・社会現象に',
      '🥉 3位: 実は…メトロイド\n→ 女性主人公サムスの正体を知ったあの衝撃',
    ],
    siteUrl: 'retro.asoventure.jp',
    fullUrl: 'https://retro.asoventure.jp',
    ctaText: '🕹️ 全ランキングはこちら→',
  },
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'job';
  const enableTTS = searchParams.get('tts') === '1';
  const useGemini = searchParams.get('gemini') === '1'; // Geminiで動的生成するか

  const base = PREVIEW_CONTENT[category] ?? PREVIEW_CONTENT.job;

  try {
    let title = base.title;
    let narration = base.narration;
    let hookTitle: string | undefined;

    // Gemini動的生成（オプション）
    if (useGemini) {
      const generated = await generateDynamicContent(base.topic, base.narration, category);
      title = generated.title || base.title;
      narration = generated.narration || base.narration;
      hookTitle = generated.hookTitle;
    }

    console.log(`[Preview] category=${category} tts=${enableTTS} gemini=${useGemini}`);
    const startTime = Date.now();

    const videoBuffer = await generateCanvasVideo({
      category,
      title,
      hookTitle,
      points: base.points,
      narration,
      siteUrl: base.siteUrl,
      fullUrl: base.fullUrl,
      ctaText: base.ctaText,
      enableTTS,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Preview] 生成完了 ${elapsed}s size=${videoBuffer.length}B tts=${enableTTS}`);

    // 動画ファイルとしてブラウザに返す（ダウンロード）
    const filename = `preview_${category}_${enableTTS ? 'tts' : 'bgm'}_${Date.now()}.mp4`;
    return new Response(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Generation-Time': `${elapsed}s`,
        'X-TTS-Enabled': String(enableTTS),
        'X-Video-Size': String(videoBuffer.length),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Preview] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
