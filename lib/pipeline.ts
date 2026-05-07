// lib/pipeline.ts — Phase A / Phase B 共通パイプライン + Canvas（テキスト動画）
// ffmpeg-static を使用してVercel serverless環境でFFmpegを実行

import { requestVeo3, pollAndDownloadVeo3 } from './veo3';
import { getYouTubeToken, uploadToYouTube, postToBuffer } from './youtube';
import { generateTTS, getTTSDuration } from './tts';
import { savePending, loadPending, clearPending } from './github';
import { generateDynamicContent, notifyDiscord } from './gemini';
import { generateCanvasVideo } from './canvas';
import type { ShortItem, CtaConfig, PendingData, CanvasItem } from './types';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execFileAsync = promisify(execFile);

// ffmpeg-static: Vercel環境でもFFmpegバイナリが使える
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;

// ─── Veo3送信前プロンプト自動サニタイズ ─────────────────────────────
// 【ユーザーフィードバック 2026-05-07】
// Veo3は日本語テキストを描画できない → 文字化けになる
// → video promptから日本語テキストオーバーレイ指定を除去
// → 「bold text "..."」「at top / at bottom」指定も除去
// → 視覚的なシーン描写のみ残す
function sanitizeVideoPrompt(prompt: string): string {
  return prompt
    // 「bold white/text "..."」パターンを除去（英語・日本語両対応）
    .replace(/,?\s*bold\s+(?:white\s+)?text\s+['"][^'"]*['"]/gi, '')
    // 「at top / at bottom / at center」テキスト位置指定を除去
    .replace(/,?\s*(?:text\s+)?at\s+(?:top|bottom|center)\s+of\s+(?:screen|frame)?/gi, '')
    // テキストオーバーレイ全体の指示文を除去
    .replace(/,?\s*overlay\s+text[^.]*\./gi, '.')
    // 「Opening thumbnail frame: ...」を「Opening scene:」に変換（テキスト指定なし）
    .replace(/Opening thumbnail frame:/gi, 'Opening scene:')
    // 連続カンマ・スペースをクリーンアップ
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Phase A: Veo3リクエスト → pending.json保存
export async function phaseA(
  category: string,
  pools: ShortItem[],
  usedIndexKey: string
): Promise<{ ok: boolean; message: string }> {
  // 使用済みインデックス管理（簡易ランダム選択）
  const idx = Math.floor(Math.random() * pools.length);
  const item = pools[idx];

  const { narration, youtubeDescription } = await generateDynamicContent(
    item.topic, item.narration, category
  );

  // 日本語テキストオーバーレイをサニタイズしてからVeo3に送信
  const cleanPrompt = sanitizeVideoPrompt(item.videoPrompt);
  const operationName = await requestVeo3(cleanPrompt);

  const pending: PendingData = {
    category, topic: item.topic, title: item.title,
    narration, youtubeDescription, videoPrompt: cleanPrompt,
    operationName, createdAt: new Date().toISOString(),
  };
  await savePending(category, pending);

  const msg = `[${category}] Phase A完了: "${item.title}" → Veo3生成中`;
  await notifyDiscord(msg);
  return { ok: true, message: msg };
}

// Phase B: Veo3完了 → TTS → FFmpeg → YouTube投稿
export async function phaseB(
  category: string,
  cta: CtaConfig
): Promise<{ ok: boolean; message: string; youtubeUrl?: string }> {
  const pending = await loadPending(category);
  if (!pending || !pending.operationName) {
    return { ok: false, message: `[${category}] Phase B: pending.jsonなし` };
  }

  // Veo3ダウンロード
  const videoBuffer = await pollAndDownloadVeo3(pending.operationName);

  // TTS生成
  const ttsBuffer = await generateTTS(pending.narration);
  const ttsDuration = getTTSDuration(ttsBuffer);

  // FFmpegミックス
  const finalVideo = await mixVideoTTS(videoBuffer, ttsBuffer, ttsDuration);

  // YouTube投稿
  const token = await getYouTubeToken();
  const youtubeUrl = await uploadToYouTube(
    token, finalVideo, pending.title, pending.topic, pending.youtubeDescription, cta
  );

  // Buffer(X)投稿
  await postToBuffer(pending.topic, youtubeUrl, category);

  // pending クリア
  await clearPending(category);

  const msg = `[${category}] Phase B完了: "${pending.title}" → ${youtubeUrl}`;
  await notifyDiscord(msg);
  return { ok: true, message: msg, youtubeUrl };
}

async function mixVideoTTS(videoBuffer: Buffer, ttsBuffer: Buffer, ttsDuration: number): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const tmpDir = await mkdtemp(join(tmpdir(), 'shorts-'));
  const bgPath  = join(tmpDir, 'bg.mp4');
  const ttsPath = join(tmpDir, 'tts.wav');
  const outPath = join(tmpDir, 'out.mp4');

  await writeFile(bgPath, videoBuffer);
  await writeFile(ttsPath, ttsBuffer);

  // 【ユーザーフィードバック反映 2026-05-07】
  // ① Veo3のキャラ音声はミュート（TTSナレーションと重複するため）
  // ② BGMをlavfiサイン波で生成して追加（アンビエント感）
  // ③ TTS(1:a) のみを聴かせる構成
  //
  // BGM: 和音(A=220Hz + E=329Hz + A=440Hz) + エコーでアンビエント感を演出
  // Volume: BGM 8% + TTS 100% でナレーションを前に出す
  await execFileAsync(ffmpeg, [
    '-y',
    // Input 0: アンビエントBGM（lavfi生成・外部ファイル不要）
    '-f', 'lavfi',
    '-i', `aevalsrc='0.25*sin(2*PI*220*t)+0.18*sin(2*PI*329.6*t)+0.12*sin(2*PI*440*t)+0.08*sin(2*PI*523.3*t):c=stereo:s=44100'`,
    // Input 1: Veo3動画（映像のみ使用、音声はミュート）
    '-i', bgPath,
    // Input 2: TTS（ナレーション）
    '-i', ttsPath,
    '-filter_complex', [
      // 映像: 9:16縦型にクロップ
      '[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[vid]',
      // BGMにエコー（アンビエント風）
      '[0:a]aecho=0.6:0.7:50|80:0.15|0.1,volume=0.08[bgm]',
      // BGM + TTS ミックス（TTSを主役に）
      '[bgm][2:a]amix=inputs=2:duration=shortest:weights=0.3 1[aout]',
    ].join(';'),
    '-map', '[vid]',
    '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '192k',
    '-t', String(ttsDuration + 0.5),
    '-movflags', '+faststart',
    outPath,
  ], { maxBuffer: 512 * 1024 * 1024 });

  const result = await readFile(outPath);
  await rm(tmpDir, { recursive: true }).catch(() => {});
  return result;
}

// ─── Canvas Pipeline（Veo3不要・コスト$0）────────────────────────────
// オウンドメディア記事の要約動画 = テキスト + グラジエント背景 + BGM + TTS
export async function phaseCanvas(
  category: string,
  item: CanvasItem,
  cta: CtaConfig
): Promise<{ ok: boolean; message: string; youtubeUrl?: string }> {
  try {
    // Canvas動画生成（FFmpegのみ・Veo3不要）
    const videoBuffer = await generateCanvasVideo({
      category,
      title: item.title,
      points: item.points,
      narration: item.narration,
      siteUrl: item.siteUrl,
      fullUrl: item.fullUrl,
      ctaText: item.ctaText,
      lang: item.lang ?? 'ja',
    });

    // YouTube投稿
    const token = await getYouTubeToken();
    const description = [
      item.points.map(p => `✦ ${p}`).join('\n'),
      '',
      item.ctaText,
      item.fullUrl,
    ].join('\n');

    const youtubeUrl = await uploadToYouTube(
      token, videoBuffer, item.title, item.topic, description, cta
    );

    // Buffer(X)投稿
    await postToBuffer(item.topic, youtubeUrl, category);

    const msg = `[${category}] Canvas完了: "${item.title}" → ${youtubeUrl}`;
    await notifyDiscord(msg);
    return { ok: true, message: msg, youtubeUrl };

  } catch (e) {
    const msg = `[${category}] Canvas失敗: ${e instanceof Error ? e.message : String(e)}`;
    await notifyDiscord(msg);
    return { ok: false, message: msg };
  }
}
