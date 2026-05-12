import satori from 'satori';
import { join } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

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

// ── フォントキャッシュ ────────────────────────────────────────────────
let _fontNoto: Buffer | null = null;

async function loadFont(): Promise<Buffer> {
  if (!_fontNoto) {
    const localPath = join(process.cwd(), 'public', 'fonts', 'NotoSansJP-satori.ttf');
    if (existsSync(localPath)) {
      _fontNoto = await readFile(localPath);
    } else {
      // Vercel: ローカルにない場合はフォールバックURL
      const res = await fetch(
        'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf',
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
      _fontNoto = Buffer.from(await res.arrayBuffer());
    }
  }
  return _fontNoto;
}

// ── 絵文字除去（satori はカラー絵文字TTF未対応のため確実に除去） ───────
// 注: NotoSansJP は絵文字グリフを持たないため、絵文字はすべてテキスト代替に変換する
// これにより □ や satori クラッシュを防ぐ
function e(str: string): string {
  return str
    .replace(/👍/g,  'いいね')
    .replace(/👎/g,  'NG')
    .replace(/🔔/g,  'ベル')
    .replace(/💬/g,  'コメント')
    .replace(/👆/g,  '▲')
    .replace(/📖/g,  '')   // 「記事」不要・→ だけで十分
    .replace(/📋/g,  '')   // タイトルの絵文字は除去
    .replace(/📈/g,  'UP')
    .replace(/📉/g,  'DOWN')
    .replace(/💰/g,  '')
    .replace(/💼/g,  '')
    .replace(/🤝/g,  '')
    .replace(/🔑/g,  '')
    .replace(/✅/g,  '◆')
    .replace(/❌/g,  '×')
    .replace(/⏱️/g, '')
    .replace(/😤/g,  '')
    .replace(/✦/g,   '◆')
    // 残った絵文字をすべて除去
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u2600-\u27FF]/gu, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── 背景画像 Data URI 変換 ──────────────────────────────────────────────
async function loadBgImageAsDataUri(bgImageUrl?: string): Promise<string | null> {
  if (!bgImageUrl) return null;
  // すでにData URI（bg-libraryから変換済み）の場合はそのまま返す
  if (bgImageUrl.startsWith('data:')) return bgImageUrl;
  // HTTP URLの場合はフェッチしてData URIに変換
  try {
    const res = await fetch(bgImageUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    return `data:${mime};base64,${buf.toString('base64')}`;
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
  slideNum?: number;
  totalSlides?: number;
  subtitleText?: string;  // カラオケ字幕テキスト（TTS有効時）
}

type SatoriChild = SatoriElement | string | null;
interface SatoriElement {
  type: string;
  props: {
    style?: Record<string, unknown>;
    children?: SatoriChild | SatoriChild[];
    src?: string;
  };
}

function div(style: Record<string, unknown>, children: SatoriChild | SatoriChild[]): SatoriElement {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } };
}
function txt(content: string, style: Record<string, unknown>): SatoriElement {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children: e(content) } };
}

// ── フレーム生成 ──────────────────────────────────────────────────────────
export async function generateFrame(opts: FrameOptions): Promise<Buffer> {
  const theme      = THEME[opts.category] || THEME.job;
  const fontData   = await loadFont();
  const bgDataUri  = await loadBgImageAsDataUri(opts.bgImageUrl);
  const slideNum   = opts.slideNum   ?? 1;
  const totalSlides = opts.totalSlides ?? 1;
  const isCta  = slideNum === totalSlides;
  const isHook = slideNum === 1 && totalSlides > 1;

  // 進捗ドット
  const dots = Array.from({ length: totalSlides }, (_, i): SatoriElement =>
    div({ width: '24px', height: '24px', borderRadius: '50%',
          backgroundColor: i < slideNum ? theme.accent : `${theme.accent}40`,
          marginRight: '12px' }, '')
  );

  // Tipスライドのポイントカード（hookスライドでは非表示）
  const pointCards = opts.points.slice(0, 3).map((point, i): SatoriElement => {
    const clean = e(point.replace(/^[①②③④⑤1-5]\s*/, '').split('\n')[0]);
    return div({
      flexDirection: 'row', alignItems: 'center', gap: '24px',
      backgroundColor: `${theme.accent}20`, borderRadius: '16px',
      padding: '24px 28px', border: `3px solid ${theme.accent}60`,
      marginBottom: '24px',
    }, [
      div({ backgroundColor: theme.accent, color: theme.bg,
            width: '64px', height: '64px', borderRadius: '50%',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '36px', fontWeight: 'bold', flexShrink: 0 }, String(i + 1)),
      txt(clean, { color: '#FFFFFF', fontSize: '52px', lineHeight: '1.4', flex: 1, flexWrap: 'wrap' }),
    ]);
  });

  // フォントサイズ: hook=96px, tip=88px, cta=80px
  const titleFontSize = isCta ? '80px' : isHook ? '96px' : '88px';

  const root: SatoriElement = div(
    { width: '1080px', height: '1920px', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', fontFamily: 'NotoSansJP',
      // bg-library画像がある場合は透明背景（sharpで合成）、ない場合はtheme.bgで塗る
      backgroundColor: bgDataUri ? 'transparent' : theme.bg },
    [
      // bg-library画像なし時のフォールバック背景色ブロック
      ...(bgDataUri ? [] : [div({
        position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px',
        backgroundColor: theme.bg,
      }, '')]),
      // グラデーションオーバーレイ（上下のみ暗くしてテキスト可読性確保）
      div({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '480px',
            background: `linear-gradient(180deg, ${theme.bg}EE 0%, ${theme.bg}00 100%)` }, ''),
      div({ position: 'absolute', bottom: 0, left: 0, width: '1080px', height: '480px',
            background: `linear-gradient(0deg, ${theme.bg}EE 0%, ${theme.bg}00 100%)` }, ''),
      // アクセントライン（上・下・左・右）
      div({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '14px', backgroundColor: theme.accent }, ''),
      div({ position: 'absolute', bottom: 0, left: 0, width: '1080px', height: '14px', backgroundColor: theme.accent }, ''),
      div({ position: 'absolute', top: 0, left: 0, width: '10px', height: '1920px', backgroundColor: theme.accent }, ''),
      div({ position: 'absolute', top: 0, right: 0, width: '10px', height: '1920px', backgroundColor: `${theme.accent}60` }, ''),

      // 字幕バー（subtitleText が指定された場合のみ表示）
      ...(opts.subtitleText ? [
        div({
          position: "absolute",
          bottom: "80px",
          left: "0px",
          width: "1080px",
          backgroundColor: "rgba(0,0,0,0.75)",
          padding: "20px 40px 24px 40px",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }, [
          txt(e(opts.subtitleText), {
            color: "#FFEE58",
            fontSize: "44px",
            fontWeight: "bold",
            textAlign: "center",
            lineHeight: 1.5,
          }),
        ]),
      ] : []),
      // コンテンツレイヤー
      div({ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px',
            flexDirection: 'column', padding: '60px 60px 60px 80px' }, [

        // ヘッダー: ラベル + 進捗ドット + 登録バッジ（hookスライドのみ）
        div({ flexDirection: 'row', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: '20px' }, [
          txt(theme.label, { fontSize: '44px', color: theme.accent, fontWeight: 'bold', letterSpacing: '2px' }),
          div({ flexDirection: 'row', alignItems: 'center', gap: '16px' }, [
            // hookスライドのみ「毎日更新中」バッジを表示（登録CTA）
            ...(isHook ? [div({
              backgroundColor: theme.accent,
              borderRadius: '999px',
              padding: '8px 20px',
              alignItems: 'center',
              justifyContent: 'center',
            }, txt('ベル 毎日更新', { color: theme.bg, fontSize: '32px', fontWeight: 'bold' }))] : []),
            div({ flexDirection: 'row', alignItems: 'center' }, dots),
          ]),
        ]),
        div({ width: '100%', height: '4px', backgroundColor: `${theme.accent}80`, marginBottom: '36px' }, ''),

        // タイトルブロック
        div({
          flexDirection: 'column',
          borderLeft: `10px solid ${theme.accent}`,
          marginBottom: isCta ? '48px' : '56px',
          backgroundColor: isHook ? `${theme.accent}18` : `${theme.accent}08`,
          padding: isHook ? '28px 24px 28px 28px' : '16px 16px 16px 28px',
          borderRadius: isHook ? '0 16px 16px 0' : '0 8px 8px 0',
        }, txt(opts.title, {
          fontSize: titleFontSize, fontWeight: 'bold',
          color: isHook ? theme.accent : '#FFFFFF',
          lineHeight: '1.3', flexWrap: 'wrap',
        })),

        // CTAスライド
        ...(isCta ? [
          div({ flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }, [
            txt('▲ 今すぐ上にスワイプ！', { color: theme.accent, fontSize: '52px', fontWeight: 'bold' }),
          ]),
          div({ flexDirection: 'column', gap: '28px', flex: 1 },
            opts.points.map((p): SatoriElement =>
              div({ flexDirection: 'row', alignItems: 'center', gap: '24px',
                    backgroundColor: `${theme.accent}25`, borderRadius: '20px',
                    padding: '28px 36px', border: `3px solid ${theme.accent}` },
                txt(p, { color: '#FFFFFF', fontSize: '56px', fontWeight: 'bold' })
              )
            )
          ),
          div({ flexDirection: 'column', backgroundColor: `${theme.accent}30`,
                border: `4px solid ${theme.accent}`, borderRadius: '20px',
                padding: '32px 40px', marginTop: '36px' }, [
            txt(opts.ctaText, { color: theme.accent, fontSize: '48px', fontWeight: 'bold', marginBottom: '12px' }),
            txt(opts.siteUrl, { color: '#CCCCCC', fontSize: '38px' }),
          ]),
        ] : []),

        // Tipスライド（hook以外）
        ...(!isCta && !isHook ? [
          div({ flexDirection: 'column', flex: 1 }, pointCards),
          div({ flexDirection: 'column', backgroundColor: `${theme.accent}12`,
                border: `2px solid ${theme.accent}60`, borderRadius: '16px',
                padding: '24px 32px', marginTop: '24px' }, [
            txt(opts.siteUrl, { color: '#BBBBBB', fontSize: '36px' }),
          ]),
        ] : []),

        // hookスライドはタイトルのみ（ポイントカードなし）
      ]),
    ]
  );

  const satorifonts: Parameters<typeof satori>[1]['fonts'] = [
    { name: 'NotoSansJP', data: fontData, weight: 400, style: 'normal' },
    { name: 'NotoSansJP', data: fontData, weight: 700, style: 'normal' },
  ];

  const svg = await satori(root as any, { width: 1080, height: 1920, fonts: satorifonts });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp');

  // 背景画像がある場合はsharpで合成（satoriの img タグより確実）
  if (bgDataUri) {
    const b64 = bgDataUri.replace(/^data:[^;]+;base64,/, '');
    const bgBuf = Buffer.from(b64, 'base64');
    const textLayer = await sharp(Buffer.from(svg)).png().toBuffer();
    return await sharp(bgBuf)
      .resize(1080, 1920, { fit: 'cover' })
      .composite([{ input: textLayer, blend: 'over' }])
      .png({ compressionLevel: 7, quality: 80 })
      .toBuffer();
  }

  return await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
