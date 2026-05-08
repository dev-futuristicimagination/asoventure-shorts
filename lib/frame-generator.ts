// lib/frame-generator.ts — satori + sharp による PNG フレーム生成 v2
// 【satori制約】
//   - display: flex が全ての複数子要素を持つdivに必須
//   - children が空の場合は [] ではなく '' か null を使う
//   - position: absolute は display: flex の親の中でのみ有効
//   - CSS gradient は background プロパティに文字列で指定

import satori from 'satori';
import { join } from 'path';
import { existsSync } from 'fs';
import { readFile as readFileAsync } from 'fs/promises';

// テーマカラー
const THEME: Record<string, { bg: string; accent: string; label: string }> = {
  health:    { bg: '#0D2B1F', accent: '#74C69D', label: '💚 HEALTH' },
  finance:   { bg: '#080818', accent: '#F5A623', label: '💰 FINANCE' },
  education: { bg: '#1A0F3D', accent: '#7EC8E3', label: '📚 EDUCATION' },
  life:      { bg: '#0A2E38', accent: '#FFD166', label: '🌱 LIFE' },
  japan:     { bg: '#5C0A00', accent: '#FFFFFF', label: '⛩️ JAPAN' },
  job:       { bg: '#080F18', accent: '#F5A623', label: '💼 JOB' },
  cheese:    { bg: '#100600', accent: '#FFD700', label: '🧀 Cheese' },
  music1963: { bg: '#0D0020', accent: '#F8BBD0', label: '🎵 MUSIC1963' },
};

// フォントキャッシュ（コールドスタート対策）
let fontCache: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;

  // NotoSansJP-satori.ttf: Google Fonts の static版（satori互換）
  const fontPath = join(process.cwd(), 'public', 'fonts', 'NotoSansJP-satori.ttf');
  let buf: Buffer | null = null;

  if (existsSync(fontPath)) {
    buf = await readFileAsync(fontPath);
    console.log('[FrameGen] ローカルフォント使用');
  } else {
    // フォールバック: Google Fonts から直接取得
    console.log('[FrameGen] フォントをGoogle Fontsから取得中...');
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

// ── satori React要素のヘルパー ──────────────────────────────────────────────
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

// ── PNG フレーム生成（1080 × 1920）────────────────────────────────────────
export async function generateFrame(opts: FrameOptions): Promise<Buffer> {
  const theme = THEME[opts.category] || THEME.health;
  const font = await loadFont();
  const bgDataUri = await loadBgImageAsDataUri(opts.category);

  // ── ポイントカード生成 ────────────────────────────────────────────────────
  const pointCards = opts.points.slice(0, 5).map((point, i): SatoriElement => {
    const cleanText = point.replace(/^[①②③④⑤]\s*/, '').split('\n')[0];
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
        // 番号
        div(
          {
            backgroundColor: theme.accent,
            color: theme.bg,
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            flexShrink: 0,
          },
          String(i + 1)
        ),
        // テキスト
        text(cleanText, {
          color: '#FFFFFF',
          fontSize: '40px',
          lineHeight: '1.4',
          flex: 1,
          flexWrap: 'wrap',
        }),
      ]
    );
  });

  // ── メインレイアウト ──────────────────────────────────────────────────────
  const rootElement: SatoriElement = div(
    {
      width: '1080px',
      height: '1920px',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'NotoSansJP',
      backgroundColor: theme.bg,
    },
    [
      // 背景画像
      ...(bgDataUri ? [{
        type: 'img',
        props: {
          src: bgDataUri,
          style: {
            position: 'absolute',
            top: 0, left: 0,
            width: '1080px',
            height: '1920px',
            objectFit: 'cover',
            opacity: 0.3,
          },
        },
      } as SatoriElement] : []),

      // オーバーレイ（背景を暗くして読みやすく）
      div(
        {
          position: 'absolute',
          top: 0, left: 0,
          width: '1080px',
          height: '1920px',
          backgroundColor: `${theme.bg}CC`,
        },
        ''
      ),

      // 上部アクセントバー
      div({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '10px', backgroundColor: theme.accent }, ''),

      // 左サイドライン
      div({ position: 'absolute', top: 0, left: 0, width: '8px', height: '1920px', backgroundColor: theme.accent }, ''),

      // 下部アクセントバー
      div({ position: 'absolute', bottom: 0, left: 0, width: '1080px', height: '10px', backgroundColor: theme.accent }, ''),

      // ── メインコンテンツ ────────────────────────────────────────────────
      div(
        {
          position: 'absolute',
          top: 0, left: 0,
          width: '1080px',
          height: '1920px',
          flexDirection: 'column',
          padding: '60px 60px 60px 80px',
        },
        [
          // カテゴリラベル
          text(theme.label, {
            fontSize: '38px',
            color: theme.accent,
            fontWeight: 'bold',
            marginBottom: '16px',
          }),

          // 区切り線
          div({ width: '100%', height: '3px', backgroundColor: `${theme.accent}60`, marginBottom: '32px' }, ''),

          // タイトル
          div(
            {
              flexDirection: 'column',
              borderLeft: `8px solid ${theme.accent}`,
              paddingLeft: '24px',
              marginBottom: '48px',
            },
            text(opts.title, {
              fontSize: '68px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              lineHeight: '1.35',
              flexWrap: 'wrap',
            })
          ),

          // ポイントリスト
          div({ flexDirection: 'column', flex: 1 }, pointCards),

          // CTAゾーン
          div(
            {
              flexDirection: 'column',
              backgroundColor: `${theme.accent}20`,
              border: `3px solid ${theme.accent}`,
              borderRadius: '16px',
              padding: '28px 36px',
              marginTop: '24px',
            },
            [
              text(opts.ctaText, { color: theme.accent, fontSize: '38px', fontWeight: 'bold', marginBottom: '8px' }),
              text(opts.siteUrl, { color: '#AAAAAA', fontSize: '32px' }),
            ]
          ),
        ]
      ),
    ]
  );

  // satori で SVG 生成
  const svg = await satori(rootElement as Parameters<typeof satori>[0], {
    width: 1080,
    height: 1920,
    fonts: [
      { name: 'NotoSansJP', data: font, weight: 400, style: 'normal' },
    ],
  });
  console.log(`[FrameGen] SVG生成完了: ${svg.length} chars`);

  // sharp（Next.js標準・rsvg内蔵）で SVG → PNG 変換
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp');
  const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
  console.log(`[FrameGen] PNG生成完了: ${pngBuf.length} bytes`);
  return pngBuf;
}
