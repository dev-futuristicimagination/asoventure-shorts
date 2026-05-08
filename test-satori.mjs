// test-satori.mjs - test satori + sharp in project
import satori from 'satori';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fontPath = join(__dirname, 'public', 'fonts', 'NotoSansJP-Regular.ttf');
const fontBuf = readFileSync(fontPath);
const fontData = fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength);
console.log('Font size:', fontBuf.length);

const element = {
  type: 'div',
  props: {
    style: {
      width: '1080px', height: '1920px',
      display: 'flex', flexDirection: 'column',
      backgroundColor: '#0D2B1F', fontFamily: 'NotoSansJP', color: '#FFFFFF', padding: '80px',
    },
    children: [
      { type: 'div', props: { style: { fontSize: '72px', color: '#74C69D' }, children: 'HEALTH' } },
      { type: 'div', props: { style: { fontSize: '60px', marginTop: '40px' }, children: '自律神経を整える方法' } },
    ],
  },
};

try {
  console.log('satori...');
  const svg = await satori(element, {
    width: 1080, height: 1920,
    fonts: [{ name: 'NotoSansJP', data: fontData, weight: 400, style: 'normal' }],
  });
  console.log('SVG:', svg.length, 'chars ✅');
  console.log('sharp...');
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  console.log('PNG:', png.length, 'bytes ✅');
  writeFileSync('test-output.png', png);
  console.log('Saved test-output.png ✅ FULL PIPELINE WORKS!');
} catch(e) {
  console.error('ERROR:', e.message, e.stack?.slice(0, 300));
}
