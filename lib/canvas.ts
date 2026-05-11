// lib/canvas.ts — Canvas動画生成 v12「SE付き5スライドカット切り替え版」
// 【プロデューサー改訂 2026-05-11 v12】
//   v11からの変更点:
//   - カット切り替え時にSE（ポン音）を追加 → ループ感・メリハリ向上
//   - SEはFFmpeg lavfi sine波で生成（外部ファイル不要）
//   - BGMを-13dB → -18dBに下げSEを際立たせる
//   - フックスライドに背景強調（frame-generatorでopacity調整済み）

import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm, copyFile, access } from 'fs/promises';
import { constants } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateFrame } from './frame-generator';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;
const execFileAsync = promisify(execFile);

// カテゴリ別アクセントカラー（パーティクル色に使用）
const CATEGORY_ACCENT: Record<string, string> = {
  health:    '#74C69D',
  finance:   '#F5A623',
  education: '#7EC8E3',
  life:      '#FFD166',
  japan:     '#FFFFFF',
  job:       '#F5A623',
  cheese:    '#FFD700',
  music1963: '#F8BBD0',
};

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
  bgImageUrl?: string;
}

const VIDEO_DURATION = 15; // 秒固定（YouTube Shorts）
const SLIDE_DURATION = 3;   // スライド1枚 = 3秒
const FADE_DURATION  = 0.3; // スライド間クロスフェード

// SE: xfade切り替え時のタイミング（秒）
// スライド0→1: 3-0.3=2.7s, 1→2: 5.7s, 2→3: 8.4s, 3→4: 11.1s
const SE_TIMES: number[] = [2.7, 5.7, 8.4, 11.1];

// ── Canvas動画生成 v12 ────────────────────────────────────────────────────
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));
  const accent = (CATEGORY_ACCENT[opts.category] || '#74C69D').replace('#', '');

  try {
    // ── STEP 1: 5枚のスライドフレームを生成 ─────────────────────────────────
    const tips = [
      opts.points[0] || 'ポイント①',
      opts.points[1] || 'ポイント②',
      opts.points[2] || 'ポイント③',
    ];

    const slides: Array<{ label: string; title: string; points: string[]; isCta: boolean; slideNum?: number; totalSlides?: number }> = [
      // スライド0: フック（問いかけ・インパクト）
      {
        label: 'hook',
        title: opts.title.replace(/#Shorts/i, '').trim(),
        points: ['👆 最後まで見てね！', '知らないと損するかも…'],
        isCta: false,
        slideNum: 1,
        totalSlides: 5,
      },
      // スライド1〜3: tip
      { label: 'tip1', title: tips[0], points: [], isCta: false, slideNum: 2, totalSlides: 5 },
      { label: 'tip2', title: tips[1], points: [], isCta: false, slideNum: 3, totalSlides: 5 },
      { label: 'tip3', title: tips[2], points: [], isCta: false, slideNum: 4, totalSlides: 5 },
      // スライド4: CTA
      {
        label: 'cta',
        title: opts.ctaText || 'チャンネル登録で毎日tips！',
        points: ['👍 いいね & 🔔 チャンネル登録', '💬 コメントで教えてね！'],
        isCta: true,
        slideNum: 5,
        totalSlides: 5,
      },
    ];

    const framePaths: string[] = [];
    for (const slide of slides) {
      const png = await generateFrame({
        category: opts.category,
        title: slide.title,
        points: slide.points,
        siteUrl: opts.siteUrl,
        ctaText: slide.isCta ? (opts.ctaText || '') : '',
        bgImageUrl: opts.bgImageUrl,
        slideNum: slide.slideNum,
        totalSlides: slide.totalSlides,
      });
      const p = join(tmpDir, `frame_${slide.label}.png`);
      await writeFile(p, png);
      framePaths.push(p);
    }
    console.log(`[Canvas v12] ${slides.length}枚のフレーム生成完了`);

    // ── STEP 2: BGM 取得 ────────────────────────────────────────────────────
    const bgmFile     = join(process.cwd(), 'public', 'audio', 'bgm', `${opts.category}.mp3`);
    const bgmFallback = join(process.cwd(), 'public', 'audio', 'bgm', 'lofi.mp3');
    const bgmPath     = join(tmpDir, 'bgm.mp3');
    let bgmSrc = bgmFile;
    try { await access(bgmFile, constants.R_OK); } catch { bgmSrc = bgmFallback; }
    await copyFile(bgmSrc, bgmPath);

    // ── STEP 3: FFmpeg 5スライド xfade + SE 動画生成 ────────────────────────
    const outPath  = join(tmpDir, 'canvas.mp4');
    const nSlides  = slides.length; // 5
    const zoomFrames = SLIDE_DURATION * 30; // 90フレーム/スライド

    // パーティクル（軽量版: 4個）
    const pParams = [
      { baseX: 540, baseY: 300,  ampX: 100, ampY: 80,  pX: 7,  pY: 9,  ph: 0,   size: 28, alpha: 0.07 },
      { baseX: 200, baseY: 900,  ampX: 80,  ampY: 60,  pX: 5,  pY: 11, ph: 1.5, size: 20, alpha: 0.06 },
      { baseX: 870, baseY: 600,  ampX: 70,  ampY: 100, pX: 9,  pY: 6,  ph: 3.0, size: 24, alpha: 0.06 },
      { baseX: 400, baseY: 1500, ampX: 90,  ampY: 50,  pX: 8,  pY: 7,  ph: 2.0, size: 18, alpha: 0.05 },
    ];

    const filterParts: string[] = [];

    // ── 映像フィルター: 各スライド ──────────────────────────────────────────
    for (let i = 0; i < nSlides; i++) {
      // zoompan（交互にIN/OUT）
      const zoomDir = i % 2 === 0
        ? `z='min(zoom+0.00044,1.13)'`
        : `z='if(eq(on,1),1.13,max(zoom-0.00044,1.0))'`;
      filterParts.push(
        `[${i}:v]loop=loop=-1:size=1:start=0,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=${zoomDir}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${zoomFrames}:s=1080x1920:fps=30,setsar=1[z${i}]`
      );
      // パーティクル追加
      let prev = `z${i}`;
      pParams.forEach((p, pi) => {
        const cur = `s${i}p${pi}`;
        const x = `${p.baseX}+${p.ampX}*sin(2*PI*t/${p.pX}+${p.ph.toFixed(2)})`;
        const y = `${p.baseY}+${p.ampY}*cos(2*PI*t/${p.pY}+${p.ph.toFixed(2)})`;
        filterParts.push(
          `[${prev}]drawbox=x='${x}':y='${y}':w=${p.size}:h=${p.size}:color=${accent}@${p.alpha.toFixed(2)}:t=fill[${cur}]`
        );
        prev = cur;
      });
      filterParts.push(
        `[${prev}]trim=0:${SLIDE_DURATION},setpts=PTS-STARTPTS[slide${i}]`
      );
    }

    // xfade で5スライドを繋ぐ
    let xfadeIn = 'slide0';
    for (let i = 1; i < nSlides; i++) {
      const offset = (i * SLIDE_DURATION) - (i * FADE_DURATION) - FADE_DURATION;
      const out = i === nSlides - 1 ? 'xout' : `xf${i}`;
      filterParts.push(
        `[${xfadeIn}][slide${i}]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset.toFixed(2)}[${out}]`
      );
      xfadeIn = out;
    }

    // 最終フェードアウト
    const totalDur = VIDEO_DURATION;
    filterParts.push(`[xout]fade=t=out:st=${totalDur - 1}:d=1[vid]`);

    // ── 音声フィルター: BGM + SE ──────────────────────────────────────────
    // BGM: -18dBに下げてSEを際立たせる
    filterParts.push(`[${nSlides}:a]volume=-18dB,afade=t=out:st=${totalDur - 1.5}:d=1.5[bgm]`);

    // SE: 各カット切り替え時に「ポン」音（sine 880Hz, 0.12秒、-12dB）
    // FFmpeg lavfi で生成、delay で正確なタイミングに配置
    const seInputIdx = nSlides + 1; // lavfiソースのインデックス
    // 各SEをdelay + volumeで個別生成
    const seLabels: string[] = [];
    SE_TIMES.forEach((t, idx) => {
      const label = `se${idx}`;
      const delayMs = Math.round(t * 1000);
      // sine 880Hz (高め・清音) 120ms, -10dB
      filterParts.push(
        `[${seInputIdx}]atrim=start=0:end=0.12,volume=-10dB,adelay=${delayMs}|${delayMs}[${label}]`
      );
      seLabels.push(`[${label}]`);
    });

    // BGM + 全SE をミックス
    const mixInputs = `[bgm]${seLabels.join('')}`;
    const mixCount  = 1 + seLabels.length;
    filterParts.push(
      `${mixInputs}amix=inputs=${mixCount}:duration=first:normalize=0[aud]`
    );

    // FFmpeg 入力: 5枚フレーム + BGM + SE(lavfi sine)
    const ffmpegArgs: string[] = ['-y'];
    for (const fp of framePaths) {
      ffmpegArgs.push('-loop', '1', '-framerate', '30', '-i', fp);
    }
    // BGM（stream_loop）
    ffmpegArgs.push('-stream_loop', '-1', '-i', bgmPath);
    // SE用 lavfi sine ソース（短い音なので1回のみ・4回分 delay で使い回す）
    ffmpegArgs.push(
      '-f', 'lavfi',
      '-i', `sine=frequency=880:sample_rate=44100:duration=${totalDur}`
    );

    ffmpegArgs.push(
      '-filter_complex', filterParts.join(';'),
      '-map', '[vid]',
      '-map', '[aud]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', String(totalDur),
      '-movflags', '+faststart',
      outPath,
    );

    await execFileAsync(ffmpeg, ffmpegArgs, { maxBuffer: 512 * 1024 * 1024 });
    console.log(`[Canvas v12] SE付き5スライド動画生成完了 (${totalDur}秒)`);
    return await readFile(outPath);

  } finally {
    await rm(tmpDir, { recursive: true }).catch(() => {});
  }
}
