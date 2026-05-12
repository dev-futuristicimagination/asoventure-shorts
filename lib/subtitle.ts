// lib/subtitle.ts — カラオケ風字幕生成ユーティリティ
// ナレーションをスライド数で分割し、FFmpeg drawtext フィルターを生成する

import { join } from 'path';

const FONT_PATH = join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');

// 1行あたりの最大文字数（全角基準）
const MAX_LINE_CHARS = 18;

/**
 * ナレーションをnSlides個のチャンクに分割する
 * 句点・読点・スペースで自然な区切りを探す
 */
export function splitNarrationToChunks(narration: string, nSlides: number): string[] {
  if (!narration.trim()) return Array(nSlides).fill('');

  // 句点・！・？で文を分割
  const sentences = narration
    .split(/(?<=[。！？…])|(?<=\n)/)
    .map(s => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return Array(nSlides).fill('');

  // sentences を nSlides 個のグループに分配
  const chunks: string[] = [];
  const perSlide = Math.ceil(sentences.length / nSlides);
  for (let i = 0; i < nSlides; i++) {
    const group = sentences.slice(i * perSlide, (i + 1) * perSlide);
    chunks.push(group.join(''));
  }
  // 足りない場合は空文字で埋める
  while (chunks.length < nSlides) chunks.push('');
  return chunks.slice(0, nSlides);
}

/**
 * テキストを指定文字数で折り返す（全角文字考慮）
 * FFmpeg drawtext は \n で改行
 */
function wrapText(text: string, maxChars = MAX_LINE_CHARS): string {
  if (text.length <= maxChars) return text;
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    current += char;
    if (current.length >= maxChars) {
      lines.push(current);
      current = '';
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

/**
 * FFmpeg drawtext フィルター文字列を生成する
 * - スライド0→スライドN-1 それぞれの時間帯にナレーション字幕を表示
 * - 2行まで折り返し、画面下部に黄色テキスト+黒縁で表示
 *
 * @param chunks     splitNarrationToChunks の結果（スライドごとのテキスト）
 * @param slideDur   1スライドの秒数
 * @param totalDur   動画総秒数
 * @returns FFmpeg drawtext フィルター文字列の配列（filter_complexに結合して使う）
 */
export function buildSubtitleFilters(
  chunks: string[],
  slideDur: number,
  totalDur: number,
): string[] {
  const fontFile = FONT_PATH.replace(/\\/g, '/').replace(/:/g, '\\:');

  return chunks
    .map((chunk, i) => {
      if (!chunk.trim()) return null;

      const startT = (i * slideDur).toFixed(2);
      const endT   = Math.min((i + 1) * slideDur, totalDur - 0.1).toFixed(2);

      // テキスト折り返し＆エスケープ
      const wrapped = wrapText(chunk, MAX_LINE_CHARS);
      // FFmpeg drawtext 特殊文字エスケープ
      const escaped = wrapped
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\u2019")   // シングルクォートを右シングル引用符に変換
        .replace(/:/g, '\\:')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');

      // 字幕スタイル: 黄色テキスト・黒縁・下部中央
      return (
        `drawtext=fontfile='${fontFile}':text='${escaped}':` +
        `fontsize=38:fontcolor=yellow:` +
        `borderw=3:bordercolor=black@0.9:` +
        `x=(w-text_w)/2:y=h*0.80:` +
        `line_spacing=6:` +
        `enable='between(t,${startT},${endT})'`
      );
    })
    .filter((f): f is string => f !== null);
}
