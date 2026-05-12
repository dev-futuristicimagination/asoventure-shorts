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
import { generateTTS } from './gemini';
import { splitNarrationToChunks, buildSubtitleFilters } from './subtitle';

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
  hookTitle?: string;   // 疑問文フック（スライド1専用）
  points: string[];
  narration: string;
  siteUrl: string;
  fullUrl: string;
  ctaText: string;
  lang?: 'ja' | 'en';
  bgImageUrl?: string;  // 動的OGP（なければbg-libraryから選択）
  enableTTS?: boolean;  // Gemini TTS有効化フラグ（デフォルト: false）
}

// ── 背景ライブラリ: カテゴリ別事前生成画像をランダム選択 ──────────────────
const BG_LIBRARY: Record<string, string[]> = {
  job:       ['office_night.png', 'salary_up.png', 'resume_desk.png', 'interview.png'],
  health:    ['forest.png', 'wellness.png'],
  finance:   ['finance_data.png'],
  cheese:    ['coaching.png'],
  education: [],
  life:      [],
  japan:     [],
  music1963: [],
};

async function pickBgFromLibrary(category: string, bgImageUrl?: string): Promise<string | undefined> {
  // 動的OGP URLが指定されていればそちらを優先
  if (bgImageUrl) return bgImageUrl;
  // bg-library からランダム選択
  const files = BG_LIBRARY[category] || [];
  if (files.length === 0) return undefined;
  const file = files[Math.floor(Math.random() * files.length)];
  const localPath = join(process.cwd(), 'public', 'images', 'bg-library', category, file);
  try {
    await access(localPath, constants.R_OK);
    // Data URI に変換して返す（frame-generator が fetch しなくて良いよう）
    const buf = await readFile(localPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return undefined;
  }
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
  const accent = (CATEGORY_ACCENT[opts.category] || '#F5A623').replace('#', '');

  // 背景: OGP URL → bg-library → undefined の優先順位で選択
  const bgSource = await pickBgFromLibrary(opts.category, opts.bgImageUrl);
  const hookSlideTitle = opts.hookTitle || opts.title.replace(/#Shorts/i, '').trim();

  try {
    // ── STEP 1: 5枚のスライドフレームを生成 ─────────────────────────────────
    const tips = [
      opts.points[0] || 'ポイント①',
      opts.points[1] || 'ポイント②',
      opts.points[2] || 'ポイント③',
    ];

    const slides: Array<{ label: string; title: string; points: string[]; isCta: boolean; slideNum?: number; totalSlides?: number }> = [
      // スライド0: フック（疑問文 hookTitle を使用）
      {
        label: 'hook',
        title: hookSlideTitle,  // ← Gemini生成の疑問文フック
        points: [],
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
        points: ['いいね & チャンネル登録お願いします', 'コメントで感想を教えてね！'],
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
        bgImageUrl: bgSource,  // ← bg-library から取得したData URI
        slideNum: slide.slideNum,
        totalSlides: slide.totalSlides,
      });
      const p = join(tmpDir, `frame_${slide.label}.png`);
      await writeFile(p, png);
      framePaths.push(p);
    }
    console.log(`[Canvas v12] ${slides.length}枚のフレーム生成完了`);

    // -- STEP 2: BGM + TTS (parallel) --
    const bgmFile     = join(process.cwd(), "public", "audio", "bgm", opts.category + ".mp3");
    const bgmFallback = join(process.cwd(), "public", "audio", "bgm", "lofi.mp3");
    const bgmPath     = join(tmpDir, "bgm.mp3");
    let bgmSrc = bgmFile;
    try { await access(bgmFile, constants.R_OK); } catch { bgmSrc = bgmFallback; }
    const [, ttsResult] = await Promise.all([
      copyFile(bgmSrc, bgmPath),
      opts.enableTTS
        ? generateTTS(opts.narration, opts.category).catch((e: unknown) => {
            console.warn("[Canvas] TTS failed, BGM only:", e); return null;
          })
        : Promise.resolve(null),
    ]);
    let ttsPath: string | null = null;
    let ttsFormatArgs: string[] = []; // FFmpeg format flags for TTS input
    if (ttsResult) {
      // フォーマットに応じた拡張子でファイル保存
      const ext = ttsResult.fileExt || "pcm";
      ttsPath = join(tmpDir, "tts." + ext);
      await writeFile(ttsPath, ttsResult.audioBuffer);
      // PCM (raw L16) の場合はFFmpegにフォーマットを明示して渡す
      if (ext === "pcm") {
        ttsFormatArgs = ["-f", "s16le", "-ar", String(ttsResult.sampleRate || 24000), "-ac", "1"];
      }
      console.log("[Canvas v12] TTS saved ext=" + ext + " " + ttsResult.audioBuffer.length + "B dur=" + ttsResult.durationEstimate.toFixed(1) + "s");
    } else if (opts.enableTTS) {
      console.log("[Canvas v12] TTS failed/skip -> BGM only");
    }

    // ── STEP 3: FFmpeg 5スライド xfade + SE 動画生成 ────────────────────────
    const outPath  = join(tmpDir, 'canvas.mp4');
    const nSlides  = slides.length; // 5
    const zoomFrames = SLIDE_DURATION * 30; // 90フレーム/スライド

    // -- VIDEO FILTER: concat (xfade -> concat to avoid frame rate issues) --
    const filterParts: string[] = [];
    for (let i = 0; i < nSlides; i++) {
      // Scale + zoompan + fps 強制（concatに必要）
      const zoomDir = i % 2 === 0
        ? `z='min(zoom+0.00044,1.13)'`
        : `z='if(eq(on,1),1.13,max(zoom-0.00044,1.0))'`;
      // pal8 -> yuv420p 変換も追加してフォーマット統一
      filterParts.push(
        `[${i}:v]loop=loop=-1:size=1:start=0,format=yuv420p,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=${zoomDir}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${zoomFrames}:s=1080x1920:fps=30,setsar=1[z${i}]`
      );
      // パーティクル（固定座標 - drawboxはt変数非対応）
      let prev = `z${i}`;
      const slideOffset = i * 137;
      const pParams = [
        { baseX: 540, baseY: 300,  ampX: 100, ampY: 80,  size: 28, alpha: 0.07 },
        { baseX: 200, baseY: 900,  ampX: 80,  ampY: 60,  size: 20, alpha: 0.06 },
        { baseX: 870, baseY: 600,  ampX: 70,  ampY: 100, size: 24, alpha: 0.06 },
        { baseX: 400, baseY: 1500, ampX: 90,  ampY: 50,  size: 18, alpha: 0.05 },
      ];
      pParams.forEach((p, pi) => {
        const cur = `s${i}p${pi}`;
        const px = Math.round((p.baseX + slideOffset * p.ampX / 100) % 1080);
        const py = Math.round((p.baseY + slideOffset * p.ampY / 100) % 1900);
        filterParts.push(
          `[${prev}]drawbox=x=${px}:y=${py}:w=${p.size}:h=${p.size}:color=${accent}@${p.alpha.toFixed(2)}:t=fill[${cur}]`
        );
        prev = cur;
      });
      // trim して3秒に切り出し
      filterParts.push(`[${prev}]trim=0:${SLIDE_DURATION},setpts=PTS-STARTPTS[slide${i}]`);
    }

    // concat で5スライドを結合（xfadeの代わり - frame rate問題なし）
    const slideInputs = Array.from({length: nSlides}, (_, i) => `[slide${i}]`).join("");
    filterParts.push(`${slideInputs}concat=n=${nSlides}:v=1:a=0[concatv]`);
    // 字幕（TTS有効時のみ）+ フェードアウト
    const totalDur = VIDEO_DURATION;
    if (opts.enableTTS && opts.narration) {
      // ナレーションをスライドに分割して字幕フィルターを生成
      const narChunks = splitNarrationToChunks(opts.narration, nSlides);
      const subFilters = buildSubtitleFilters(narChunks, SLIDE_DURATION, totalDur);
      if (subFilters.length > 0) {
        // 字幕drawtext を comma 結合して concatv に適用
        const subtitleChain = subFilters.join(',');
        filterParts.push(`[concatv]${subtitleChain},fade=t=out:st=${totalDur - 1}:d=1[vid]`);
        console.log(`[Canvas] 字幕フィルター ${subFilters.length}個追加`);
      } else {
        filterParts.push(`[concatv]fade=t=out:st=${totalDur - 1}:d=1[vid]`);
      }
    } else {
      filterParts.push(`[concatv]fade=t=out:st=${totalDur - 1}:d=1[vid]`);
    }

    // ── 音声フィルター: BGM + SE + TTS ────────────────────────────────────
    // TTS有効時: TTS音声を前面に出し BGM は環境音として後退
    const seInputIdx = nSlides + 1; // lavfi sine source index
    const seLabels: string[] = [];
    if (ttsPath) {
      // TTS入力インデックスはSE(lavfi)の次
      const ttsIdx = nSlides + 2;
      filterParts.push(
        // BGM: -22dBに下げTTSを際立たせる
        `[${nSlides}:a]volume=-22dB,afade=t=out:st=${totalDur - 1.5}:d=1.5[bgm]`,
        // TTS: 先頭から再生・音量-8dB（自然なナレーション音量）
        `[${ttsIdx}:a]volume=-8dB,afade=t=in:st=0:d=0.5,atrim=0:${totalDur},asetpts=PTS-STARTPTS[tts]`
      );
      // SE生成
      SE_TIMES.forEach((t, idx) => {
        const label = `se${idx}`;
        const delayMs = Math.round(t * 1000);
        filterParts.push(
          `[${seInputIdx}]atrim=start=0:end=0.12,volume=-12dB,adelay=${delayMs}|${delayMs}[${label}]`
        );
        seLabels.push(`[${label}]`);
      });
      // BGM + TTS + SE をミックス
      const mixInputsTTS = `[bgm][tts]${seLabels.join('')}`;
      filterParts.push(`${mixInputsTTS}amix=inputs=${1 + 1 + seLabels.length}:duration=first:normalize=0[aud]`);
    } else {
      // BGM + SE のみ（TTS無効 or 失敗時）
      filterParts.push(`[${nSlides}:a]volume=-18dB,afade=t=out:st=${totalDur - 1.5}:d=1.5[bgm]`);
      SE_TIMES.forEach((t, idx) => {
        const label = `se${idx}`;
        const delayMs = Math.round(t * 1000);
        filterParts.push(
          `[${seInputIdx}]atrim=start=0:end=0.12,volume=-10dB,adelay=${delayMs}|${delayMs}[${label}]`
        );
        seLabels.push(`[${label}]`);
      });
      const mixInputs = `[bgm]${seLabels.join('')}`;
      filterParts.push(`${mixInputs}amix=inputs=${1 + seLabels.length}:duration=first:normalize=0[aud]`);
    }

    // FFmpeg 入力: 5枚フレーム + BGM + SE(lavfi sine) [+ TTS]
    const ffmpegArgs: string[] = ['-y'];
    for (const fp of framePaths) {
      ffmpegArgs.push('-loop', '1', '-framerate', '30', '-i', fp);
    }
    // BGM（stream_loop）
    ffmpegArgs.push('-stream_loop', '-1', '-i', bgmPath);
    // SE用 lavfi sine ソース
    ffmpegArgs.push(
      '-f', 'lavfi',
      '-i', `sine=frequency=880:sample_rate=44100:duration=${totalDur}`
    );
    // TTS音声（フォーマット引数付きで追加）
    if (ttsPath) {
      ffmpegArgs.push(...ttsFormatArgs, '-i', ttsPath);
    }

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
