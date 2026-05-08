// lib/canvas.ts — Canvas動画生成 v9「satori フレーム版」
// 【根本的な設計変更】
//   旧: FFmpeg drawbox のみ（テキスト不可）
//   新: satori（HTML/CSS → PNG）+ FFmpeg（PNG + TTS → 動画）
//
// メリット:
//   - 日本語テキスト完全対応（NotoSansJP）
//   - カテゴリ背景画像 + テキスト + ブランドカラーが一枚のPNGに集約
//   - Vercel Linux で確実に動作（ネイティブ依存なし）
//   - ffmpeg-static の drawtext 制限を完全に回避

import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateTTS, getTTSDuration } from './tts';
import { generateFrame } from './frame-generator';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;
const execFileAsync = promisify(execFile);

export const CANVAS_THEME: Record<string, {
  bg1: string; bg2: string; bgSlide: string; accent: string; textColor: string; emoji: string; siteName: string;
}> = {
  health:    { bg1: '#1B4332', bg2: '#0D2B1F', bgSlide: '#0A1F17', accent: '#74C69D', textColor: 'white', emoji: '💚', siteName: 'asoventure HEALTH' },
  finance:   { bg1: '#1A1A2E', bg2: '#080818', bgSlide: '#05050F', accent: '#F5A623', textColor: 'white', emoji: '💰', siteName: 'asoventure FINANCE' },
  education: { bg1: '#2D1B69', bg2: '#1A0F3D', bgSlide: '#100A28', accent: '#7EC8E3', textColor: 'white', emoji: '📚', siteName: 'asoventure EDUCATION' },
  life:      { bg1: '#134E5E', bg2: '#0A2E38', bgSlide: '#061E25', accent: '#FFD166', textColor: 'white', emoji: '🌱', siteName: 'asoventure LIFE' },
  japan:     { bg1: '#8B0000', bg2: '#5C0A00', bgSlide: '#3A0600', accent: '#FFFFFF', textColor: 'white', emoji: '⛩️', siteName: 'asoventure JAPAN' },
  job:       { bg1: '#0F2027', bg2: '#080F18', bgSlide: '#040810', accent: '#F5A623', textColor: 'white', emoji: '💼', siteName: 'asoventure JOB' },
  cheese:    { bg1: '#2A1500', bg2: '#100600', bgSlide: '#080300', accent: '#FFD700', textColor: 'white', emoji: '🧀', siteName: 'Asoventure Cheese' },
  music1963: { bg1: '#1A0533', bg2: '#0D0020', bgSlide: '#060015', accent: '#F8BBD0', textColor: 'white', emoji: '🎵', siteName: 'music1963' },
};

export interface CanvasOptions {
  category: string;
  title: string;
  points: string[];
  narration: string;
  siteUrl: string;
  fullUrl: string;
  ctaText: string;
  lang?: 'ja' | 'en';
  bgImageUrl?: string; // 現在は使用しない（frameGeneratorが内部でBG画像を管理）
}

// ── Canvas動画生成 v9 ─────────────────────────────────────────────────────
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));

  try {
    // ── STEP 1: TTS音声生成 ───────────────────────────────────────────────
    const ttsBuffer = await generateTTS(opts.narration);
    const duration = Math.min(Math.max(getTTSDuration(ttsBuffer), 10), 15);
    console.log(`[Canvas v9] TTS生成完了: ${duration}秒`);

    // ── STEP 2: satori でテキスト付きPNGフレーム生成 ─────────────────────
    // NotoSansJP + カテゴリ背景画像 + タイトル + ポイント → 1080x1920 PNG
    const framePng = await generateFrame({
      category: opts.category,
      title: opts.title,
      points: opts.points,
      siteUrl: opts.siteUrl,
      ctaText: opts.ctaText,
    });
    console.log(`[Canvas v9] フレームPNG生成完了: ${framePng.length} bytes`);

    // ── STEP 3: FFmpeg で PNG + TTS → 動画 ──────────────────────────────
    const framePath = join(tmpDir, 'frame.png');
    const ttsPath   = join(tmpDir, 'tts.wav');
    const outPath   = join(tmpDir, 'canvas.mp4');

    await writeFile(framePath, framePng);
    await writeFile(ttsPath, ttsBuffer);

    // 静止画を duration 秒のループ動画にしてTTS音声を合成
    await execFileAsync(ffmpeg, [
      '-y',
      '-loop', '1',
      '-framerate', '30',
      '-i', framePath,           // PNG フレーム（静止画ループ）
      '-i', ttsPath,             // TTS 音声
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-t', String(duration + 0.5),
      '-movflags', '+faststart',
      outPath,
    ], { maxBuffer: 512 * 1024 * 1024 });

    console.log(`[Canvas v9] 動画生成完了`);
    return await readFile(outPath);

  } finally {
    await rm(tmpDir, { recursive: true }).catch(() => {});
  }
}
