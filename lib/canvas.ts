// lib/canvas.ts — テキスト＋背景＋BGM動画生成（Veo3不要・コスト$0）
// 【設計改訂 2026-05-07 ユーザーフィードバック反映】
// ✅ 日本語フォント: NotoSansJP-Regular.ttf をrepoに同梱（Vercelで日本語表示可能）
// ✅ テキスト量: 箇条書き3行短文 → 5〜7ポイント＋補足説明で「読み応え」を確保
// ✅ 文字折り返し: wrapText()で長文を自動折り返し（drawtext多段化）
// ✅ ナレーション: 60〜90秒分の情報量（オウンドメディア記事の要約として機能）

import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateTTS, getTTSDuration } from './tts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;

const execFileAsync = promisify(execFile);

// ── フォントパス（NotoSansJP をrepoに同梱）─────────────────────────
// ローカル: public/fonts/NotoSansJP-Regular.ttf
// Vercel: /var/task/public/fonts/NotoSansJP-Regular.ttf (Next.js public dir)
function getFontPath(): string {
  if (process.env.CANVAS_FONT_PATH) return process.env.CANVAS_FONT_PATH;
  // Next.js: process.cwd() = /var/task in Vercel
  return join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
}

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
  points: string[];       // 5〜7個のポイント。各ポイントは見出し+説明文を含む長文OK
  narration: string;      // 60〜90秒分のTTS原稿
  siteUrl: string;        // 動画内表示用短縮URL
  fullUrl: string;        // 説明欄用フルURL
  ctaText: string;        // CTA文言
  lang?: 'ja' | 'en';
}

// ── FFmpegテキストエスケープ（日本語対応）─────────────────────────
function escapeFFmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\u2019")   // シングルクォートを右クォートに変換（FFmpeg内部問題回避）
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/=/g, '\\=');
}

// ── テキスト折り返し（日本語対応・最大文字数で改行）────────────────
function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    // 日本語文字は2カウント、英数字は1カウント
    const charWidth = char.charCodeAt(0) > 127 ? 2 : 1;
    const currentWidth = [...current].reduce((w, c) => w + (c.charCodeAt(0) > 127 ? 2 : 1), 0);
    if (currentWidth + charWidth > maxChars) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Canvas動画生成（メイン関数）───────────────────────────────────
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const theme = CANVAS_THEME[opts.category] || CANVAS_THEME.health;
  const font = getFontPath();
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));

  try {
    // ── TTS生成 ─────────────────────────────────────────────────
    const ttsBuffer = await generateTTS(opts.narration);
    const duration = Math.max(getTTSDuration(ttsBuffer), 25); // 最低25秒（テキスト読む時間を確保）

    // ── BGM（アンビエントサイン波）──────────────────────────────
    const bgmPath = join(tmpDir, 'bgm.wav');
    await execFileAsync(ffmpeg, [
      '-y', '-f', 'lavfi',
      '-i', `aevalsrc='0.25*sin(2*PI*220*t)+0.18*sin(2*PI*329.6*t)+0.12*sin(2*PI*440*t)+0.06*sin(2*PI*523.3*t):c=stereo:s=44100'`,
      '-filter_complex', `[0:a]aecho=0.6:0.7:50|80:0.15|0.1,volume=0.06[bgm]`,
      '-map', '[bgm]',
      '-t', String(duration + 2),
      '-ac', '2', bgmPath,
    ], { maxBuffer: 64 * 1024 * 1024 });

    // ── レイアウト設計 (1080x1920 9:16) ────────────────────────
    // 上: タイトルエリア (y:80〜280)
    // 中: ポイントリスト (y:300〜1680)  ← 5〜7ポイント表示の余裕
    // 下: CTA (y:1720〜1880)
    const textFilters: string[] = [];

    // タイトル（大・中央）
    const titleLines = wrapText(opts.title, 20); // 全角20文字で折り返し
    titleLines.slice(0, 2).forEach((line, i) => {
      const esc = escapeFFmpegText(line);
      const y = 100 + i * 70;
      textFilters.push(
        `drawtext=fontfile=${font}:text='${esc}':fontcolor=white:fontsize=50:x=(w-text_w)/2:y=${y}:enable='gte(t,0.3)':alpha='min(1,(t-0.3)*3)'`
      );
    });

    // 区切り線
    textFilters.push(
      `drawtext=fontfile=${font}:text='━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━':fontcolor=${theme.accent}:fontsize=20:x=40:y=260:enable='gte(t,0.8)'`
    );

    // ポイント（5〜7個・各ポイント2行まで折り返し）
    let currentY = 310;
    const pointAppearInterval = Math.min(2.0, (duration - 4) / Math.max(opts.points.length, 1));

    opts.points.slice(0, 7).forEach((point, i) => {
      const t = 1.0 + i * pointAppearInterval;
      // 各ポイントを折り返し（全角16文字/行）
      const pointLines = wrapText(point, 16);

      pointLines.slice(0, 3).forEach((line, lineIdx) => {
        const esc = escapeFFmpegText(line);
        const lineY = currentY + lineIdx * 48;
        const fontSize = lineIdx === 0 ? 38 : 32; // 1行目は強調
        const color = lineIdx === 0 ? theme.accent : 'white';
        textFilters.push(
          `drawtext=fontfile=${font}:text='${esc}':fontcolor=${color}:fontsize=${fontSize}:x=50:y=${lineY}:enable='gte(t,${t})':alpha='min(1,(t-${t})*5)'`
        );
      });

      // ポイント間スペース
      currentY += pointLines.length * 48 + 28;
    });

    // CTA（下部）
    const ctaY = Math.max(currentY + 30, 1700);
    const ctaEsc = escapeFFmpegText(opts.ctaText);
    const urlEsc = escapeFFmpegText(opts.siteUrl);
    const ctaAppear = 1.0 + opts.points.length * pointAppearInterval + 0.5;

    textFilters.push(
      `drawtext=fontfile=${font}:text='━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━':fontcolor=${theme.accent}:fontsize=20:x=40:y=${ctaY - 30}:enable='gte(t,${ctaAppear})'`,
      `drawtext=fontfile=${font}:text='${ctaEsc}':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=${ctaY}:enable='gte(t,${ctaAppear})':alpha='min(1,(t-${ctaAppear})*4)'`,
      `drawtext=fontfile=${font}:text='${urlEsc}':fontcolor=${theme.accent}:fontsize=30:x=(w-text_w)/2:y=${ctaY + 55}:enable='gte(t,${ctaAppear + 0.3})'`
    );

    const drawFilter = textFilters.join(',');

    // ── FFmpeg 動画生成 ─────────────────────────────────────────
    const ttsPath = join(tmpDir, 'tts.wav');
    const outPath = join(tmpDir, 'canvas.mp4');
    await writeFile(ttsPath, ttsBuffer);

    await execFileAsync(ffmpeg, [
      '-y',
      // グラジエント背景
      '-f', 'lavfi',
      '-i', `gradients=size=1080x1920:rate=30:c0=${theme.bg1}:c1=${theme.bg2}:duration=${duration + 2}`,
      // BGM
      '-i', bgmPath,
      // TTS
      '-i', ttsPath,
      '-filter_complex', [
        `[0:v]${drawFilter}[vid]`,
        `[1:a][2:a]amix=inputs=2:duration=shortest:weights=0.25 1[aout]`,
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
