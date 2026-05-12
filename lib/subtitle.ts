// lib/subtitle.ts — カラオケ風字幕生成ユーティリティ
// ナレーションをスライド数で分割し、FFmpeg drawtext フィルターを生成する

import { join } from 'path';

const FONT_PATH = join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');

// 1行あたりの最大文字数（全角基準）
const MAX_LINE_CHARS = 16;

/**
 * ナレーションをnSlides個のチャンクに分割する
 */
export function splitNarrationToChunks(narration: string, nSlides: number): string[] {
  // 改行・制御文字を除去してクリーンなテキストに
  const clean = narration.replace(/[\r\n\t]/g, '');
  if (!clean.trim()) return Array(nSlides).fill('');

  // 句点・！・？で文を分割
  const sentences: string[] = [];
  let buf = '';
  for (const ch of clean) {
    buf += ch;
    if ('。！？'.includes(ch)) {
      sentences.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) sentences.push(buf.trim());

  if (sentences.length === 0) return Array(nSlides).fill('');

  // sentences を nSlides 個のグループに均等分配
  const chunks: string[] = Array(nSlides).fill('');
  const perSlide = Math.ceil(sentences.length / nSlides);
  for (let i = 0; i < nSlides; i++) {
    const group = sentences.slice(i * perSlide, (i + 1) * perSlide);
    chunks[i] = group.join('');
  }
  return chunks;
}

/**
 * テキストを指定文字数で折り返す
 * FFmpeg drawtext の改行は '\\n' (バックスラッシュ+n のリテラル2文字)
 */
function wrapText(text: string, maxChars = MAX_LINE_CHARS): string {
  // 実際の改行文字を除去
  const clean = text.replace(/[\r\n]/g, '');
  if (clean.length <= maxChars) return clean;

  const lines: string[] = [];
  let current = '';
  for (const char of clean) {
    current += char;
    if (current.length >= maxChars) {
      lines.push(current);
      current = '';
    }
  }
  if (current) lines.push(current);
  // FFmpeg drawtext の改行: バックスラッシュ + n (2文字、実際の改行ではない)
  return lines.join('\\\\n');
}

/**
 * FFmpeg drawtext フィルター文字列を生成する
 * - スライドごとの時間帯にナレーション字幕を表示
 * - 画面下部に黄色テキスト+黒縁で表示
 */
export function buildSubtitleFilters(
  chunks: string[],
  slideDur: number,
  totalDur: number,
): string[] {
  // Vercel Lambda (Linux) のパスに変換
  const fontFile = FONT_PATH.replace(/\\/g, '/');

  return chunks
    .map((chunk, i) => {
      if (!chunk.trim()) return null;

      const startT = (i * slideDur).toFixed(2);
      const endT   = Math.min((i + 1) * slideDur, totalDur - 0.1).toFixed(2);

      // 折り返し処理（実際の改行なし）
      const wrapped = wrapText(chunk, MAX_LINE_CHARS);

      // FFmpeg drawtext 特殊文字エスケープ
      // シングルクォートとコロンが最も問題になる
      const escaped = wrapped
        .replace(/'/g, '\u2019')    // ' → ' (右シングル引用符)
        .replace(/\\/g, '/')        // バックスラッシュをスラッシュに（\\nの\\nはそのまま）
        .replace(/:/g, '\\\\:')     // : → \:
        .replace(/\[/g, '\\\\[')    // [ → \[
        .replace(/\]/g, '\\\\]');   // ] → \]

      return (
        `drawtext=fontfile='${fontFile}':text='${escaped}':` +
        `fontsize=40:fontcolor=white:` +
        `borderw=4:bordercolor=black@0.95:` +
        `x=(w-text_w)/2:y=h*0.82:` +
        `enable='between(t,${startT},${endT})'`
      );
    })
    .filter((f): f is string => f !== null);
}
