// lib/canvas.ts — テキスト＋背景＋BGM動画生成（Veo3不要・コスト$0）
// 【用途】
// - オウンドメディア系（health/finance/education/life/japan）の記事要約動画
// - 「テキスト + それっぽい背景 + BGM + TTS」を FFmpeg のみで生成
// - Veo3はCheeseのような「魅せる」コンテンツに集中させる

import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateTTS, getTTSDuration } from './tts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;

const execFileAsync = promisify(execFile);

// カテゴリ別カラーパレット（グラジエント背景）
export const CANVAS_THEME: Record<string, {
  bg1: string; bg2: string; accent: string; textColor: string; emoji: string;
}> = {
  health:    { bg1: '0x1B4332', bg2: '0x40916C', accent: '0x95D5B2', textColor: 'white', emoji: '💚' },
  finance:   { bg1: '0x1A1A2E', bg2: '0x16213E', accent: '0xF5A623', textColor: 'white', emoji: '💰' },
  education: { bg1: '0x2D1B69', bg2: '0x11998E', accent: '0xA8EDEA', textColor: 'white', emoji: '📚' },
  life:      { bg1: '0x134E5E', bg2: '0x71B280', accent: '0xFFE082', textColor: 'white', emoji: '🌱' },
  japan:     { bg1: '0x8B0000', bg2: '0xC0392B', accent: '0xFFFFFF', textColor: 'white', emoji: '⛩️' },
  job:       { bg1: '0x0F2027', bg2: '0x2C5364', accent: '0xF5A623', textColor: 'white', emoji: '💼' },
  cheese:    { bg1: '0x1A0A00', bg2: '0x5D3A00', accent: '0xFFD700', textColor: 'white', emoji: '🧀' },
  music1963: { bg1: '0x1A0533', bg2: '0x4A1942', accent: '0xF8BBD0', textColor: 'white', emoji: '🎵' },
};

export interface CanvasOptions {
  category: string;
  title: string;
  points: string[];       // 3〜5個の箇条書き
  narration: string;
  siteUrl: string;        // CTA用サイトURL（表示用・短縮版）
  ctaText: string;        // CTA文言
  lang?: 'ja' | 'en';    // フォント選択用
}

export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const theme = CANVAS_THEME[opts.category] || CANVAS_THEME.health;
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));

  try {
    // ── TTS生成 ─────────────────────────────────────────────────
    const ttsBuffer = await generateTTS(opts.narration);
    const duration = Math.max(getTTSDuration(ttsBuffer), 15); // 最低15秒
    const ttsPath = join(tmpDir, 'tts.wav');
    await writeFile(ttsPath, ttsBuffer);

    // ── BGM（サイン波ベースのアンビエント風 - 外部依存なし）────────
    const bgmPath = join(tmpDir, 'bgm.wav');
    await execFileAsync(ffmpeg, [
      '-y', '-f', 'lavfi',
      '-i', `sine=frequency=220:sample_rate=44100`,
      '-f', 'lavfi',
      '-i', `sine=frequency=330:sample_rate=44100`,
      '-filter_complex', '[0:a][1:a]amix=inputs=2:normalize=0,volume=0.06,aecho=0.3:0.3:60|80:0.2|0.15[bgm]',
      '-map', '[bgm]',
      '-t', String(duration + 1),
      '-ac', '2', bgmPath,
    ], { maxBuffer: 64 * 1024 * 1024 });

    // ── テキストレイアウト設計（9:16 = 1080x1920）────────────────
    // フォント
    const font = process.env.CANVAS_FONT_PATH || '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

    // 各テキスト要素のタイムライン
    const titleAppear   = 0.5;
    const pointsStart   = 2.0;
    const pointInterval = 2.5;
    const ctaAppear     = pointsStart + opts.points.length * pointInterval + 0.5;

    // ── drawtext フィルター構築 ─────────────────────────────────
    const escTitle = escapeFFmpegText(opts.title);
    const escCta   = escapeFFmpegText(opts.ctaText);
    const escUrl   = escapeFFmpegText(opts.siteUrl);

    let textFilters = [
      // タイトル（中央上部）
      `drawtext=fontfile=${font}:text='${escTitle}':fontcolor=${theme.textColor}:fontsize=52:x=(w-text_w)/2:y=200:enable='gte(t,${titleAppear})':alpha='min(1,(t-${titleAppear})*3)'`,
      // 絵文字ライン
      `drawtext=fontfile=${font}:text='${theme.emoji}':fontcolor=${theme.accent}:fontsize=80:x=(w-text_w)/2:y=320:enable='gte(t,${titleAppear + 0.3})'`,
    ];

    // 箇条書きポイント（順番に出現）
    opts.points.slice(0, 5).forEach((point, i) => {
      const t = pointsStart + i * pointInterval;
      const y = 480 + i * 200;
      const esc = escapeFFmpegText(`✦ ${point}`);
      textFilters.push(
        `drawtext=fontfile=${font}:text='${esc}':fontcolor=${theme.accent}:fontsize=40:x=60:y=${y}:enable='gte(t,${t})':alpha='min(1,(t-${t})*4)'`
      );
    });

    // CTA
    textFilters.push(
      `drawtext=fontfile=${font}:text='${escCta}':fontcolor=${theme.textColor}:fontsize=38:x=(w-text_w)/2:y=1600:enable='gte(t,${ctaAppear})':alpha='min(1,(t-${ctaAppear})*4)'`,
      `drawtext=fontfile=${font}:text='${escUrl}':fontcolor=${theme.accent}:fontsize=32:x=(w-text_w)/2:y=1670:enable='gte(t,${ctaAppear + 0.3})'`
    );

    const drawFilter = textFilters.join(',');

    // ── FFmpeg で動画生成 ────────────────────────────────────────
    const outPath = join(tmpDir, 'canvas.mp4');
    await execFileAsync(ffmpeg, [
      '-y',
      // グラジエント背景
      '-f', 'lavfi',
      '-i', `gradients=size=1080x1920:rate=30:c0=${theme.bg1}:c1=${theme.bg2}:duration=${duration + 1}`,
      // BGM + TTS
      '-i', bgmPath,
      '-i', ttsPath,
      '-filter_complex', [
        // 背景にテキスト描画
        `[0:v]${drawFilter}[vid]`,
        // BGMとTTSをミックス
        `[1:a][2:a]amix=inputs=2:duration=shortest:weights=0.3 1[aout]`,
      ].join(';'),
      '-map', '[vid]',
      '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
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

function escapeFFmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .slice(0, 60); // FFmpeg drawtext長さ制限
}
