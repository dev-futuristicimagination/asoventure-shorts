// test-satori2.mjs - test with font from google fonts (subset)
import satori from 'satori';
import { writeFileSync } from 'fs';
import sharp from 'sharp';

// Google Fonts から Noto Sans JP の static TTF を取得
console.log('Fetching font from Google Fonts...');
const fontRes = await fetch('https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf');
const fontBuf = await fontRes.arrayBuffer();
console.log('Font fetched:', fontBuf.byteLength, 'bytes');

const element = {
  type: 'div',
  props: {
    style: {
      width: '1080px', height: '1920px',
      display: 'flex', flexDirection: 'column',
      backgroundColor: '#0D2B1F', fontFamily: 'NotoSansJP', color: '#FFFFFF', padding: '80px',
    },
    children: [
      { type: 'div', props: { style: { fontSize: '72px', color: '#74C69D', fontWeight: 400 }, children: 'HEALTH' } },
      { type: 'div', props: { style: { fontSize: '60px', marginTop: '40px' }, children: '自律神経を整える方法' } },
      { type: 'div', props: { style: { fontSize: '48px', marginTop: '30px' }, children: '1. 毎日7時間の睡眠' } },
    ],
  },
};

try {
  console.log('satori...');
  const svg = await satori(element, {
    width: 1080, height: 1920,
    fonts: [{ name: 'NotoSansJP', data: fontBuf, weight: 400, style: 'normal' }],
  });
  console.log('SVG:', svg.length, '✅');
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  console.log('PNG:', png.length, '✅');
  writeFileSync('test-output2.png', png);
  console.log('✅ WORKS! Saved test-output2.png');
} catch(e) {
  console.error('ERROR:', e.message);
}
