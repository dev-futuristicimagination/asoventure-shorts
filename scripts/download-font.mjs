// scripts/download-font.mjs — satori 互換 NotoSansJP フォントをダウンロード
// NotoSansJP-Regular.ttf（既存）はfvarテーブルの問題でsatorに非互換
// Google Fonts の static版を使用する
import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'public', 'fonts', 'NotoSansJP-satori.ttf');

if (existsSync(outPath)) {
  console.log('Font already exists:', outPath);
  process.exit(0);
}

console.log('Downloading NotoSansJP static TTF from Google Fonts...');
// Noto Sans JP Regular (static, satori互換)
const url = 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf';
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const buf = await res.arrayBuffer();
writeFileSync(outPath, Buffer.from(buf));
console.log(`✅ Saved: ${outPath} (${buf.byteLength} bytes)`);
