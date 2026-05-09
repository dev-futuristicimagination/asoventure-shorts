// lib/canvas.ts — Canvas動画生成 v10「BGMループ + モーション版」
// 【設計思想：プロデューサー決定 2026-05-08】
//   - TTS ナレーション廃止（API費用削減 + ループ再生対応）
//   - 15秒固定（YouTube Shorts 最適）
//   - BGMのみ（カテゴリ別フリー音源）
//   - zoompan（Ken Burns）で静止画に動きを追加
//   - フローティングパーティクルで「目がつられる」効果
//   - ループ設計：15秒で綺麗に終わり、視聴者が何度も見るよう誘導
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

// ── Canvas動画生成 v10 ────────────────────────────────────────────────────
export async function generateCanvasVideo(opts: CanvasOptions): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const tmpDir = await mkdtemp(join(tmpdir(), 'canvas-'));
  const accent = (CATEGORY_ACCENT[opts.category] || '#74C69D').replace('#', '');

  try {
    // ── STEP 1: satori で日本語テキスト付きPNGフレーム生成 ───────────────
    const framePng = await generateFrame({
      category: opts.category,
      title: opts.title,
      points: opts.points,
      siteUrl: opts.siteUrl,
      ctaText: opts.ctaText, bgImageUrl: opts.bgImageUrl,
    });
    console.log(`[Canvas v10] フレームPNG: ${framePng.length} bytes`);

    const framePath = join(tmpDir, 'frame.png');
    const outPath   = join(tmpDir, 'canvas.mp4');
    await writeFile(framePath, framePng);

    // ── STEP 2: カテゴリBGM の取得 ────────────────────────────────────────
    const bgmFile = join(process.cwd(), 'public', 'audio', 'bgm', `${opts.category}.mp3`);
    const bgmFallback = join(process.cwd(), 'public', 'audio', 'bgm', 'lofi.mp3');
    const bgmPath = join(tmpDir, 'bgm.mp3');

    let bgmSrc = bgmFile;
    try {
      await access(bgmFile, constants.R_OK);
    } catch {
      bgmSrc = bgmFallback;
      console.log(`[Canvas v10] BGMフォールバック: lofi.mp3`);
    }
    await copyFile(bgmSrc, bgmPath);
    console.log(`[Canvas v10] BGM: ${bgmSrc.split(/[\\/]/).pop()}`);

    // ── STEP 3: FFmpeg - zoompan + パーティクル + BGM → 15秒動画 ─────────
    //
    // フィルター設計:
    //   [静止画PNG]
    //     → zoompan(Ken Burns: 1.0→1.15倍 ゆっくりズームイン)
    //     → フローティングパーティクル8個（sin/cos軌道・低透明度）
    //     → アクセントカラーのグロー効果
    //     → 最後1秒フェードアウト
    //   [BGM]
    //     → -15dB音量調整 → afade(out, 14秒から1秒)

    // zoompan: 15秒 × 30fps = 450フレーム で 1.0 → 1.15 にズーム
    // x/y は中心固定（将来的にシフトアニメーションも可能）
    const zoomDur = VIDEO_DURATION * 30; // フレーム数

    // パーティクル（フローティング小円形 → drawbox で代用、低透明度）
    // 8個のパーティクルが独立した周期・位相でゆらゆら動く
    const particles: string[] = [];
    const particleParams = [
      { baseX: 540, baseY: 300,  ampX: 180, ampY: 120, periodX: 7, periodY: 9,  phase: 0,    size: 36, alpha: 0.08 },
      { baseX: 200, baseY: 700,  ampX: 120, ampY: 80,  periodX: 5, periodY: 11, phase: 1.5,  size: 24, alpha: 0.06 },
      { baseX: 870, baseY: 500,  ampX: 90,  ampY: 140, periodX: 9, periodY: 6,  phase: 3.0,  size: 30, alpha: 0.07 },
      { baseX: 150, baseY: 1200, ampX: 100, ampY: 60,  periodX: 6, periodY: 13, phase: 0.8,  size: 20, alpha: 0.05 },
      { baseX: 900, baseY: 1400, ampX: 140, ampY: 100, periodX: 11, periodY: 7, phase: 2.2,  size: 28, alpha: 0.06 },
      { baseX: 400, baseY: 1600, ampX: 80,  ampY: 50,  periodX: 8,  periodY: 5, phase: 4.0,  size: 18, alpha: 0.05 },
      { baseX: 700, baseY: 900,  ampX: 160, ampY: 90,  periodX: 13, periodY: 8, phase: 1.0,  size: 40, alpha: 0.04 },
      { baseX: 300, baseY: 1800, ampX: 110, ampY: 70,  periodX: 7,  periodY: 10, phase: 2.7, size: 22, alpha: 0.06 },
    ];

    // 各パーティクルのフィルターチェーンを構築
    // フィルター構築（チェーン形式）
    const filterParts: string[] = [];

    // zoompan（Ken Burns ゆっくりズームイン）
    filterParts.push(
      `[0:v]zoompan=z='min(zoom+0.00033,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${zoomDur}:s=1080x1920:fps=30,setsar=1[zoomed]`
    );

    // パーティクルを順次重ねる
    let prevLabel = 'zoomed';
    particleParams.forEach((p, i) => {
      const cur = `p${i}`;
      const x = `${p.baseX}+${p.ampX}*sin(2*PI*t/${p.periodX}+${p.phase.toFixed(2)})`;
      const y = `${p.baseY}+${p.ampY}*cos(2*PI*t/${p.periodY}+${p.phase.toFixed(2)})`;
      filterParts.push(
        `[${prevLabel}]drawbox=x='${x}':y='${y}':w=${p.size}:h=${p.size}:color=${accent}@${p.alpha.toFixed(2)}:t=fill[${cur}]`
      );
      prevLabel = cur;
    });

    // フェードアウト（最後1秒）
    filterParts.push(
      `[${prevLabel}]fade=t=out:st=${VIDEO_DURATION - 1}:d=1[vid]`
    );

    // BGM: ボリューム調整 + フェードアウト
    const audioFilter = `[1:a]volume=-15dB,afade=t=out:st=${VIDEO_DURATION - 1.5}:d=1.5[aud]`;
    filterParts.push(audioFilter);

    const filterComplex = filterParts.join(';');

    await execFileAsync(ffmpeg, [
      '-y',
      '-loop', '1',
      '-framerate', '30',
      '-i', framePath,              // 0: 静止PNG
      '-stream_loop', '-1',         // BGMは無限ループ
      '-i', bgmPath,                // 1: BGM
      '-filter_complex', filterComplex,
      '-map', '[vid]',
      '-map', '[aud]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', String(VIDEO_DURATION),  // 15秒固定
      '-movflags', '+faststart',
      outPath,
    ], { maxBuffer: 512 * 1024 * 1024 });

    console.log(`[Canvas v10] 動画生成完了 (${VIDEO_DURATION}秒)`);
    return await readFile(outPath);

  } finally {
    await rm(tmpDir, { recursive: true }).catch(() => {});
  }
}
