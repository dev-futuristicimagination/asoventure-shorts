// lib/canvas.ts — テキスト動画生成 v6「drawtext不使用版」
// 【2026-05-08 重大発見】Vercel Linux の ffmpeg-static v7.0.2 には drawtext フィルターが含まれない
// （libfreetype/libfontconfig未バンドル）
// → v6: drawtext を完全廃止 → TTS音声 + カラーバーパターン動画のみ生成
// → テキスト情報は YouTube タイトル/説明文で提供（音声ナレーション付き）
//
// 生成される動画:
//   - 背景: カテゴリカラーの単色 (1080x1920 縦型)
//   - アクセントバー: 上部と下部に細いカラーライン
//   - 尺: TTS長さに依存（最大15秒）
//   - 音声: Google TTS ナレーションのみ

import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateTTS, getTTSDuration } from './tts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;
const execFileAsync = promisify(execFile);

export const CANVAS_THEME: Record<string, {
  bg1: string; bg2: string; bgSlide: string; accent: string; textColor: string; emoji: string; siteName: string;
}> = {
  health:    { bg1: '0x0D2B1F', bg2: '0x1B4332', bgSlide: '0x0A1F17', accent: '0x74C69D', textColor: 'white', emoji: '💚', siteName: 'asoventure HEALTH' },
  finance:   { bg1: '0x080818', bg2: '0x1A1A2E', bgSlide: '0x05050F', accent: '0xF5A623', textColor: 'white', emoji: '💰', siteName: 'asoventure FINANCE' },
  education: { bg1: '0x1A0F3D', bg2: '0x2D1B69', bgSlide: '0x100A28', accent: '0x7EC8E3', textColor: 'white', emoji: '📚', siteName: 'asoventure EDUCATION' },
  life:      { bg1: '0x0A2E38', bg2: '0x134E5E', bgSlide: '0x061E25', accent: '0xFFD166', textColor: 'white', emoji: '🌱', siteName: 'asoventure LIFE' },
  japan:     { bg1: '0x5C0A00', bg2: '0x8B0000', bgSlide: '0x3A0600', accent: '0xFFFFFF', textColor: 'white', emoji: '⛩️', siteName: 'asoventure JAPAN' },
  job:       { bg1: '0x080F18', bg2: '0x0F2027', bgSlide: '0x040810', accent: '0xF5A623', textColor: 'white', emoji: '💼', siteName: 'asoventure JOB' },
  cheese:    { bg1: '0x100600', bg2: '0x2A1500', bgSlide: '0x080300', accent: '0xFFD700', textColor: 'white', emoji: '🧀', siteName: 'Asoventure Cheese' },
  music1963: { bg1: '0x0D0020', bg2: '0x1A0533', bgSlide: '0x060015', accent: '0xF8BBD0', textColor: 'white', emoji: '🎵', siteName: 'music1963' },
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
}

// ── Canvas動画生成 v6 (drawtext不使用・Vercel互換) ──────────────────────────
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const theme = CANVAS_THEME[opts.category] || CANVAS_THEME.health;
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));

  // hex color: 0x → # 変換（ffmpeg lavfi互換）
  const bg = theme.bg1.replace(/^0x/, '#');
  const ac = theme.accent.replace(/^0x/, '#');

  try {
    // TTS 音声生成
    const ttsBuffer = await generateTTS(opts.narration);
    const duration = Math.min(Math.max(getTTSDuration(ttsBuffer), 10), 15);

    const ttsPath = join(tmpDir, 'tts.wav');
    const outPath = join(tmpDir, 'canvas.mp4');
    await writeFile(ttsPath, ttsBuffer);

    // アクセントカラーのHEXを数値に分解（drawbox用）
    const accHex = theme.accent.replace(/^0x/, '');
    const accR = parseInt(accHex.slice(0, 2), 16);
    const accG = parseInt(accHex.slice(2, 4), 16);
    const accB = parseInt(accHex.slice(4, 6), 16);
    const accColor = `${accR}/${accG}/${accB}`;

    // フィルター: drawbox のみ（drawtext不使用）
    // 上部アクセントバー + 下部アクセントバー + プログレスバー
    const filterComplex = [
      // 背景 → [base]
      '[0:v]copy[base]',
      // 上部バー (8px)
      `[base]drawbox=x=0:y=0:w=1080:h=8:color=${ac}@0.95:t=fill[v1]`,
      // 下部バー (8px)
      `[v1]drawbox=x=0:y=1912:w=1080:h=8:color=${ac}@0.90:t=fill[v2]`,
      // カテゴリブランドバー（中央横ライン）
      `[v2]drawbox=x=0:y=960:w=1080:h=2:color=${ac}@0.5:t=fill[v3]`,
      // プログレスバー（下部）
      `[v3]drawbox=x=0:y=1920:w='min(1080\\,1080*t/${duration})':h=6:color=${ac}@0.7:t=fill[vid]`,
    ].join(';');

    await execFileAsync(ffmpeg, [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=${bg}:size=1080x1920:rate=30:duration=${duration + 2}`,
      '-i', ttsPath,
      '-filter_complex', filterComplex,
      '-map', '[vid]',
      '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-t', String(duration + 0.5),
      '-movflags', '+faststart',
      outPath,
    ], { maxBuffer: 512 * 1024 * 1024 });

    return await readFile(outPath);
  } finally {
    await rm(tmpDir, { recursive: true }).catch(() => {});
  }
}
