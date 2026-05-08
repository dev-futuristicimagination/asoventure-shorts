// lib/canvas.ts — テキスト動画生成 v5「シンプル左寄せスライド方式」
// 【設計変更 v5】参照動画スタイルに合わせてシンプル化
// - 背景: 単色グラデーション静止（軌道パン・色呼吸を廃止）
// - テキスト: 左寄せ（x=80固定）
// - 尺: TTS長さを最大15秒にキャップ
// - 構成: タイトル(2s) → ポイント(各3s) → ロゴ/サイト名(下部固定)
//
// スライド構成 (max 15s):
//   0-2s:   タイトルスライド
//   2-Xs:   ポイント① ② ③（均等分割）
//   末尾2s: CTAスライド

import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateTTS, getTTSDuration } from './tts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;
const execFileAsync = promisify(execFile);

// ── フォントパス（Windows: C:\path → C\:/path） ────────────────────
function getFFmpegFontPath(): string {
  const raw = process.env.CANVAS_FONT_PATH ||
    join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
  if (process.platform === 'win32') {
    return raw.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
  }
  return raw.replace(/\\/g, '/'); // Linux/Vercel
}

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

// FFmpegテキストエスケープ（絵文字除去含む）
function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\u2019')
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/=/g, '\\=')
    .replace(/%/g, '％')
    .replace(/[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{27FF}]/gu, '')
    .trim();
}

// テキスト折り返し（全角/半角混在対応）
function wrapText(text: string, maxHalfWidth: number): string[] {
  const result: string[] = [];
  for (const preLine of text.split('\n')) {
    let current = '';
    let currentW = 0;
    for (const char of preLine) {
      const cw = char.charCodeAt(0) > 127 ? 2 : 1;
      if (currentW + cw > maxHalfWidth && current) {
        result.push(current);
        current = char;
        currentW = cw;
      } else {
        current += char;
        currentW += cw;
      }
    }
    if (current) result.push(current);
  }
  return result;
}

// テキスト描画（シャドウ付き・左寄せ対応）
function dt(
  font: string, text: string, fs: number, color: string,
  x: string, y: number, en: string, al: string
): string[] {
  const e = esc(text);
  if (!e) return [];
  return [
    `drawtext=fontfile='${font}':text='${e}':fontcolor=black@0.55:fontsize=${fs}:x='(${x})+2':y=${y + 2}:enable='${en}':alpha='${al}'`,
    `drawtext=fontfile='${font}':text='${e}':fontcolor=${color}:fontsize=${fs}:x='${x}':y=${y}:enable='${en}':alpha='${al}'`,
  ];
}

// ── Canvas動画生成 v5 ────────────────────────────────────────────────────
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const theme = CANVAS_THEME[opts.category] || CANVAS_THEME.health;
  const font = getFFmpegFontPath();
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));

  // テキストのX座標: 左寄せ固定
  const LEFT = '80';
  // ロゴ/サイト名は中央
  const CENTER_X = '(w-text_w)/2';

  try {
    const ttsBuffer = await generateTTS(opts.narration);
    // v5: 最大15秒にキャップ（参照動画スタイル）
    const duration = Math.min(Math.max(getTTSDuration(ttsBuffer), 10), 15);

    // ── BGM ─────────────────────────────────────────────────────────
    const bgmPath = join(tmpDir, 'bgm.wav');
    const localMp3 = join(process.cwd(), 'public', 'audio', 'bgm', `${opts.category}.mp3`);
    const localDefault = join(process.cwd(), 'public', 'audio', 'bgm', 'default.mp3');
    const useMp3 = existsSync(localMp3) ? localMp3 : existsSync(localDefault) ? localDefault : null;

    if (useMp3) {
      await execFileAsync(ffmpeg, [
        '-y', '-stream_loop', '-1', '-i', useMp3,
        '-filter_complex', `[0:a]volume=0.25,lowpass=f=8000[bgm]`,
        '-map', '[bgm]', '-t', String(duration + 2), '-ac', '2', bgmPath,
      ], { maxBuffer: 64 * 1024 * 1024 });
    } else {
      // 合成BGM（シンプルなコード進行）
      const BGM_PRESETS: Record<string, { chords: number[][]; bass: number[]; tempo: number }> = {
        finance:   { chords: [[261.63,329.63,392.00],[220.00,261.63,329.63],[174.61,220.00,261.63],[196.00,246.94,293.66]], bass:[130.81,110.00,87.31,98.00],  tempo:8 },
        cheese:    { chords: [[196.00,246.94,293.66],[261.63,329.63,392.00],[220.00,277.18,329.63],[261.63,329.63,392.00]], bass:[98.00,130.81,110.00,130.81], tempo:6 },
        job:       { chords: [[220.00,261.63,329.63],[246.94,293.66,369.99],[174.61,220.00,261.63],[196.00,246.94,293.66]], bass:[110.00,123.47,87.31,98.00],  tempo:8 },
        health:    { chords: [[174.61,220.00,261.63],[220.00,261.63,329.63],[130.81,164.81,196.00],[174.61,220.00,261.63]], bass:[87.31,110.00,65.41,87.31],   tempo:10 },
        education: { chords: [[220.00,261.63,329.63],[196.00,220.00,261.63],[174.61,220.00,261.63],[164.81,196.00,246.94]], bass:[110.00,98.00,87.31,82.41],   tempo:9 },
        life:      { chords: [[261.63,329.63,392.00],[196.00,246.94,293.66],[220.00,261.63,329.63],[174.61,220.00,261.63]], bass:[130.81,98.00,110.00,87.31],  tempo:7 },
      };
      const preset = BGM_PRESETS[opts.category] || BGM_PRESETS.finance;
      const { chords, bass, tempo } = preset;
      const mk = (freqs: number[], amp: number) =>
        freqs.map(f => `${amp}*sin(2*PI*${f}*t)+${amp*0.3}*sin(2*PI*${f*2}*t)`).join('+');
      const blocks = Array.from({ length: 4 }, (_, cycle) =>
        chords.map((ch, ci) => {
          const ts = (cycle * chords.length + ci) * tempo;
          const te = ts + tempo;
          return `between(t,${ts},${te})*(${mk(ch, 0.10)}+${0.15}*sin(2*PI*${bass[ci]}*t))`;
        }).join('+')
      ).join('+');
      await execFileAsync(ffmpeg, [
        '-y', '-f', 'lavfi',
        '-i', `aevalsrc='${blocks}:c=stereo:s=44100'`,
        '-filter_complex', '[0:a]lowpass=f=3500,highpass=f=60,volume=1.5[bgm]',
        '-map', '[bgm]', '-t', String(duration + 2), '-ac', '2', bgmPath,
      ], { maxBuffer: 64 * 1024 * 1024 });
    }

    // ── v5: 背景は静止グラデーションのみ（軌道パン廃止） ──────────
    // bg画像がある場合も低透明度で静止オーバーレイのみ
    const bgImgPathRaw = join(process.cwd(), 'public', 'images', 'bg', `${opts.category}.png`);
    const hasBgImg = existsSync(bgImgPathRaw);
    const bgImgPath = hasBgImg
      ? bgImgPathRaw.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:')
      : null;

    // 背景画像オーバーレイ: Vercel環境ではpublic/images/bgが含まれないため常にnull
    // movie フィルターはVercel Linuxのffmpeg-staticで動作しないことがあるため使わない
    const bgMovieFilter = '[0:v]copy[base]';

    // ── スライドタイミング計算 ──────────────────────────────────────
    const points = opts.points.slice(0, 4); // 最大4ポイント
    const N = points.length;
    const TITLE_DURATION = 2.0;
    const CTA_DURATION = 2.0;
    const pointDuration = (duration - TITLE_DURATION - CTA_DURATION) / Math.max(N, 1);

    const slides: { start: number; end: number }[] = [];
    slides.push({ start: 0, end: TITLE_DURATION });
    for (let i = 0; i < N; i++) {
      slides.push({
        start: TITLE_DURATION + i * pointDuration,
        end: TITLE_DURATION + (i + 1) * pointDuration,
      });
    }
    slides.push({ start: duration - CTA_DURATION, end: duration + 1 });

    const filters: string[] = [];

    // カテゴリラベル定数
    const CAT_LABEL: Record<string, string> = {
      health: 'HEALTH TIPS', finance: 'MONEY TIPS', education: 'STUDY TIPS',
      life: 'LIFE TIPS', job: 'CAREER TIPS', cheese: 'AI CAREER', music1963: 'MUSIC 1963', japan: 'JAPAN TIPS',
    };
    const catLabel = CAT_LABEL[opts.category] || opts.category.toUpperCase();

    // ── 全スライド共通: アクセントライン（上部） ──────────────────
    filters.push(`drawbox=x=0:y=0:w=1080:h=6:color=${theme.accent}@0.95:t=fill`);

    // ── 全スライド共通: サイト名ロゴ（下部中央固定） ──────────────
    filters.push(...dt(font, theme.siteName, 30, theme.accent, CENTER_X, 1840, 'gte(t,0)', '1'));
    filters.push(`drawbox=x=0:y=1912:w=1080:h=6:color=${theme.accent}@0.9:t=fill`);

    // ── 全スライド共通: プログレスバー ─────────────────────────────
    filters.push(`drawbox=x=0:y=1914:w='min(1080,1080*t/${duration})':h=6:color=${theme.accent}@0.7:t=fill`);

    // ─── スライド0: タイトル ──────────────────────────────────────
    {
      const { start, end } = slides[0];
      const en = `between(t,${start},${end})`;
      const fi = `min(1,(t-${start})*8)`;

      // カテゴリラベル（左寄せ・小）
      filters.push(...dt(font, catLabel, 28, theme.accent, LEFT, 120, en, fi));

      // タイトル（左寄せ・大）
      const titleLines = wrapText(opts.title, 20);
      const titleCount = Math.min(titleLines.length, 3);
      const titleStartY = 220;
      titleLines.slice(0, titleCount).forEach((line, i) => {
        filters.push(...dt(font, line, 64, 'white', LEFT, titleStartY + i * 80, en, `min(1,(t-${start + i * 0.08})*8)`));
      });

      // アクセントライン（タイトル下）
      const underlineY = titleStartY + titleCount * 80 + 12;
      filters.push(`drawbox=x=${LEFT}:y=${underlineY}:w=920:h=3:color=${theme.accent}@0.8:t=fill:enable='${en}'`);
    }

    // ─── スライド1〜N: 各ポイント ─────────────────────────────────
    points.forEach((point, i) => {
      const { start, end } = slides[i + 1];
      const en = `between(t,${start},${end})`;
      const fi = (delay = 0) => `min(1,(t-${start + delay})*8)`;

      // ポイント番号バッジ（左）
      const numLabel = `${i + 1} / ${N}`;
      filters.push(...dt(font, numLabel, 26, theme.accent, LEFT, 100, en, fi(0)));

      // ポイント本文（左寄せ・大）
      const [headline, ...rest] = point.split('\n');
      const cleanHeadline = headline.replace(/^[①②③④⑤\d][.．\s]*/u, '');
      const headLines = wrapText(cleanHeadline, 20);
      const headCount = Math.min(headLines.length, 3);

      const headStartY = 200;
      headLines.slice(0, headCount).forEach((line, li) => {
        filters.push(...dt(font, line, 60, 'white', LEFT, headStartY + li * 74, en, fi(0.06 * li)));
      });

      // サブテキスト（左寄せ・小）
      const subText = rest.join(' ').replace(/^→\s*/, '');
      if (subText) {
        const subLines = wrapText(subText, 26);
        const subStartY = headStartY + headCount * 74 + 30;
        subLines.slice(0, 3).forEach((line, li) => {
          filters.push(...dt(font, line, 42, theme.accent, LEFT, subStartY + li * 56, en, fi(0.15 + li * 0.06)));
        });
      }

      // ヒント（左寄せ・下部）
      filters.push(...dt(font, 'いいね＆チャンネル登録お願いします', 24, 'white@0.7', LEFT, 1770, en, fi(0.4)));
    });

    // ─── CTAスライド ─────────────────────────────────────────────
    {
      const { start, end } = slides[slides.length - 1];
      const en = `between(t,${start},${end + 1})`;
      const fi = (d = 0) => `min(1,(t-${start + d})*8)`;

      // CTAボックス（左寄せ）
      filters.push(`drawbox=x=60:y=550:w=960:h=650:color=${theme.bgSlide}@0.92:t=fill:enable='${en}'`);
      filters.push(`drawbox=x=60:y=550:w=6:h=650:color=${theme.accent}@1:t=fill:enable='${en}'`);

      // CTAテキスト
      const ctaMain = esc(opts.ctaText).slice(0, 22) || 'チャンネル登録';
      filters.push(...dt(font, ctaMain, 44, 'white', LEFT, 600, en, fi(0.05)));
      filters.push(...dt(font, opts.siteUrl.slice(0, 30), 34, theme.accent, LEFT, 680, en, fi(0.12)));
      filters.push(...dt(font, 'いいね＆チャンネル登録お願いします', 30, 'white', LEFT, 760, en, fi(0.2)));
      filters.push(...dt(font, 'コメントで感想を教えてください', 26, theme.accent + '@0.85', LEFT, 820, en, fi(0.28)));
    }

    // ── FFmpeg実行 ────────────────────────────────────────────────
    const ttsPath = join(tmpDir, 'tts.wav');
    const outPath = join(tmpDir, 'canvas.mp4');
    await writeFile(ttsPath, ttsBuffer);


    // シンプルな単色背景（gradients lavfiはVercel Linuxで非対応のためcolorフィルターを使用）
    await execFileAsync(ffmpeg, [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=${theme.bg1}:size=1080x1920:rate=30:duration=${duration + 2}`,
      '-i', bgmPath,
      '-i', ttsPath,
      '-filter_complex', [
        bgMovieFilter + ';',
        `[base]${filters.join(',')}[vid]`,
        ';',
        `[1:a][2:a]amix=inputs=2:duration=shortest:weights=0.35 1[aout]`,
      ].join(''),
      '-map', '[vid]',
      '-map', '[aout]',
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
