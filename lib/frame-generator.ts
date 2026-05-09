import satori from 'satori';
import { join } from 'path';
import { existsSync } from 'fs';
import { readFile as readFileAsync } from 'fs/promises';

const THEME: Record<string, { bg: string; accent: string; label: string }> = {
    health:    { bg: '#0D2B1F', accent: '#74C69D', label: 'HEALTH' },
    finance:   { bg: '#080818', accent: '#F5A623', label: 'FINANCE' },
    education: { bg: '#1A0F3D', accent: '#7EC8E3', label: 'EDUCATION' },
    life:      { bg: '#0A2E38', accent: '#FFD166', label: 'LIFE' },
    japan:     { bg: '#5C0A00', accent: '#FFFFFF', label: 'JAPAN' },
    job:       { bg: '#080F18', accent: '#F5A623', label: 'JOB' },
    cheese:    { bg: '#100600', accent: '#FFD700', label: 'Cheese' },
    music1963: { bg: '#0D0020', accent: '#F8BBD0', label: 'MUSIC1963' },
};

let fontCache: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
    if (fontCache) return fontCache;
    const fontPath = join(process.cwd(), 'public', 'fonts', 'NotoSansJP-satori.ttf');
    let buf: Buffer | null = null;
    if (existsSync(fontPath)) {
          buf = await readFileAsync(fontPath);
    } else {
          const res = await fetch(
                  'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf',
            { signal: AbortSignal.timeout(10000) }
                );
          if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
          const ab = await res.arrayBuffer();
          buf = Buffer.from(ab);
    }
    fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    return fontCache;
}

async function loadBgImageAsDataUri(category: string, bgImageUrl?: string): Promise<string | null> {
    if (bgImageUrl) {
          try {
                  const res = await fetch(bgImageUrl, { signal: AbortSignal.timeout(8000) });
                  if (res.ok) {
                            const ab = await res.arrayBuffer();
                            const buf = Buffer.from(ab);
                            const contentType = res.headers.get('content-type') || 'image/jpeg';
                            const mime = contentType.split(';')[0].trim();
                            return `data:${mime};base64,${buf.toString('base64')}`;
                  }
          } catch (err) {
                  console.warn('[FrameGen] OGP fetch failed:', err);
          }
    }
    const bgPath = join(process.cwd(), 'public', 'images', 'bg', `${category}.png`);
    if (!existsSync(bgPath)) return null;
    try {
          const buf = await readFileAsync(bgPath);
          return `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
          return null;
    }
}

export interface FrameOptions {
    category: string;
    title: string;
    points: string[];
    siteUrl: string;
    ctaText: string;
    bgImageUrl?: string;
}

type SatoriChild = SatoriElement | string | null;
interface SatoriElement {
    type: string;
    props: {
      style?: Record<string, unknown>;
      children?: SatoriChild | SatoriChild[];
      src?: string;
      key?: string;
    };
}

function div(style: Record<string, unknown>, children: SatoriChild | SatoriChild[]): SatoriElement {
    return { type: 'div', props: { style: { display: 'flex', ...style }, children } };
}

function text(content: string, style: Record<string, unknown>): SatoriElement {
    return { type: 'div', props: { style: { display: 'flex', ...style }, children: content } };
}

export async function generateFrame(opts: FrameOptions): Promise<Buffer> {
    const theme = THEME[opts.category] || THEME.health;
    const font = await loadFont();
    const bgDataUri = await loadBgImageAsDataUri(opts.category, opts.bgImageUrl);

  const pointCards = opts.points.slice(0, 5).map((point, i): SatoriElement => {
        const cleanText = point.replace(/^[1-5]\s*/, '').split('\n')[0];
        return div(
          {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '20px',
                    backgroundColor: `${theme.accent}18`,
                    borderRadius: '12px',
                    padding: '20px 24px',
                    border: `2px solid ${theme.accent}50`,
                    marginBottom: '20px',
          },
                [
                          div({ backgroundColor: theme.accent, color: theme.bg, width: '52px', height: '52px', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', flexShrink: 0 }, String(i + 1)),
                          text(cleanText, { color: '#FFFFFF', fontSize: '40px', lineHeight: '1.4', flex: 1, flexWrap: 'wrap' }),
                        ]
              );
  });

  const rootElement: SatoriElement = div(
    { width: '1080px', height: '1920px', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: 'NotoSansJP', backgroundColor: theme.bg },
        [
                ...(bgDataUri ? [{ type: 'img', props: { src: bgDataUri, style: { position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', objectFit: 'cover', opacity: 0.3 } } } as SatoriElement] : []),
                div({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', backgroundColor: `${theme.bg}CC` }, ''),
                div({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '10px', backgroundColor: theme.accent }, ''),
                div({ position: 'absolute', top: 0, left: 0, width: '8px', height: '1920px', backgroundColor: theme.accent }, ''),
                div({ position: 'absolute', bottom: 0, left: 0, width: '1080px', height: '10px', backgroundColor: theme.accent }, ''),
                div(
                  { position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', flexDirection: 'column', padding: '60px 60px 60px 80px' },
                          [
                                      text(theme.label, { fontSize: '38px', color: theme.accent, fontWeight: 'bold', marginBottom: '16px' }),
                                      div({ width: '100%', height: '3px', backgroundColor: `${theme.accent}60`, marginBottom: '32px' }, ''),
                                      div({ flexDirection: 'column', borderLeft: `8px solid ${theme.accent}`, paddingLeft: '24px', marginBottom: '48px' }, text(opts.title, { fontSize: '68px', fontWeight: 'bold', color: '#FFFFFF', lineHeight: '1.35', flexWrap: 'wrap' })),
                                      div({ flexDirection: 'column', flex: 1 }, pointCards),
                                      div({ flexDirection: 'column', backgroundColor: `${theme.accent}20`, border: `3px solid ${theme.accent}`, borderRadius: '16px', padding: '28px 36px', marginTop: '24px' }, [
                                                    text(opts.ctaText, { color: theme.accent, fontSize: '38px', fontWeight: 'bold', marginBottom: '8px' }),
                                                    text(opts.siteUrl, { color: '#AAAAAA', fontSize: '32px' }),
                                                  ]),
                                    ]
                        ),
              ]
      );

  const svg = await satori(rootElement as any, { width: 1080, height: 1920, fonts: [{ name: 'NotoSansJP', data: font, weight: 400, style: 'normal' }] });
    const sharp = require('sharp');
    const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
    return pngBuf;
}
