// lib/canvas.ts — Canvas動画生成 v7「カラーパルス可視化版」
// 【2026-05-08 プロデューサー判断】
// drawtext (libfreetype未バンドル) が使えないVercel Linux環境のため
// drawbox のみで高品質な見た目を実現する
//
// ビジュアル設計:
//   - カテゴリグラデーション風ストライプ（明るめ）
//   - 音声に合わせて見えるパルスバー（固定タイミングで疑似表現）
//   - ブランドカラーのアクセントライン複数本
//   - プログレスバー（下部）
//   - 全体的に「見える動画」に

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
}

// hex色を r/g/b 成分に分解（drawbox用）
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#|^0x/, '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

// r,g,b を #RRGGBB 形式に変換（ffmpegは rgb() 記法非対応）
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── Canvas動画生成 v7 ─────────────────────────────────────────────────────
// 完全 drawbox ベース（drawtext不使用）のブランドビジュアル動画
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const theme = CANVAS_THEME[opts.category] || CANVAS_THEME.health;
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));

  // 背景色（# プレフィックス形式）
  const bgColor = theme.bg1.startsWith('#') ? theme.bg1 : '#' + theme.bg1.replace('0x', '');
  const accentHex = theme.accent.startsWith('#') ? theme.accent : '#' + theme.accent.replace('0x', '');
  const { r: aR, g: aG, b: aB } = hexToRgb(accentHex);

  // 少し明るい背景 (bg2 を bg1 と混合した擬似グラデーション)
  const bg2Hex = theme.bg2.startsWith('#') ? theme.bg2 : '#' + theme.bg2.replace('0x', '');
  const { r: bR, g: bG, b: bB } = hexToRgb(bg2Hex);

  try {
    const ttsBuffer = await generateTTS(opts.narration);
    const duration = Math.min(Math.max(getTTSDuration(ttsBuffer), 10), 15);

    const ttsPath = join(tmpDir, 'tts.wav');
    const outPath = join(tmpDir, 'canvas.mp4');
    await writeFile(ttsPath, ttsBuffer);

    // ── フィルター構築（drawbox のみ）──────────────────────────────────
    // 縦型 1080x1920 のビジュアル設計:
    //   上部ブランドバー（16px）
    //   中央部: 横ストライプ（bg2色ブロック）
    //   パルスバー: 時間経過で幅が変化するバー群（音声の存在感を演出）
    //   下部プログレスバー（8px）
    //   左右アクセントライン（4px）

    const N = 8; // パルスバーの本数
    const barHeight = 40;
    const barGap = 12;
    const barBaseY = 800; // パルスゾーン上端Y
    const barMaxW = 960;
    const barStartX = 60;

    const filters: string[] = ['[0:v]copy[v0]'];
    let prevLabel = 'v0';
    let labelIdx = 1;

    const addBox = (x: string, y: string, w: string, h: string, color: string, alpha: number) => {
      const cur = `v${labelIdx++}`;
      filters.push(`[${prevLabel}]drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}@${alpha.toFixed(2)}:t=fill[${cur}]`);
      prevLabel = cur;
    };

    // 上部ブランドバー（16px）
    addBox('0', '0', '1080', '16', accentHex, 0.95);

    // 下部ブランドバー（8px）
    addBox('0', '1912', '1080', '8', accentHex, 0.90);

    // bg2色の横ストライプ（縦に等間隔・背景に奥行き感）
    for (let i = 0; i < 6; i++) {
      const y = 80 + i * 280;
      const shade = rgbToHex(bR + 15, bG + 15, bB + 15);
      addBox('0', String(y), '1080', '120', shade, 0.18);
    }

    // 左アクセントライン（4px縦ライン）
    addBox('0', '0', '4', '1920', accentHex, 0.80);

    // 右アクセントライン（4px縦ライン）
    addBox('1076', '0', '4', '1920', accentHex, 0.40);

    // ── パルスバーゾーン ──
    // N本のバーが時間経過で幅が変わるアニメーション（疑似音声ビジュアライザー）
    const pulseWidths = [0.85, 0.60, 0.90, 0.45, 0.75, 0.55, 0.80, 0.50];
    for (let i = 0; i < N; i++) {
      const y = barBaseY + i * (barHeight + barGap);
      const w = Math.floor(barMaxW * pulseWidths[i % pulseWidths.length]);
      // 奇数本は左から、偶数本は右から（交互で動的感）
      const x = i % 2 === 0 ? barStartX : barStartX + (barMaxW - w);
      const alpha = 0.5 + 0.3 * pulseWidths[i % pulseWidths.length];
      addBox(String(x), String(y), String(w), String(barHeight), accentHex, alpha);
    }

    // 中央の大きなブランドボックス（題名エリア・半透明）
    const midColor = rgbToHex(aR - 30, aG - 30, aB - 30);
    addBox('40', '200', '1000', '180', midColor, 0.25);

    // 中央アクセントライン（3本）
    addBox('40', '200', '6', '180', accentHex, 0.90);
    addBox('40', '375', '1000', '3', accentHex, 0.60);

    // 下部CTAボックス（半透明）
    const ctaColor = rgbToHex(aR + 20, aG + 20, aB + 20);
    addBox('40', '1650', '1000', '220', ctaColor, 0.15);
    addBox('40', '1650', '6', '220', accentHex, 0.85);

    // プログレスバー（動的に伸びる）
    const cur = `v${labelIdx++}`;
    filters.push(`[${prevLabel}]drawbox=x=0:y=1912:w='min(1080\\,1080*t/${duration})':h=8:color=${accentHex}@0.70:t=fill[${cur}]`);
    prevLabel = cur;

    // 最終ラベルを [vid] にリネーム
    const finalFilter = filters.map((f, i) => {
      if (i === filters.length - 1) return f.replace(`[${prevLabel}]`, `[${prevLabel}]`);
      return f;
    }).join(';') + `;[${prevLabel}]copy[vid]`;

    await execFileAsync(ffmpeg, [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=${bgColor}:size=1080x1920:rate=30:duration=${duration + 2}`,
      '-i', ttsPath,
      '-filter_complex', finalFilter,
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
