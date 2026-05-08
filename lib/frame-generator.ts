// lib/frame-generator.ts — satori + resvg-wasm による PNG フレーム生成
// 【設計思想】
//   drawtext（Vercel Linux 非対応）を完全に捨てて
//   satori（HTML/CSS → SVG → PNG）でテキスト付きフレームを生成する
//
// 生成フロー:
//   1. NotoSansJP フォントを読み込む（public/fonts/NotoSansJP-Regular.ttf）
//   2. satori でカード状のSVGを生成（タイトル・ポイント・背景・ブランドカラー）
//   3. @resvg/resvg-wasm でSVGをPNGに変換
//   4. 背景画像がある場合は sharp で合成
//   → 最終的に 1080x1920 の PNG バッファを返す

import satori from 'satori';
import { join } from 'path';
import { readFile, existsSync } from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);

// テーマカラー（canvas.tsと同じ）
const THEME: Record<string, { bg: string; accent: string; accent2: string; label: string }> = {
  health:    { bg: '#0D2B1F', accent: '#74C69D', accent2: '#52B788', label: '🌿 HEALTH' },
  finance:   { bg: '#080818', accent: '#F5A623', accent2: '#D48E1A', label: '💰 FINANCE' },
  education: { bg: '#1A0F3D', accent: '#7EC8E3', accent2: '#5AAEC9', label: '📚 EDUCATION' },
  life:      { bg: '#0A2E38', accent: '#FFD166', accent2: '#F0BB4A', label: '🌱 LIFE' },
  japan:     { bg: '#5C0A00', accent: '#FFFFFF', accent2: '#CCCCCC', label: '⛩️ JAPAN' },
  job:       { bg: '#080F18', accent: '#F5A623', accent2: '#D48E1A', label: '💼 JOB' },
  cheese:    { bg: '#100600', accent: '#FFD700', accent2: '#E5C200', label: '🧀 Cheese' },
  music1963: { bg: '#0D0020', accent: '#F8BBD0', accent2: '#E8A8BC', label: '🎵 MUSIC1963' },
};

// フォントキャッシュ（コールドスタート対策）
let fontCache: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const fontPath = join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
  const buf = await readFileAsync(fontPath);
  fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return fontCache;
}

// 背景画像をbase64データURIに変換（satoriはURLをサポートしないため）
async function loadBgImageAsDataUri(category: string): Promise<string | null> {
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
}

// ── PNG フレーム生成（1080 × 1920）────────────────────────────────────────
export async function generateFrame(opts: FrameOptions): Promise<Buffer> {
  const theme = THEME[opts.category] || THEME.health;
  const font = await loadFont();
  const bgDataUri = await loadBgImageAsDataUri(opts.category);

  // ── satori JSX ──────────────────────────────────────────────────────────
  // satori は React JSX 相当のオブジェクトを受け取る
  // 全スタイルはインラインで指定（Tailwind不可・CSSファイル不可）

  const element = {
    type: 'div',
    props: {
      style: {
        width: '1080px',
        height: '1920px',
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'relative' as const,
        overflow: 'hidden',
        fontFamily: 'NotoSansJP',
        backgroundColor: theme.bg,
      },
      children: [
        // ── 背景画像 ──────────────────────────────────────────────────────
        ...(bgDataUri ? [{
          type: 'img',
          props: {
            src: bgDataUri,
            style: {
              position: 'absolute' as const,
              top: 0, left: 0,
              width: '1080px',
              height: '1920px',
              objectFit: 'cover' as const,
              opacity: 0.35,
            },
          },
        }] : []),

        // ── 暗いオーバーレイ ──────────────────────────────────────────────
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute' as const,
              top: 0, left: 0, right: 0, bottom: 0,
              background: `linear-gradient(180deg, ${theme.bg}EE 0%, ${theme.bg}AA 40%, ${theme.bg}CC 100%)`,
            },
            children: [],
          },
        },

        // ── 上部アクセントバー ─────────────────────────────────────────────
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute' as const,
              top: 0, left: 0, right: 0,
              height: '8px',
              backgroundColor: theme.accent,
            },
            children: [],
          },
        },

        // ── 左サイドライン ──────────────────────────────────────────────────
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute' as const,
              top: 0, left: 0, bottom: 0,
              width: '6px',
              backgroundColor: theme.accent,
            },
            children: [],
          },
        },

        // ── コンテンツエリア ──────────────────────────────────────────────
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute' as const,
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex',
              flexDirection: 'column' as const,
              padding: '80px 60px 80px 80px',
              gap: '0px',
            },
            children: [
              // カテゴリラベル
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '40px',
                    color: theme.accent,
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    letterSpacing: '0.05em',
                  },
                  children: theme.label,
                },
              },

              // タイトル（大きく・インパクト重視）
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '72px',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    lineHeight: '1.3',
                    marginBottom: '60px',
                    borderLeft: `8px solid ${theme.accent}`,
                    paddingLeft: '24px',
                  },
                  children: opts.title,
                },
              },

              // ポイントリスト
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: '28px',
                    flex: 1,
                  },
                  children: opts.points.slice(0, 5).map((point, i) => ({
                    type: 'div',
                    props: {
                      key: String(i),
                      style: {
                        display: 'flex',
                        flexDirection: 'row' as const,
                        alignItems: 'flex-start' as const,
                        gap: '20px',
                        backgroundColor: `${theme.accent}15`,
                        borderRadius: '12px',
                        padding: '24px 28px',
                        border: `2px solid ${theme.accent}40`,
                      },
                      children: [
                        // 番号バッジ
                        {
                          type: 'div',
                          props: {
                            style: {
                              backgroundColor: theme.accent,
                              color: theme.bg,
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center' as const,
                              justifyContent: 'center' as const,
                              fontSize: '28px',
                              fontWeight: 'bold',
                              flexShrink: 0,
                            },
                            children: String(i + 1),
                          },
                        },
                        // ポイントテキスト
                        {
                          type: 'div',
                          props: {
                            style: {
                              color: '#FFFFFF',
                              fontSize: '44px',
                              lineHeight: '1.4',
                              flex: 1,
                            },
                            children: point.replace(/^[①②③④⑤]\s*/, '').split('\n')[0],
                          },
                        },
                      ],
                    },
                  })),
                },
              },

              // CTAゾーン
              {
                type: 'div',
                props: {
                  style: {
                    marginTop: '40px',
                    backgroundColor: `${theme.accent}20`,
                    border: `3px solid ${theme.accent}`,
                    borderRadius: '16px',
                    padding: '32px 40px',
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: '12px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { color: theme.accent, fontSize: '40px', fontWeight: 'bold' },
                        children: opts.ctaText,
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { color: '#CCCCCC', fontSize: '36px' },
                        children: opts.siteUrl,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // ── 下部アクセントバー ─────────────────────────────────────────────
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute' as const,
              bottom: 0, left: 0, right: 0,
              height: '8px',
              backgroundColor: theme.accent,
            },
            children: [],
          },
        },
      ],
    },
  };

  // satori で SVG 生成
  const svg = await satori(element as Parameters<typeof satori>[0], {
    width: 1080,
    height: 1920,
    fonts: [
      {
        name: 'NotoSansJP',
        data: font,
        weight: 400,
        style: 'normal',
      },
    ],
  });

  // sharp（Next.js標準バンドル・rsvg内蔵）で SVG → PNG 変換
  // @resvg/resvg-wasm はWASM初期化問題があるためsharpに切り替え
  // sharp は Vercel Linux 環境で確実に動作する
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp');
  const pngBuf = await sharp(Buffer.from(svg))
    .resize(1080, 1920, { fit: 'fill' })
    .png()
    .toBuffer();

  console.log(`[FrameGen] PNG生成完了: ${pngBuf.length} bytes`);
  return pngBuf;
}
