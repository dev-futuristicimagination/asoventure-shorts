// lib/canvas.ts — テキスト動画生成 v2（動的レイアウト・視覚的メリハリ）
// 【2026-05-07 全面リデザイン】
// Before: 静的グラジエント + フェードインだけ → 単調
// After:
//   ① HOOK PHASE (0-2.5s): フック文言を全画面で強調 → スワイプを止める
//   ② POINT PHASE: 各ポイントが背景ボックス付きで1つずつ出現 → 飽きさせない
//   ③ Progress Bar: 下部に進捗バー → 「あと何個？」を視覚化
//   ④ テキストシャドウ: 奥行き感 → 読みやすさ向上
//   ⑤ BGM: ペンタトニック和音 + リバーブ → 温かみのある音楽

import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateTTS, getTTSDuration } from './tts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;

const execFileAsync = promisify(execFile);

function getFontPath(): string {
  if (process.env.CANVAS_FONT_PATH) return process.env.CANVAS_FONT_PATH;
  return join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
}

// カテゴリ別カラーパレット（bg1=暗い面・bg2=明るい面・accent=強調色・box=ポイントBG）
export const CANVAS_THEME: Record<string, {
  bg1: string; bg2: string; accent: string; textColor: string; emoji: string; box: string;
}> = {
  health:    { bg1: '0x0D2B1F', bg2: '0x1B4332', accent: '0x74C69D', textColor: 'white', emoji: '💚', box: '0x40916C' },
  finance:   { bg1: '0x0A0A1A', bg2: '0x1A1A2E', accent: '0xF5A623', textColor: 'white', emoji: '💰', box: '0x1E3A5F' },
  education: { bg1: '0x1A0F3D', bg2: '0x2D1B69', accent: '0x7EC8E3', textColor: 'white', emoji: '📚', box: '0x3D2B7A' },
  life:      { bg1: '0x0A2E38', bg2: '0x134E5E', accent: '0xFFD166', textColor: 'white', emoji: '🌱', box: '0x1B5E6E' },
  japan:     { bg1: '0x5C0A00', bg2: '0x8B0000', accent: '0xFFFFFF', textColor: 'white', emoji: '⛩️', box: '0xA01010' },
  job:       { bg1: '0x080F18', bg2: '0x0F2027', accent: '0xF5A623', textColor: 'white', emoji: '💼', box: '0x1A3A4E' },
  cheese:    { bg1: '0x100600', bg2: '0x2A1500', accent: '0xFFD700', textColor: 'white', emoji: '🧀', box: '0x3D2000' },
  music1963: { bg1: '0x0D0020', bg2: '0x1A0533', accent: '0xF8BBD0', textColor: 'white', emoji: '🎵', box: '0x2E0A50' },
};

export interface CanvasOptions {
  category: string;
  title: string;          // フック文言（HOOK PHASEで全画面表示）
  points: string[];       // 3〜5ポイント
  narration: string;      // TTS原稿
  siteUrl: string;
  fullUrl: string;
  ctaText: string;
  lang?: 'ja' | 'en';
}

function escapeFFmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\u2019')
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/=/g, '\\=');
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
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

// ── テキスト + シャドウ描画（ヘルパー）────────────────────────────────
function drawTextWithShadow(
  font: string,
  text: string,
  fontSize: number,
  color: string,
  x: string,
  y: string,
  enableExpr: string,
  alphaExpr: string
): string[] {
  const esc = escapeFFmpegText(text);
  return [
    // シャドウ（2px下・右にオフセット・半透明黒）
    `drawtext=fontfile=${font}:text='${esc}':fontcolor=black@0.5:fontsize=${fontSize}:x='${x}+2':y='${y}+2':enable='${enableExpr}':alpha='${alphaExpr}'`,
    // 本体テキスト
    `drawtext=fontfile=${font}:text='${esc}':fontcolor=${color}:fontsize=${fontSize}:x='${x}':y='${y}':enable='${enableExpr}':alpha='${alphaExpr}'`,
  ];
}

// ── Canvas動画生成（メイン）───────────────────────────────────────────
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const theme = CANVAS_THEME[opts.category] || CANVAS_THEME.health;
  const font = getFontPath();
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));

  try {
    // ── TTS生成 ────────────────────────────────────────────────────
    const ttsBuffer = await generateTTS(opts.narration);
    const duration = Math.max(getTTSDuration(ttsBuffer), 28);

    // ── BGM: ペンタトニック和音（温かみのある音楽感）────────────────
    // ドミソの和音 + オクターブ上 + 低音 + エコー・リバーブ
    const bgmPath = join(tmpDir, 'bgm.wav');
    await execFileAsync(ffmpeg, [
      '-y', '-f', 'lavfi',
      '-i', `aevalsrc='0.22*sin(2*PI*130.8*t)+0.18*sin(2*PI*196*t)+0.15*sin(2*PI*261.6*t)+0.12*sin(2*PI*329.6*t)+0.08*sin(2*PI*392*t)+0.05*sin(2*PI*523.3*t):c=stereo:s=44100'`,
      '-filter_complex', `[0:a]aecho=0.7:0.8:60|120:0.12|0.06,atempo=1.0,volume=0.08[bgm]`,
      '-map', '[bgm]',
      '-t', String(duration + 2),
      '-ac', '2', bgmPath,
    ], { maxBuffer: 64 * 1024 * 1024 });

    // ── レイアウト設計 ─────────────────────────────────────────────
    // HOOK PHASE (t=0〜2.5s): タイトルを全画面中央に大きく
    // POINT PHASE (t=2.5s〜): ポイントが上から順に出現（背景ボックス付き）
    // CTA (末尾2s): チャンネル登録・URL

    const HOOK_END = 2.5;
    const pointCount = Math.min(opts.points.length, 5);
    const pointDuration = (duration - HOOK_END - 2.5) / Math.max(pointCount, 1);

    const filters: string[] = [];

    // ── HOOK PHASE: タイトル（全画面・中央・大きく）────────────────
    const hookLines = wrapText(opts.title, 18);
    // 発光感のある絵文字バッジ（上部）
    filters.push(...drawTextWithShadow(
      font,
      opts.ctaText.includes('記事') ? '📖' : theme.emoji,
      90,
      theme.accent,
      '(w-text_w)/2',
      '200',
      `lt(t,${HOOK_END + 0.5})`,
      `min(1,(t)*6)`
    ));

    // フック本文（上から3分の1地点・スライドアップ風フェード）
    hookLines.slice(0, 3).forEach((line, i) => {
      const baseY = 380 + i * 100;
      filters.push(...drawTextWithShadow(
        font, line, i === 0 ? 68 : 56,
        'white',
        '(w-text_w)/2',
        String(baseY),
        `lt(t,${HOOK_END + 0.8})`,
        `min(1,(t-${0.2 + i * 0.15})*5)`
      ));
    });

    // ── 区切り演出: HOOK→POINT の境界線フラッシュ ─────────────────
    filters.push(
      `drawbox=x=80:y=780:w=920:h=3:color=${theme.accent}@0.8:t=fill:enable='between(t,${HOOK_END - 0.1},${HOOK_END + 0.3})'`
    );

    // ── POINT PHASE: 各ポイントをボックス付きで表示 ───────────────
    const POINT_START_Y = 220;
    const POINT_BOX_H = 220;
    const POINT_GAP = 10;

    opts.points.slice(0, pointCount).forEach((point, i) => {
      const t = HOOK_END + i * pointDuration;
      const boxY = POINT_START_Y + i * (POINT_BOX_H + POINT_GAP);

      // 背景ボックス（カテゴリアクセントカラー・半透明）
      filters.push(
        `drawbox=x=30:y=${boxY}:w=1020:h=${POINT_BOX_H}:color=${theme.box}@0.75:t=fill:enable='gte(t,${t})'`
      );

      // ポイント番号バッジ
      const badge = `${i + 1}/${pointCount}`;
      filters.push(...drawTextWithShadow(
        font, badge, 28, theme.accent,
        '55', String(boxY + 15),
        `gte(t,${t})`,
        `min(1,(t-${t})*8)`
      ));

      // ポイント本文（2行まで）
      const pointLines = wrapText(point.replace(/^[①②③④⑤⑥⑦\d]\s*[\.．、]\s*/, ''), 18);
      pointLines.slice(0, 2).forEach((line, li) => {
        const textY = boxY + (li === 0 ? 50 : 130);
        const fs = li === 0 ? 42 : 34;
        const color = li === 0 ? 'white' : theme.accent;
        filters.push(...drawTextWithShadow(
          font, line, fs, color,
          '60', String(textY),
          `gte(t,${t})`,
          `min(1,(t-${t + li * 0.1})*10)`
        ));
      });
    });

    // ── Progress Bar（下部・時間とともに伸びる）───────────────────
    // 背景トラック
    filters.push(
      `drawbox=x=0:y=1908:w=1080:h=12:color=white@0.15:t=fill`
    );
    // 進捗バー（FFmpegのdrawboxはw式を評価する）
    filters.push(
      `drawbox=x=0:y=1908:w='min(1080,1080*t/${duration})':h=12:color=${theme.accent}@0.85:t=fill`
    );

    // ── CTA（末尾2.5s前から表示）─────────────────────────────────
    const ctaStart = duration - 2.5;
    filters.push(
      `drawbox=x=0:y=1680:w=1080:h=220:color=black@0.7:t=fill:enable='gte(t,${ctaStart})'`
    );
    filters.push(...drawTextWithShadow(
      font, `👍 いいね & チャンネル登録`, 34, theme.accent,
      '(w-text_w)/2', '1710',
      `gte(t,${ctaStart})`,
      `min(1,(t-${ctaStart})*6)`
    ));
    filters.push(...drawTextWithShadow(
      font, opts.siteUrl, 30, 'white',
      '(w-text_w)/2', '1770',
      `gte(t,${ctaStart + 0.3})`,
      `min(1,(t-${ctaStart + 0.3})*6)`
    ));

    const drawFilter = filters.join(',');

    // ── FFmpeg 動画生成 ────────────────────────────────────────────
    const ttsPath = join(tmpDir, 'tts.wav');
    const outPath = join(tmpDir, 'canvas.mp4');
    await writeFile(ttsPath, ttsBuffer);

    await execFileAsync(ffmpeg, [
      '-y',
      '-f', 'lavfi',
      '-i', `gradients=size=1080x1920:rate=30:c0=${theme.bg1}:c1=${theme.bg2}:x0=540:y0=0:x1=540:y1=1920:duration=${duration + 2}`,
      '-i', bgmPath,
      '-i', ttsPath,
      '-filter_complex', [
        `[0:v]${drawFilter}[vid]`,
        `[1:a][2:a]amix=inputs=2:duration=shortest:weights=0.3 1[aout]`,
      ].join(';'),
      '-map', '[vid]',
      '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
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
