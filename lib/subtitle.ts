// lib/subtitle.ts — カラオケ風字幕生成ユーティリティ

import { join } from 'path';

const FONT_PATH = join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
  .replace(/\\/g, '/'); // Windows→Linux パス変換

const MAX_LINE_CHARS = 15;

/**
 * ナレーションをnSlides個のチャンクに分割する
 */
export function splitNarrationToChunks(narration: string, nSlides: number): string[] {
  // 改行・制御文字を除去
  const clean = narration.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return Array(nSlides).fill('');

  // 句点で文を分割
  const sentences: string[] = [];
  let buf = '';
  for (const ch of clean) {
    buf += ch;
    if ('。！？'.includes(ch)) {
      if (buf.trim()) sentences.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) sentences.push(buf.trim());
  if (sentences.length === 0) sentences.push(clean);

  // nSlides個のグループに均等分配
  const chunks: string[] = Array(nSlides).fill('');
  const perSlide = Math.ceil(sentences.length / nSlides);
  for (let i = 0; i < nSlides; i++) {
    chunks[i] = sentences.slice(i * perSlide, (i + 1) * perSlide).join('');
  }
  return chunks;
}

/**
 * FFmpeg drawtext エスケープ
 * - シングルクォートは削除（代替文字に変換）
 * - コロンはバックスラッシュでエスケープ
 */
function escapeForDrawtext(text: string): string {
  return text
    .replace(/[\r\n]/g, ' ')   // 実際の改行を除去
    .replace(/'/g, '\u2019')   // ' → ' (右シングル引用符)
    .replace(/\\/g, '')        // バックスラッシュを除去
    .replace(/:/g, '.')        // コロンをピリオドに変換（エスケープより安全）
    .replace(/\[/g, '(')       // [ → (
    .replace(/\]/g, ')')       // ] → )
    .trim();
}

/**
 * FFmpeg drawtext フィルター文字列を生成する
 */
export function buildSubtitleFilters(
  chunks: string[],
  slideDur: number,
  totalDur: number,
): string[] {
  return chunks
    .map((chunk, i) => {
      if (!chunk.trim()) return null;

      const startT = (i * slideDur).toFixed(2);
      const endT   = Math.min((i + 1) * slideDur, totalDur - 0.1).toFixed(2);
      const safe = escapeForDrawtext(chunk);
      if (!safe) return null;

      return (
        `drawtext=fontfile='${FONT_PATH}'` +
        `:text='${safe}'` +
        `:fontsize=40` +
        `:fontcolor=white` +
        `:borderw=4` +
        `:bordercolor=black@0.95` +
        `:x=(w-text_w)/2` +
        `:y=h*0.82` +
        `:enable='between(t,${startT},${endT})'`
      );
    })
    .filter((f): f is string => f !== null);
}
