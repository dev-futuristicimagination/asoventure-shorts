// test-frame-gen.mjs - compiledから実行
// frame-generator.tsをコンパイルした後に実行する
import satori from 'satori';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

// フォント読み込み
const fontPath = join(__dirname, 'public', 'fonts', 'NotoSansJP-satori.ttf');
const fontBuf = readFileSync(fontPath);
const fontData = fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength);
console.log('Font loaded:', fontBuf.length, 'bytes');

// 背景画像
const bgPath = join(__dirname, 'public', 'images', 'bg', 'job.png');
const bgBuf = readFileSync(bgPath);
const bgDataUri = `data:image/png;base64,${bgBuf.toString('base64')}`;

const accent = '#F5A623';
const bg = '#080F18';

// Helper
const flex = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });
const txt = (content, style) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: content } });

const points = ['自己分析は他者評価も聞く', '業界研究は3社以上比較', '職務経歴書を毎月更新'];

const pointCards = points.map((p, i) =>
  flex({
    flexDirection: 'row', alignItems: 'center', gap: '16px',
    backgroundColor: `${accent}18`, borderRadius: '12px', padding: '20px 24px',
    border: `2px solid ${accent}50`, marginBottom: '16px',
  }, [
    flex({ backgroundColor: accent, color: bg, width: '48px', height: '48px', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 'bold', flexShrink: 0 }, String(i+1)),
    txt(p, { color: '#FFFFFF', fontSize: '42px', lineHeight: '1.4', flex: 1 }),
  ])
);

const element = flex(
  { width: '1080px', height: '1920px', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: 'NotoSansJP', backgroundColor: bg },
  [
    { type: 'img', props: { src: bgDataUri, style: { position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', objectFit: 'cover', opacity: 0.3 } } },
    flex({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', backgroundColor: `${bg}CC` }, ''),
    flex({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '10px', backgroundColor: accent }, ''),
    flex({ position: 'absolute', top: 0, left: 0, width: '8px', height: '1920px', backgroundColor: accent }, ''),
    flex({ position: 'absolute', bottom: 0, left: 0, width: '1080px', height: '10px', backgroundColor: accent }, ''),
    flex(
      { position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', flexDirection: 'column', padding: '60px 60px 60px 80px' },
      [
        txt('💼 JOB', { fontSize: '38px', color: accent, fontWeight: 'bold', marginBottom: '16px' }),
        flex({ width: '960px', height: '3px', backgroundColor: `${accent}60`, marginBottom: '32px' }, ''),
        flex({ flexDirection: 'column', borderLeft: `8px solid ${accent}`, paddingLeft: '24px', marginBottom: '40px' },
          txt('転職で差がつく準備5選', { fontSize: '68px', fontWeight: 'bold', color: '#FFFFFF', lineHeight: '1.35' })
        ),
        flex({ flexDirection: 'column', flex: 1 }, pointCards),
        flex(
          { flexDirection: 'column', backgroundColor: `${accent}20`, border: `3px solid ${accent}`, borderRadius: '16px', padding: '28px 36px', marginTop: '24px' },
          [
            txt('📖 記事を読む→', { color: accent, fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }),
            txt('job.asoventure.jp', { color: '#AAAAAA', fontSize: '30px' }),
          ]
        ),
      ]
    ),
  ]
);

try {
  console.log('satori...');
  const svg = await satori(element, { width: 1080, height: 1920, fonts: [{ name: 'NotoSansJP', data: fontData, weight: 400, style: 'normal' }] });
  console.log('SVG:', svg.length, '✅');
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  console.log('PNG:', png.length, '✅');
  writeFileSync('test-frame-output.png', png);
  console.log('✅ SAVED! Open test-frame-output.png to verify');
} catch(e) {
  console.error('❌ ERROR:', e.message);
  console.error(e.stack?.slice(0, 500));
}
