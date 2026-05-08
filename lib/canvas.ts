// lib/canvas.ts — Canvas動画生成 v8「OGP画像背景版」
// 【2026-05-08 プロデューサー判断】
// 記事のog:image を背景に使用することで視覚的なクオリティを大幅向上
//
// 生成フロー:
//   1. bgImageUrl が指定されている場合:
//      - 画像をダウンロード → FFmpeg で 1080x1920 に Center Crop
//      - 半透明の暗いオーバーレイ（readability確保）
//      - ブランドアクセントバーを重ねる
//   2. bgImageUrl がない場合:
//      - カテゴリカラーのパルスバービジュアル（v7の動作）
//
// drawtext は Vercel Linux ffmpeg-static に含まれないため使用不可
// テキスト情報は音声TTS + YouTube概要欄で補う

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
  bgImageUrl?: string; // 記事OGP画像URL（背景に使用）
}

// hex → #RRGGBB
function ensureHex(color: string): string {
  return color.startsWith('#') ? color : '#' + color.replace(/^0x/, '');
}

// r,g,b → #RRGGBB (ffmpegはrgb()記法非対応)
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// hex → { r, g, b }
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#|^0x/, '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

// ── Canvas動画生成 v8 ─────────────────────────────────────────────────────
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const theme = CANVAS_THEME[opts.category] || CANVAS_THEME.health;
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));

  const bgColor = ensureHex(theme.bg1);
  const accentHex = ensureHex(theme.accent);
  const { r: aR, g: aG, b: aB } = hexToRgb(accentHex);

  try {
    // TTS音声生成
    const ttsBuffer = await generateTTS(opts.narration);
    const duration = Math.min(Math.max(getTTSDuration(ttsBuffer), 10), 15);

    const ttsPath = join(tmpDir, 'tts.wav');
    const bgImgPath = join(tmpDir, 'bg.jpg');
    const outPath = join(tmpDir, 'canvas.mp4');
    await writeFile(ttsPath, ttsBuffer);

    // ── 背景画像の決定（優先順位）──────────────────────────────────────────
    // 1. public/images/bg/{category}.png（バンドル済み・確実）
    // 2. 記事OGP画像URL（外部取得・失敗しやすい）
    // 3. カラー背景フォールバック
    let hasImage = false;
    const { existsSync } = await import('fs');

    // 優先1: バンドル済みカテゴリ背景画像（Vercel /var/task/public/images/bg/）
    const staticBgPath = join(process.cwd(), 'public', 'images', 'bg', `${opts.category}.png`);
    if (existsSync(staticBgPath)) {
      // 静的ファイルをtmpDirにコピー（FFmpegはtmpファイルを期待）
      const { copyFile } = await import('fs/promises');
      await copyFile(staticBgPath, bgImgPath);
      hasImage = true;
      console.log(`[Canvas] 静的BG画像使用: ${staticBgPath}`);
    }

    // 優先2: 記事OGP画像URL（バンドル画像がない場合のみ試みる）
    if (!hasImage && opts.bgImageUrl) {
      try {
        const imgRes = await fetch(opts.bgImageUrl, {
          signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': 'AsoventureBot/1.0' },
        });
        if (imgRes.ok) {
          const ct = imgRes.headers.get('content-type') || '';
          // 画像レスポンスのみ受け入れ（HTMLエラーページを除外）
          if (ct.startsWith('image/')) {
            const imgBuf = await imgRes.arrayBuffer();
            await writeFile(bgImgPath, Buffer.from(imgBuf));
            hasImage = true;
            console.log(`[Canvas] 記事OGP画像取得: ${opts.bgImageUrl}`);
          }
        }
      } catch (e) {
        console.warn(`[Canvas] OGP画像取得失敗: ${e}`);
      }
    }

    if (!hasImage) {
      console.log(`[Canvas] 画像なし → カラー背景フォールバック`);
    }

    // ── ブランドオーバーレイフィルター（drawboxのみ）──────────────────────
    // 上下アクセントバー + プログレスバー
    const buildOverlayFilter = (inputLabel: string): { filters: string; outputLabel: string } => {
      const parts: string[] = [];
      let prev = inputLabel;
      let idx = 0;
      const next = () => { const l = `ov${idx++}`; return l; };

      // 上部ブランドバー (12px)
      let cur = next();
      parts.push(`[${prev}]drawbox=x=0:y=0:w=1080:h=12:color=${accentHex}@0.95:t=fill[${cur}]`); prev = cur;

      // 下部ブランドバー (12px)
      cur = next();
      parts.push(`[${prev}]drawbox=x=0:y=1908:w=1080:h=12:color=${accentHex}@0.90:t=fill[${cur}]`); prev = cur;

      // 左アクセントライン (4px)
      cur = next();
      parts.push(`[${prev}]drawbox=x=0:y=0:w=4:h=1920:color=${accentHex}@0.75:t=fill[${cur}]`); prev = cur;

      // 右アクセントライン (4px)
      cur = next();
      parts.push(`[${prev}]drawbox=x=1076:y=0:w=4:h=1920:color=${accentHex}@0.40:t=fill[${cur}]`); prev = cur;

      // 上部タイトルゾーン（半透明ダーク）
      cur = next();
      parts.push(`[${prev}]drawbox=x=20:y=80:w=1040:h=200:color=#000000@0.55:t=fill[${cur}]`); prev = cur;
      // タイトルゾーン左アクセント
      cur = next();
      parts.push(`[${prev}]drawbox=x=20:y=80:w=6:h=200:color=${accentHex}@0.95:t=fill[${cur}]`); prev = cur;

      // 中央パルスバー（6本・交互）
      const pulseWidths = [0.80, 0.55, 0.85, 0.45, 0.70, 0.60];
      const barH = 38;
      const barGap = 14;
      const barStart = 750;
      for (let i = 0; i < 6; i++) {
        const y = barStart + i * (barH + barGap);
        const w = Math.floor(960 * pulseWidths[i]);
        const x = i % 2 === 0 ? 60 : 60 + (960 - w);
        cur = next();
        parts.push(`[${prev}]drawbox=x=${x}:y=${y}:w=${w}:h=${barH}:color=${accentHex}@${(0.45 + 0.3 * pulseWidths[i]).toFixed(2)}:t=fill[${cur}]`);
        prev = cur;
      }

      // 下部CTAゾーン（半透明ダーク）
      cur = next();
      parts.push(`[${prev}]drawbox=x=20:y=1620:w=1040:h=260:color=#000000@0.60:t=fill[${cur}]`); prev = cur;
      // CTAゾーン左アクセント
      cur = next();
      parts.push(`[${prev}]drawbox=x=20:y=1620:w=6:h=260:color=${accentHex}@0.90:t=fill[${cur}]`); prev = cur;

      // プログレスバー（動的）
      cur = next();
      parts.push(`[${prev}]drawbox=x=0:y=1912:w='min(1080\\,1080*t/${duration})':h=8:color=${accentHex}@0.80:t=fill[${cur}]`);
      prev = cur;

      return { filters: parts.join(';'), outputLabel: prev };
    };

    if (hasImage) {
      // ── モード1: OGP画像を背景に使用 ──────────────────────────────────
      // 1. 画像を1080x1920にcrop
      // 2. duration秒の静止動画を生成
      // 3. ブランドオーバーレイを重ねる

      const { filters: overlayFilters, outputLabel } = buildOverlayFilter('scaled');

      const filterComplex = [
        // 画像を縦型にcrop（アスペクト比を保って1080幅→1920高さにcrop）
        `[0:v]scale=1080:-1,pad=1080:1920:0:(oh-ih)/2:color=${bgColor},setsar=1[scaled]`,
        // ブランドオーバーレイ
        overlayFilters,
        // 最終出力
        `[${outputLabel}]copy[vid]`,
      ].join(';');

      await execFileAsync(ffmpeg, [
        '-y',
        '-loop', '1', '-i', bgImgPath,                             // OGP画像（静止）
        '-i', ttsPath,                                             // TTS音声
        '-filter_complex', filterComplex,
        '-map', '[vid]',
        '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        '-t', String(duration + 0.5),
        '-movflags', '+faststart',
        outPath,
      ], { maxBuffer: 512 * 1024 * 1024 });

    } else {
      // ── モード2: カテゴリカラー背景（OGP画像なし時のフォールバック）───────
      const { r: bR, g: bG, b: bB } = hexToRgb(ensureHex(theme.bg2));

      const filters: string[] = ['[0:v]copy[base]'];
      let prevLabel = 'base';
      let labelIdx = 0;

      const addBox = (x: string, y: string, w: string, h: string, color: string, alpha: number) => {
        const cur = `v${labelIdx++}`;
        filters.push(`[${prevLabel}]drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}@${alpha.toFixed(2)}:t=fill[${cur}]`);
        prevLabel = cur;
      };

      // 背景ストライプ
      for (let i = 0; i < 6; i++) {
        addBox('0', String(80 + i * 280), '1080', '120', rgbToHex(bR + 15, bG + 15, bB + 15), 0.18);
      }
      // ブランドライン
      addBox('0', '0', '1080', '12', accentHex, 0.95);
      addBox('0', '1908', '1080', '12', accentHex, 0.90);
      addBox('0', '0', '4', '1920', accentHex, 0.80);
      addBox('1076', '0', '4', '1920', accentHex, 0.40);

      // タイトルゾーン
      addBox('20', '80', '1040', '200', rgbToHex(aR - 30, aG - 30, aB - 30), 0.30);
      addBox('20', '80', '6', '200', accentHex, 0.95);

      // パルスバー（6本）
      const pulseWidths = [0.80, 0.55, 0.85, 0.45, 0.70, 0.60];
      for (let i = 0; i < 6; i++) {
        const y = 750 + i * (38 + 14);
        const w = Math.floor(960 * pulseWidths[i]);
        const x = i % 2 === 0 ? 60 : 60 + (960 - w);
        addBox(String(x), String(y), String(w), '38', accentHex, 0.45 + 0.3 * pulseWidths[i]);
      }

      // CTAゾーン
      addBox('20', '1620', '1040', '260', rgbToHex(aR + 20, aG + 20, aB + 20), 0.20);
      addBox('20', '1620', '6', '260', accentHex, 0.90);

      // プログレスバー
      const cur = `v${labelIdx++}`;
      filters.push(`[${prevLabel}]drawbox=x=0:y=1912:w='min(1080\\,1080*t/${duration})':h=8:color=${accentHex}@0.80:t=fill[${cur}]`);
      prevLabel = cur;

      const filterComplex = filters.join(';') + `;[${prevLabel}]copy[vid]`;

      await execFileAsync(ffmpeg, [
        '-y',
        '-f', 'lavfi', '-i', `color=c=${bgColor}:size=1080x1920:rate=30:duration=${duration + 2}`,
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
    }

    return await readFile(outPath);
  } finally {
    await rm(tmpDir, { recursive: true }).catch(() => {});
  }
}
