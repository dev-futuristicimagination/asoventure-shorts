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
    slideNum?: number;    // v11: スライド番号 (1〜5)
    totalSlides?: number; // v11: スライド総数
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
    const slideNum = opts.slideNum || 1;
    const totalSlides = opts.totalSlides || 1;
    const isCta = slideNum === totalSlides;
    const isHook = slideNum === 1 && totalSlides > 1;

    // スライド進捗インジケーター（● ○ ○ ○ ○）- 大型化
    const dots = Array.from({ length: totalSlides }, (_, i): SatoriElement =>
      div({
        width: '24px', height: '24px', borderRadius: '50%',
        backgroundColor: i < slideNum ? theme.accent : `${theme.accent}40`,
        marginRight: '12px',
      }, '')
    );

    // ポイントカード: フォントサイズ52px（モバイル最適化）
    const pointCards = opts.points.slice(0, 5).map((point, i): SatoriElement => {
        const cleanText = point.replace(/^[1-5]\s*/, '').split('\n')[0];
        return div(
          {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '24px',
                    backgroundColor: `${theme.accent}20`,
                    borderRadius: '16px',
                    padding: '24px 28px',
                    border: `3px solid ${theme.accent}60`,
                    marginBottom: '24px',
          },
                [
                          div({ backgroundColor: theme.accent, color: theme.bg, width: '64px', height: '64px', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', flexShrink: 0 }, String(i + 1)),
                          text(cleanText, { color: '#FFFFFF', fontSize: '52px', lineHeight: '1.4', flex: 1, flexWrap: 'wrap' }),
                        ]
              );
    });

    // スライド別タイトルフォントサイズ（2倍化: モバイル最適化）
    const titleFontSize = isCta ? '80px' : isHook ? '96px' : '100px';

    const rootElement: SatoriElement = div(
    { width: '1080px', height: '1920px', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: 'NotoSansJP', backgroundColor: theme.bg },
        [
                ...(bgDataUri ? [{ type: 'img', props: { src: bgDataUri, style: { position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', objectFit: 'cover', opacity: 0.55 } } } as SatoriElement] : []),
                // グラデーションオーバーレイ（背景に深み）
                div({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', background: `linear-gradient(180deg, ${theme.bg}EE 0%, ${theme.bg}99 50%, ${theme.bg}EE 100%)` }, ''),
                // アクセントライン（太め）
                div({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '14px', backgroundColor: theme.accent }, ''),
                div({ position: 'absolute', top: 0, left: 0, width: '10px', height: '1920px', backgroundColor: theme.accent }, ''),
                div({ position: 'absolute', bottom: 0, left: 0, width: '1080px', height: '14px', backgroundColor: theme.accent }, ''),
                div({ position: 'absolute', top: 0, right: 0, width: '10px', height: '1920px', backgroundColor: `${theme.accent}60` }, ''),  // 右側も薄く
                div(
                  { position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', flexDirection: 'column', padding: '60px 60px 60px 80px' },
                          [
                            // ヘッダー行: ラベル + スライド番号ドット
                            div({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }, [
                              text(theme.label, { fontSize: '44px', color: theme.accent, fontWeight: 'bold', letterSpacing: '2px' }),
                              div({ flexDirection: 'row', alignItems: 'center' }, dots),
                            ]),
                            div({ width: '100%', height: '4px', backgroundColor: `${theme.accent}80`, marginBottom: '36px' }, ''),
                            // タイトル（スライド種別で色変化）
                            div({
                              flexDirection: 'column',
                              borderLeft: `10px solid ${theme.accent}`,
                              paddingLeft: '28px',
                              marginBottom: isCta ? '48px' : '56px',
                              backgroundColor: isHook ? `${theme.accent}18` : `${theme.accent}08`,
                              padding: isHook ? '28px 24px 28px 28px' : '16px 16px 16px 28px',
                              borderRadius: isHook ? '0 16px 16px 0' : '0 8px 8px 0',
                            }, text(opts.title, { fontSize: titleFontSize, fontWeight: 'bold', color: isHook ? theme.accent : '#FFFFFF', lineHeight: '1.3', flexWrap: 'wrap' })),
                            // ポイントカード or CTA専用コンテンツ
                            ...(isCta
                              ? [
                                  // CTA: スワイプ誘導テキスト（最上部）
                                  div({ flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }, [
                                    text('👆 今すぐ上にスワイプ！', { color: theme.accent, fontSize: '52px', fontWeight: 'bold' }),
                                  ]),
                                  div({ flexDirection: 'column', gap: '28px', flex: 1 }, opts.points.map((p): SatoriElement =>
                                    div({ flexDirection: 'row', alignItems: 'center', gap: '24px',
                                          backgroundColor: `${theme.accent}25`, borderRadius: '20px', padding: '28px 36px',
                                          border: `3px solid ${theme.accent}` },
                                      text(p, { color: '#FFFFFF', fontSize: '56px', fontWeight: 'bold' })
                                    )
                                  )),
                                  div({ flexDirection: 'column', backgroundColor: `${theme.accent}30`, border: `4px solid ${theme.accent}`, borderRadius: '20px', padding: '32px 40px', marginTop: '36px' }, [
                                    text(opts.ctaText, { color: theme.accent, fontSize: '48px', fontWeight: 'bold', marginBottom: '12px' }),
                                    text(opts.siteUrl, { color: '#CCCCCC', fontSize: '38px' }),
                                  ]),
                                ]
                              : [
                                  div({ flexDirection: 'column', flex: 1 }, pointCards),
                                  ...(!isHook ? [div({ flexDirection: 'column', backgroundColor: `${theme.accent}12`, border: `2px solid ${theme.accent}60`, borderRadius: '16px', padding: '24px 32px', marginTop: '24px' }, [
                                    text(opts.siteUrl, { color: '#BBBBBB', fontSize: '36px' }),
                                  ])] : []),
                                ]
                            ),
                          ]
                ),
              ]
      );

    const svg = await satori(rootElement as any, { width: 1080, height: 1920, fonts: [{ name: 'NotoSansJP', data: font, weight: 400, style: 'normal' }] });
    const sharp = require('sharp');
    const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
    return pngBuf;
}
