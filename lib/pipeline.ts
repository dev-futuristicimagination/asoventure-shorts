// lib/pipeline.ts — Phase A / Phase B 共通パイプライン

import { requestVeo3, pollAndDownloadVeo3 } from './veo3';
import { getYouTubeToken, uploadToYouTube, postToBuffer } from './youtube';
import { generateTTS, getTTSDuration } from './tts';
import { savePending, loadPending, clearPending } from './github';
import { generateDynamicContent, notifyDiscord } from './gemini';
import type { ShortItem, CtaConfig, PendingData } from './types';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execFileAsync = promisify(execFile);

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

  const operationName = await requestVeo3(item.videoPrompt);

  const pending: PendingData = {
    category, topic: item.topic, title: item.title,
    narration, youtubeDescription, videoPrompt: item.videoPrompt,
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
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const tmpDir = await mkdtemp(join(tmpdir(), 'shorts-'));
  const bgPath  = join(tmpDir, 'bg.mp4');
  const ttsPath = join(tmpDir, 'tts.wav');
  const outPath = join(tmpDir, 'out.mp4');

  await writeFile(bgPath, videoBuffer);
  await writeFile(ttsPath, ttsBuffer);

  await execFileAsync(ffmpeg, [
    '-y',
    '-i', bgPath,
    '-i', ttsPath,
    '-filter_complex', '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[vid];[0:a]volume=0.2[bgaudio];[bgaudio][1:a]amix=inputs=2:duration=shortest:normalize=0[aout]',
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
