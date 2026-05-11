// lib/canvas.ts — Canvas動画生成 v11「5スライドカット切り替え版」
// 【プロデューサー改訂 2026-05-11】
//   v10からの変更点:
//   - 1枚静止画 → 5スライド xfade カット切り替え（視聴継続率改善）
//   - スライド構成: フック(0-3s) → tip1(3-6s) → tip2(6-9s) → tip3(9-12s) → CTA(12-15s)
//   - 各スライドに独立した zoompan + パーティクルアニメーション
//   - BGMのみ継続（費用ゼロ）
//   - 背景画像はスライドごとに軽微に色変化でメリハリ
//
// 生成フロー:
//   1. satori で日本語テキスト付きPNGフレーム生成（1080x1920）
//   2. FFmpeg:
//      - PNG に zoompan（ゆっくり1.15倍ズームイン）
//      - フローティングカラーパーティクル（sin/cos軌道）
//      - カテゴリBGMをループ再生（-15dB・程よい音量）
//      - 15秒固定・フェードアウト1秒

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
  narration: string;  // v10では使用しない（BGMのみ）
  siteUrl: string;
  fullUrl: string;
  ctaText: string;
  lang?: 'ja' | 'en';
  bgImageUrl?: string;
}

const VIDEO_DURATION = 15; // 秒固定（YouTube Shorts）
const SLIDE_DURATION = 3;   // スライド1枚 = 3秒
const FADE_DURATION  = 0.3; // スライド間クロスフェード

// ── Canvas動画生成 v11 ────────────────────────────────────────────────────
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));
  const accent = (CATEGORY_ACCENT[opts.category] || '#74C69D').replace('#', '');
  const theme  = CANVAS_THEME[opts.category] || CANVAS_THEME.job;

  try {
    // ── STEP 1: 5枚のスライドフレームを生成 ─────────────────────────────────
    // points から tip を3つ取り出す（足りない場合はフォールバック）
    const tips = [
      opts.points[0] || 'ポイント①',
      opts.points[1] || 'ポイント②',
      opts.points[2] || 'ポイント③',
    ];

    // スライド定義
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
    console.log(`[Canvas v11] ${slides.length}枚のフレーム生成完了`);

    // ── STEP 2: BGM 取得 ────────────────────────────────────────────────────
    const bgmFile     = join(process.cwd(), 'public', 'audio', 'bgm', `${opts.category}.mp3`);
    const bgmFallback = join(process.cwd(), 'public', 'audio', 'bgm', 'lofi.mp3');
    const bgmPath     = join(tmpDir, 'bgm.mp3');
    let bgmSrc = bgmFile;
    try { await access(bgmFile, constants.R_OK); } catch { bgmSrc = bgmFallback; }
    await copyFile(bgmSrc, bgmPath);

    // ── STEP 3: FFmpeg 5スライド xfade 動画生成 ─────────────────────────────
    // 各スライドを SLIDE_DURATION 秒の動画に変換 → xfade で繋ぐ
    //
    // フィルター構造:
    //   [0] loop→scale→zoompan→particles→fade → [s0]
    //   [1] loop→scale→zoompan→particles      → [s1]
    //   ...
    //   [s0][s1] xfade → [x01]
    //   [x01][s2] xfade → [x02]
    //   ...
    //   [x03][s4] xfade → fade_out → [vid]
    //   [5:a] volume → fade → [aud]

    const outPath = join(tmpDir, 'canvas.mp4');
    const nSlides = slides.length; // 5
    const zoomFrames = SLIDE_DURATION * 30; // 90フレーム/スライド

    // パーティクル（軽量版: 4個）
    const pParams = [
      { baseX: 540, baseY: 300,  ampX: 100, ampY: 80,  pX: 7,  pY: 9,  ph: 0,   size: 28, alpha: 0.07 },
      { baseX: 200, baseY: 900,  ampX: 80,  ampY: 60,  pX: 5,  pY: 11, ph: 1.5, size: 20, alpha: 0.06 },
      { baseX: 870, baseY: 600,  ampX: 70,  ampY: 100, pX: 9,  pY: 6,  ph: 3.0, size: 24, alpha: 0.06 },
      { baseX: 400, baseY: 1500, ampX: 90,  ampY: 50,  pX: 8,  pY: 7,  ph: 2.0, size: 18, alpha: 0.05 },
    ];

    // 各スライドのフィルターチェーンを構築
    const filterParts: string[] = [];

    for (let i = 0; i < nSlides; i++) {
      // zoompan（各スライド独立: ズーム方向を交互に）
      const zoomDir = i % 2 === 0
        ? `z='min(zoom+0.00044,1.13)'` // ズームイン
        : `z='if(eq(on,1),1.13,max(zoom-0.00044,1.0))'`; // ズームアウト
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
      // スライド出力ラベル（trim: SLIDE_DURATION秒にカット）
      filterParts.push(
        `[${prev}]trim=0:${SLIDE_DURATION},setpts=PTS-STARTPTS[slide${i}]`
      );
    }

    // xfade で5スライドを繋ぐ
    // offset = cumulative_duration - FADE_DURATION
    let xfadeIn = 'slide0';
    for (let i = 1; i < nSlides; i++) {
      const offset = (i * SLIDE_DURATION) - (i * FADE_DURATION) - FADE_DURATION;
      const out = i === nSlides - 1 ? 'xout' : `xf${i}`;
      filterParts.push(
        `[${xfadeIn}][slide${i}]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset.toFixed(2)}[${out}]`
      );
      xfadeIn = out;
    }

    // 最終フェードアウト（ラスト1秒）
    const totalDur = VIDEO_DURATION;
    filterParts.push(`[xout]fade=t=out:st=${totalDur - 1}:d=1[vid]`);

    // BGM
    filterParts.push(`[${nSlides}:a]volume=-13dB,afade=t=out:st=${totalDur - 1.5}:d=1.5[aud]`);

    // FFmpeg 入力: 5枚フレーム + BGM
    const ffmpegArgs: string[] = ['-y'];
    for (const fp of framePaths) {
      ffmpegArgs.push('-loop', '1', '-framerate', '30', '-i', fp);
    }
    ffmpegArgs.push('-stream_loop', '-1', '-i', bgmPath);
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
    console.log(`[Canvas v11] 5スライド動画生成完了 (${totalDur}秒)`);
    return await readFile(outPath);

  } finally {
    await rm(tmpDir, { recursive: true }).catch(() => {});
  }
}


