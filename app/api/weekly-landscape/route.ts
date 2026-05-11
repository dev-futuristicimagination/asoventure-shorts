// app/api/weekly-landscape/route.ts
// 【2026-05-12 プロデューサー追加】週1回の横型YouTube動画生成パイプライン
//
// 目的:
//   Shorts（縦型）はエンドカードNG → 横型動画（16:9）でエンドカードを設定し
//   視聴者をサービスサイトへ直接誘導するための「橋渡し動画」を週1本生成する
//
// 動画フォーマット:
//   - 解像度: 1280x720 (HD 16:9)
//   - 尺: 40〜60秒（エンドカードに20秒必要なため）
//   - 内容: Shortsの「まとめ」または「詳しく解説」版
//   - エンドカード: 後半20秒にチャンネル登録 + サービスリンク
//
// Cron: 毎週月曜 9:00 JST (vercel.json)
// 手動: curl -H "Authorization: Bearer test123" https://asoventure-shorts.vercel.app/api/weekly-landscape

import { NextResponse } from 'next/server';
import { getYouTubeToken, uploadLandscapeToYouTube, postToBuffer } from '../../../lib/youtube';
import { generateDynamicContent, notifyDiscord } from '../../../lib/gemini';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import satori from 'satori';
import { readFile as fsReadFile } from 'fs/promises';
import type { ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;
const execFileAsync = promisify(execFile);

const CRON_SECRET = process.env.CRON_SECRET || 'test123';

// カテゴリローテーション（週ごとに切り替え）
// 月: job, 火: cheese, 水: health, 木: finance, 金: life
const WEEKLY_CATEGORIES = ['job', 'cheese', 'health', 'finance', 'life'];

// カテゴリ別コンテンツ設定
const CATEGORY_CONFIG: Record<string, {
  topic: string;
  points: string[];
  serviceUrl: string;
  serviceDesc: string;
  tags: string[];
  accentColor: string;
}> = {
  job: {
    topic: '転職で年収100万円上げる人がやっていること【完全解説】',
    points: [
      '① 転職市場の現実：30代の転職成功率は業界平均73%',
      '② 自己PRは「数字+実績+再現性」の三点セットで作る',
      '③ 面接官が必ず聞く「なぜ転職？」完璧な答え方',
      '④ 年収交渉のゴールデンタイミングと失敗しない言い方',
      '⑤ AI時代のキャリア戦略 - 5年後も市場価値を保つ方法',
    ],
    serviceUrl: 'https://job.asoventure.jp',
    serviceDesc: '転職・キャリアアップの情報はjob.asoventure.jpへ',
    tags: ['転職', 'キャリア', '年収UP', '面接対策', 'AI転職'],
    accentColor: '#F5A623',
  },
  cheese: {
    topic: 'AIがES・ガクチカを自動生成！就活生が知らないAI活用術',
    points: [
      '① 就活のES作成に平均20時間かかっている現実',
      '② Asoventure CheeseはLINEに送るだけでESを自動生成',
      '③ ガクチカ・自己PRを構造化して採用担当に刺さる文章に',
      '④ 無料プランで3回試せる・Pro月額¥498で無制限',
      '⑤ 大手・ベンチャー双方に通じる「再現性のある自己PR」の作り方',
    ],
    serviceUrl: 'https://cheese.asoventure.jp',
    serviceDesc: 'AIでES・ガクチカを自動生成！cheese.asoventure.jpへ',
    tags: ['就活', 'ES', 'ガクチカ', 'AI就活', '内定'],
    accentColor: '#FFD700',
  },
  health: {
    topic: '科学が証明した「疲れない体」の作り方【30代向け完全版】',
    points: [
      '① 慢性疲労の原因82%は「睡眠の質」ではなく「栄養バランス」',
      '② マグネシウム・ビタミンD・鉄分の三大不足栄養素',
      '③ 15分昼寝の科学：午後の生産性が34%向上するデータ',
      '④ 運動は「週3×20分」で十分な理由（長時間は逆効果）',
      '⑤ ストレスホルモン（コルチゾール）を下げる朝の習慣5選',
    ],
    serviceUrl: 'https://health.asoventure.jp',
    serviceDesc: '健康・ウェルネス情報はhealth.asoventure.jpへ',
    tags: ['健康', '疲労回復', '睡眠', '栄養', 'ウェルネス'],
    accentColor: '#4CAF50',
  },
  finance: {
    topic: '30代から始めるNISA完全ガイド【2026年最新版】',
    points: [
      '① NISA改正2024：年360万円 × 非課税期間無期限の衝撃',
      '② つみたて投資枠と成長投資枠の使い分け戦略',
      '③ 月3万円を30年積み立てると元本1080万→推計2400万円',
      '④ 初心者に最適な銘柄：eMAXIS Slim全世界株式の1択理由',
      '⑤ 手数料0.1%の違いが30年で数百万円の差になる計算式',
    ],
    serviceUrl: 'https://finance.asoventure.jp',
    serviceDesc: '投資・マネー情報はfinance.asoventure.jpへ',
    tags: ['NISA', '投資', '節約', '副業', 'お金の勉強'],
    accentColor: '#FF9800',
  },
  life: {
    topic: '家事を週3時間に短縮した「時短術」完全公開',
    points: [
      '① 家事の「見える化」：週60分家事リスト作成で無駄を発見',
      '② 食洗機 + 乾燥機付き洗濯機 = 年間240時間の節約',
      '③ まとめ料理（週1×2時間）で平日の料理を完全排除',
      '④ 掃除は「ながら掃除」で1回5分×5箇所に分散する',
      '⑤ 家事シェアのコツ：役割分担ではなく「仕組み化」が鍵',
    ],
    serviceUrl: 'https://life.asoventure.jp',
    serviceDesc: '暮らし・ライフスタイル情報はlife.asoventure.jpへ',
    tags: ['時短', '家事', '暮らし', 'ライフハック', '主婦'],
    accentColor: '#00BCD4',
  },
};

// 横型フレーム生成（1280x720）
async function generateLandscapeFrame(
  slideIndex: number,
  title: string,
  points: string[],
  accentColor: string,
  category: string,
): Promise<Buffer> {
  const W = 1280, H = 720;
  const fontPath = join(process.cwd(), 'public', 'fonts', 'NotoSansJP-satori.ttf');
  let fontData: ArrayBuffer;
  try {
    fontData = (await fsReadFile(fontPath)).buffer as ArrayBuffer;
  } catch {
    fontData = new ArrayBuffer(0);
  }

  const isHook = slideIndex === 0;
  const isCTA = slideIndex === points.length + 1;

  let content: ReactNode;
  if (isHook) {
    content = {
      type: 'div',
      props: {
        style: {
          display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`,
          background: `linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0d0d2b 100%)`,
          padding: '60px', justifyContent: 'center', position: 'relative',
        },
        children: [
          { type: 'div', props: { style: { display: 'flex', background: accentColor, color: '#000', padding: '8px 20px', borderRadius: '4px', fontSize: '20px', fontWeight: 'bold', marginBottom: '24px', width: 'fit-content' }, children: [category.toUpperCase()] } },
          { type: 'div', props: { style: { display: 'flex', fontSize: '52px', fontWeight: 'bold', color: '#FFFFFF', lineHeight: 1.3, marginBottom: '32px', borderLeft: `6px solid ${accentColor}`, paddingLeft: '24px' }, children: [title] } },
          { type: 'div', props: { style: { display: 'flex', fontSize: '24px', color: '#AAAAAA' }, children: [`この動画を最後まで見れば全て分かります`] } },
        ],
      },
    } as unknown as ReactNode;
  } else if (isCTA) {
    content = {
      type: 'div',
      props: {
        style: {
          display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`,
          background: `linear-gradient(135deg, #0a1628 0%, #1a2a3a 100%)`,
          padding: '60px', justifyContent: 'center', alignItems: 'center',
        },
        children: [
          { type: 'div', props: { style: { display: 'flex', fontSize: '40px', fontWeight: 'bold', color: accentColor, marginBottom: '24px' }, children: ['まとめ'] } },
          { type: 'div', props: { style: { display: 'flex', fontSize: '28px', color: '#FFFFFF', textAlign: 'center', marginBottom: '40px' }, children: ['チャンネル登録で毎日役立つ情報をお届け！'] } },
          { type: 'div', props: { style: { display: 'flex', background: accentColor, color: '#000', padding: '16px 40px', borderRadius: '8px', fontSize: '28px', fontWeight: 'bold' }, children: ['🔔 チャンネル登録 & 高評価お願いします！'] } },
        ],
      },
    } as unknown as ReactNode;
  } else {
    const point = points[slideIndex - 1];
    content = {
      type: 'div',
      props: {
        style: {
          display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`,
          background: `linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)`,
          padding: '60px 80px', justifyContent: 'center',
        },
        children: [
          { type: 'div', props: { style: { display: 'flex', fontSize: '18px', color: accentColor, marginBottom: '16px' }, children: [`POINT ${slideIndex} / ${points.length}`] } },
          { type: 'div', props: { style: { display: 'flex', fontSize: '40px', fontWeight: 'bold', color: '#FFFFFF', lineHeight: 1.5, borderLeft: `5px solid ${accentColor}`, paddingLeft: '24px' }, children: [point] } },
        ],
      },
    } as unknown as ReactNode;
  }

  const svg = await satori(content, {
    width: W, height: H,
    fonts: fontData.byteLength > 0 ? [{ name: 'NotoSansJP', data: fontData, weight: 400 }] : [],
  });

  return await sharp(Buffer.from(svg)).png({ compressionLevel: 7 }).toBuffer();
}

// 横型動画生成（FFmpeg）
async function generateLandscapeVideo(
  category: string,
  title: string,
  points: string[],
  accentColor: string,
): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const tmpDir = await mkdtemp(join(tmpdir(), 'landscape-'));
  const slideCount = points.length + 2; // hook + points + cta
  const secPerSlide = 8; // 8秒/スライド（5点 = 56秒の動画）

  // 全スライドを生成
  const framePaths: string[] = [];
  for (let i = 0; i < slideCount; i++) {
    const frameBuf = await generateLandscapeFrame(i, title, points, accentColor, category);
    const framePath = join(tmpDir, `slide${i}.png`);
    await writeFile(framePath, frameBuf);
    framePaths.push(framePath);
  }

  // concat用リストファイル作成
  const concatList = framePaths.map(p => `file '${p}'\nduration ${secPerSlide}`).join('\n');
  // 最後のフレームを繰り返す（FFmpeg concat demuxer の必要仕様）
  const lastFrame = framePaths[framePaths.length - 1];
  const concatContent = concatList + `\nfile '${lastFrame}'`;
  const concatPath = join(tmpDir, 'concat.txt');
  await writeFile(concatPath, concatContent);

  const outPath = join(tmpDir, 'landscape.mp4');

  await execFileAsync(ffmpeg, [
    '-y',
    // Input 0: スライドショー（concat demuxer）
    '-f', 'concat', '-safe', '0', '-i', concatPath,
    // Input 1: BGM（lavfi生成）
    '-f', 'lavfi',
    '-i', `aevalsrc='0.3*sin(2*PI*220*t)+0.2*sin(2*PI*329.6*t)+0.15*sin(2*PI*440*t):c=stereo:s=44100'`,
    '-filter_complex', [
      // 映像: 16:9にスケール
      '[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30[vid]',
      // BGM: ソフトなアンビエント
      '[1:a]volume=0.3,aecho=0.7:0.8:40:0.2[bgm]',
    ].join(';'),
    '-map', '[vid]',
    '-map', '[bgm]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
    '-c:a', 'aac', '-b:a', '192k',
    '-t', String(slideCount * secPerSlide),
    '-movflags', '+faststart',
    outPath,
  ], { maxBuffer: 512 * 1024 * 1024 });

  const result = await readFile(outPath);
  await rm(tmpDir, { recursive: true }).catch(() => {});
  return result;
}

export async function GET(request: Request): Promise<NextResponse> {
  // 認証
  const auth = request.headers.get('authorization') || '';
  if (!auth.replace('Bearer ', '') || auth.replace('Bearer ', '') !== CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 今週の曜日からカテゴリを選択（月=0, 火=1, ...）
    const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...
    const categoryIndex = dayOfWeek === 0 ? 0 : (dayOfWeek - 1) % WEEKLY_CATEGORIES.length;
    const category = WEEKLY_CATEGORIES[categoryIndex];
    const config = CATEGORY_CONFIG[category];

    await notifyDiscord(`[Landscape] 横型動画生成開始: ${category} - "${config.topic}"`);

    // Geminiでナレーション/説明文生成（横型版）
    const generated = await generateDynamicContent(config.topic, config.points.join('\n'), category);
    const finalTitle = generated.title || config.topic;

    // 横型動画生成
    const videoBuffer = await generateLandscapeVideo(
      category, finalTitle, config.points, config.accentColor
    );

    // 説明文作成（横型はURLを目立つ位置に配置）
    const LINKTREE = 'https://linktr.ee/asoventure';
    const description = [
      `📌 ${config.serviceDesc}`,
      `👉 ${config.serviceUrl}`,
      '',
      '━━━━━━━━━━━━━━━━',
      config.points.map((p, i) => `${p}`).join('\n'),
      '',
      '━━━━━━━━━━━━━━━━',
      '👍 いいね & 🔔 チャンネル登録で毎日役立つtips！',
      '',
      '📱 Asoventure全サービス一覧:',
      LINKTREE,
      '',
      '【制作情報】この動画はAI（Gemini）を使用して生成されています。',
    ].join('\n');

    // YouTube横型動画としてアップロード（エンドカード付き）
    const token = await getYouTubeToken();
    const { videoId, url: youtubeUrl } = await uploadLandscapeToYouTube(
      token, videoBuffer, finalTitle, description, config.tags, category
    );

    // Buffer(X)投稿
    await postToBuffer(config.topic, youtubeUrl, category);

    const msg = [
      `[Landscape] ✅ 横型動画生成完了!`,
      `カテゴリ: ${category}`,
      `タイトル: "${finalTitle}"`,
      `URL: ${youtubeUrl}`,
      `VideoID: ${videoId}`,
      `⚠️ エンドカードはYouTube Studioで確認: https://studio.youtube.com/video/${videoId}/edit`,
    ].join('\n');
    await notifyDiscord(msg);

    return NextResponse.json({
      ok: true,
      category,
      title: finalTitle,
      youtubeUrl,
      videoId,
      studioUrl: `https://studio.youtube.com/video/${videoId}/edit`,
      note: 'エンドカードが自動設定されました。YouTube Studioで確認後に公開してください。',
    });

  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    await notifyDiscord(`[Landscape] ❌ 生成失敗: ${detail.slice(0, 500)}`);
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}
