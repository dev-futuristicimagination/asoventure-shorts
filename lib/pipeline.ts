// lib/pipeline.ts — Phase A / Phase B 共通パイプライン + Canvas（テキスト動画）
// ffmpeg-static を使用してVercel serverless環境でFFmpegを実行

import { requestVeo3, pollAndDownloadVeo3 } from './veo3';
import { getYouTubeToken, uploadToYouTube, postToBuffer, uploadCaptions, postEngagementComment, addToPlaylist, generateSRT } from './youtube';

import { savePending, loadPending, clearPending } from './github';
import { generateDynamicContent, notifyDiscord } from './gemini';
import { generateCanvasVideo } from './canvas';
import type { ShortItem, CtaConfig, PendingData, CanvasItem } from './types';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execFileAsync = promisify(execFile);

// ffmpeg-static: Vercel環境でもFFmpegバイナリが使える
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;

// ─── Veo3送信前プロンプト自動サニタイズ ─────────────────────────────
// 【ユーザーフィードバック 2026-05-07】
// Veo3は日本語テキストを描画できない → 文字化けになる
// → video promptから日本語テキストオーバーレイ指定を除去
// → 「bold text "..."」「at top / at bottom」指定も除去
// → 視覚的なシーン描写のみ残す
function sanitizeVideoPrompt(prompt: string): string {
  return prompt
    // 「bold white/text "..."」パターンを除去（英語・日本語両対応）
    .replace(/,?\s*bold\s+(?:white\s+)?text\s+['"][^'"]*['"]/gi, '')
    // 「at top / at bottom / at center」テキスト位置指定を除去
    .replace(/,?\s*(?:text\s+)?at\s+(?:top|bottom|center)\s+of\s+(?:screen|frame)?/gi, '')
    // テキストオーバーレイ全体の指示文を除去
    .replace(/,?\s*overlay\s+text[^.]*\./gi, '.')
    // 「Opening thumbnail frame: ...」を「Opening scene:」に変換（テキスト指定なし）
    .replace(/Opening thumbnail frame:/gi, 'Opening scene:')
    // 連続カンマ・スペースをクリーンアップ
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── パフォーマンスベース重み付き選択 ─────────────────────────────
// 【2026-05-07 実データ分析結果に基づく設計】
// 今日の実績: Finance「初任給の使い方」= 128回 >> Job「ガクチカ」= 1回
//
// 勝ちパターン（重み4〜5）:
//   ① 具体的ライフイベント（初任給・引越し・NISA）
//   ② 「の使い方」「が最強」「を即解消」実用フレーミング
//   ③ ターゲット：就活生＋社会人の最大公約数（Finance・Health系）
//
// 負けパターン（重み1）:
//   ① 就活専用すぎる（ガクチカ・プレッシャー）
//   ② 感情解消型（悩んでも・辛い・友達関係）
//   ③ 狭いターゲット

interface WeightedItem<T> { item: T; weight: number; }

export function weightedRandom<T>(items: WeightedItem<T>[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const wi of items) {
    r -= wi.weight;
    if (r <= 0) return wi.item;
  }
  return items[items.length - 1].item;
}

// トピック名から重みを自動判定（キーワードベース）
// 【2026-05-07 実データ証明済み】
// 128回: 「初任給の使い方」= How to系（〇〇の使い方）
// 48回: 「集中力が続かない→AI栄養術」= 問題→解決型
// 1回: 「ガクチカ・就活プレッシャー」= 就活専用・感情型
export function inferWeight(topic: string): number {
  const t = topic;
  // 勝ちパターン: Finance×具体数字（128回実証）
  if (/初任給|NISA|節約|固定費|副業|確定申告|家計|投資|ふるさと納税/.test(t)) return 5;
  // 勝ちパターン: How to系フレーミング（〇〇の使い方・やり方・コツ・手順）
  if (/の使い方|やり方|How to|のコツ|手順|ステップ|の始め方|攻略/.test(t)) return 5;
  // 勝ちパターン: 強い実用フレーミング
  if (/最強|即解消|科学的|証明|3倍|5選|5ステップ|ランキング/.test(t)) return 4;
  // 勝ちパターン: Health実用系（48回・32回実証）
  if (/免疫|集中力|睡眠|栄養|食事|引越し|一人暮らし/.test(t)) return 3;
  if (/AI|自動|効率|習慣|スキル|時短/.test(t)) return 3;
  // 負けパターン: 就活専用・感情型（1回実証）
  if (/ガクチカ|就活プレッシャー|悩んで|友達|辛い|ストレス/.test(t)) return 1;
  if (/リフレッシュ|メンタル崩壊|限界|しんどい/.test(t)) return 1;
  return 2;
}

// ─── Veo3 vs Canvas 振り分けルール ─────────────────────────────────
// 【2026-05-07 コスト最適化】
// Veo3: $2.80/本(¥420) → 実績証明済みカテゴリのみ使用
// Canvas: ¥0/本 → 実績未証明・低パフォーマンスカテゴリに使用
//
// 実測データ（2026-05-07）:
//   cheese: 平均3,303回 → Veo3継続（ROI証明済み）
//   job: 平均104回 → Canvas切替（Veo3コスト回収不可）
//   finance/health/education/life/music1963: 20〜106回 → Canvas
//
// 月次コスト:
//   旧: 8カテゴリ × ¥420 × 30日 = ¥100,800
//   新: cheese × ¥420 × 30日 = ¥12,600（88%削減）
const VEO3_CATEGORIES = new Set(['cheese']); // 実績証明後に追加可

function shouldUseVeo3(category: string, item: ShortItem): boolean {
  // アイテム個別指定を最優先
  if (item.useVeo3 === true) return true;
  if (item.useVeo3 === false) return false;
  // カテゴリデフォルト
  return VEO3_CATEGORIES.has(category);
}

// Phase A: Veo3 or Canvas → pending.json保存 or 直接アップロード
export async function phaseA(
  category: string,
  pools: ShortItem[]
): Promise<{ ok: boolean; message: string }> {
  // 重み付き選択（パフォーマンス実績に基づく）
  const weighted = pools.map(p => ({ item: p, weight: inferWeight(p.topic) }));
  const item = weightedRandom(weighted);

  const { narration, youtubeDescription } = await generateDynamicContent(
    item.topic, item.narration, category
  );

  // ── Veo3 vs Canvas 振り分け ──────────────────────────────────
  if (!shouldUseVeo3(category, item)) {
    // Canvas方式: 即時生成→アップロード（pending.json不要・コスト¥0）
    const msg = `[${category}] Canvas生成 → "${item.title}" (Veo3スキップ・コスト削減)`;
    await notifyDiscord(msg);
    // canvas-canvasルートへ内部リダイレクト（API自己呼び出し）
    const canvasUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://asoventure-shorts.vercel.app'}/api/${category}-canvas`;
    try {
      await fetch(canvasUrl, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    } catch {
      // canvas APIが存在しないカテゴリはスキップ（エラーにしない）
    }
    return { ok: true, message: msg };
  }

  // ── Veo3方式: 非同期生成 → pending.json保存 ─────────────────
  // 日本語テキストオーバーレイをサニタイズ
  const cleanPrompt = sanitizeVideoPrompt(item.videoPrompt);
  // キャラクタースピーチ注入（Veo3がキャラに喋らせる → TTS不要）
  const promptWithSpeech = injectCharacterSpeech(cleanPrompt, narration);
  const operationName = await requestVeo3(promptWithSpeech);

  const pending: PendingData = {
    category, topic: item.topic, title: item.title,
    narration, youtubeDescription, videoPrompt: cleanPrompt,
    operationName, createdAt: new Date().toISOString(),
  };
  await savePending(category, pending);

  const msg = `[${category}] Phase A完了: "${item.title}" → Veo3生成中 (¥420)`;
  await notifyDiscord(msg);
  return { ok: true, message: msg };
}

// ─── キャラクタースピーチ注入 ─────────────────────────────────────────
// 【2026-05-07 設計変更】
// Veo3はマルチモーダル（映像＋音声を同時生成）
// キャラクターにセリフを喋らせることで:
// ① TTS不要 → コスト削減 + 口の動きと音声が自然に一致
// ② 動画が15秒になっても途切れない（映像とセリフが同じ長さ）
// ③ いいね・チャンネル登録のCTAもキャラが自然に言える
function injectCharacterSpeech(prompt: string, narration: string): string {
  // ナレーションを120文字以内に圧縮（15秒で自然に喋れる量）
  const speech = narration.slice(0, 130);
  // いいね・チャンネル登録のCTAをキャラが自然に言う
  const ctaScript = 'いいねとチャンネル登録お願いします！';
  return [
    prompt,
    '',
    `[AUDIO SCRIPT: キャラクターが明るく自然に日本語で話す。`,
    `「${speech}」`,
    `最後に視聴者に向けて手を振りながら「${ctaScript}」と言う。`,
    `Duration: 15 seconds. Natural conversational Japanese voice.]`,
  ].join('\n');
}


// Phase B: Veo3完了 → TTS → FFmpeg → YouTube投稿
export async function phaseB(
  category: string,
  cta: CtaConfig
): Promise<{ ok: boolean; message: string; youtubeUrl?: string }> {
  const pending = await loadPending(category);
  if (!pending || !pending.operationName) {
    return { ok: false, message: `[${category}] Phase B: pending.jsonなし` };
  }

  // Veo3ダウンロード
  const videoBuffer = await pollAndDownloadVeo3(pending.operationName);

  // 【2026-05-07 設計変更: TTS廃止 → Veo3キャラ音声をそのまま使用】
  // Veo3がキャラクターのセリフ音声ごと生成するためTTSは不要
  // BGMのみをFFmpegで追加する
  const finalVideo = await mixVideoWithBGM(videoBuffer);

  // YouTube投稿
  const token = await getYouTubeToken();
  const youtubeUrl = await uploadToYouTube(
    token, finalVideo, pending.title, pending.topic, pending.youtubeDescription, cta
  );
  const videoId = youtubeUrl.split('v=')[1] ?? '';

  // ① SRT字幕を自動生成・アップロード（無音視聴者向け）
  if (videoId) {
    const srt = generateSRT(pending.narration, 15);
    await uploadCaptions(token, videoId, srt, 'ja').catch(e => console.warn('[Captions]', e));

    // ② 投稿後コメント（いいね・登録・LINE誘導）
    await postEngagementComment(token, videoId, category).catch(e => console.warn('[Comment]', e));

    // ③ カテゴリ別再生リストに追加
    await addToPlaylist(token, videoId, category).catch(e => console.warn('[Playlist]', e));
  }

  // Buffer(X)投稿
  await postToBuffer(pending.topic, youtubeUrl, category);

  // pending クリア
  await clearPending(category);

  const msg = `[${category}] Phase B完了: "${pending.title}" → ${youtubeUrl}`;
  await notifyDiscord(msg);
  return { ok: true, message: msg, youtubeUrl };
}


// ─── Veo3動画 + BGMのみミックス（TTS不要版）────────────────────────
// Veo3がキャラ音声を内包するため、BGMを重ねるだけでOK
async function mixVideoWithBGM(videoBuffer: Buffer): Promise<Buffer> {
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
  const tmpDir = await mkdtemp(join(tmpdir(), 'shorts-'));
  const bgPath  = join(tmpDir, 'bg.mp4');
  const outPath = join(tmpDir, 'out.mp4');

  await writeFile(bgPath, videoBuffer);

  await execFileAsync(ffmpeg, [
    '-y',
    // Input 0: アンビエントBGM（lavfi生成）
    '-f', 'lavfi',
    '-i', `aevalsrc='0.25*sin(2*PI*220*t)+0.18*sin(2*PI*329.6*t)+0.12*sin(2*PI*440*t)+0.08*sin(2*PI*523.3*t):c=stereo:s=44100'`,
    // Input 1: Veo3動画（映像 + キャラ音声をそのまま使用）
    '-i', bgPath,
    '-filter_complex', [
      // 映像: 9:16縦型クロップ
      '[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[vid]',
      // BGM: エコーでアンビエント風 + 音量5%（キャラ声が主役）
      '[0:a]aecho=0.6:0.7:50|80:0.15|0.1,volume=0.05[bgm]',
      // キャラ音声(1:a) + BGM ミックス（キャラ声を主役に）
      '[1:a][bgm]amix=inputs=2:duration=first:weights=1 0.2[aout]',
    ].join(';'),
    '-map', '[vid]',
    '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    outPath,
  ], { maxBuffer: 512 * 1024 * 1024 });

  const result = await readFile(outPath);
  await rm(tmpDir, { recursive: true }).catch(() => {});
  return result;
}

// オウンドメディア記事の要約動画 = テキスト + グラジエント背景 + BGM + TTS
export async function phaseCanvas(
  category: string,
  item: CanvasItem,
  cta: CtaConfig
): Promise<{ ok: boolean; message: string; youtubeUrl?: string }> {
  try {
    // Canvas動画生成（FFmpegのみ・Veo3不要）
    const videoBuffer = await generateCanvasVideo({
      category,
      title: item.title,
      points: item.points,
      narration: item.narration,
      siteUrl: item.siteUrl,
      fullUrl: item.fullUrl,
      ctaText: item.ctaText,
      lang: item.lang ?? 'ja',
    });

    // YouTube投稿
    const token = await getYouTubeToken();
    const description = [
      item.points.map(p => `✦ ${p}`).join('\n'),
      '',
      item.ctaText,
      item.fullUrl,
    ].join('\n');

    const youtubeUrl = await uploadToYouTube(
      token, videoBuffer, item.title, item.topic, description, cta
    );

    // Buffer(X)投稿
    await postToBuffer(item.topic, youtubeUrl, category);

    const msg = `[${category}] Canvas完了: "${item.title}" → ${youtubeUrl}`;
    await notifyDiscord(msg);
    return { ok: true, message: msg, youtubeUrl };

  } catch (e) {
    const msg = `[${category}] Canvas失敗: ${e instanceof Error ? e.message : String(e)}`;
    await notifyDiscord(msg);
    return { ok: false, message: msg };
  }
}
