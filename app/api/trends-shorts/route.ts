// app/api/trends-shorts/route.ts
// 【2026-05-12 プロデューサー追加】⑤ Trendsサーフィン自動生成
// Google Trends JP + X Trending → 転職/副業/年収キーワード検出 → 当日Shorts生成
// Cron: 毎朝 6:00 JST (月〜金)

import { NextResponse } from 'next/server';
import { generateDynamicContent, notifyDiscord } from '@/lib/gemini';
import { getYouTubeToken, uploadToYouTube, postEngagementComment, addToPlaylist } from '@/lib/youtube';
import { generateCanvasVideo } from '@/lib/canvas';
import type { CtaConfig } from '@/lib/types';

// トレンドキーワードとJobカテゴリの親和性スコア
const TREND_AFFINITY_KEYWORDS = [
  '転職', '副業', '年収', 'リストラ', '解雇', '採用', 'テレワーク', '在宅',
  'AI', 'ChatGPT', 'スキル', '資格', '給料', '昇給', '就活', '内定',
  '節約', 'NISA', '投資', '物価', '増税', '手取り', '家計',
  '健康', '睡眠', 'メンタル', 'ストレス', '自律神経',
];

// カテゴリ判定
function detectCategory(keyword: string): string {
  if (/転職|採用|就活|内定|キャリア|副業|リストラ/.test(keyword)) return 'job';
  if (/NISA|節約|投資|手取り|給料|家計|税|物価/.test(keyword)) return 'finance';
  if (/健康|睡眠|ストレス|メンタル|自律神経|体調/.test(keyword)) return 'health';
  if (/AI|ChatGPT|スキル|資格|勉強|英語/.test(keyword)) return 'education';
  return 'job'; // default
}

// Googleトレンド RSS から JP トレンドを取得
async function fetchGoogleTrendsJP(): Promise<string[]> {
  try {
    const res = await fetch(
      'https://trends.google.com/trends/trendingsearches/daily/rss?geo=JP',
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const matches = xml.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g);
    return [...matches].map(m => m[1]).slice(0, 20);
  } catch {
    return [];
  }
}

// トレンドキーワードから動画トピックを生成（Gemini）
async function generateTrendTopic(trendWord: string, category: string): Promise<{
  topic: string; title: string; narration: string; points: string[];
}> {
  const key = process.env.GEMINI_API_KEY!;
  const currentYear = new Date().getFullYear();
  const prompt = `YouTubeトレンドキーワード「${trendWord}」を元に、${category}カテゴリのYouTube Shorts用コンテンツを生成してください。

条件:
- 視聴者: 25〜54歳の日本人（転職・副業検討中の社会人）
- 比較型・NG暴露型・「実は知らない真実」型を優先
- ${currentYear}年の最新情報として語る
- 30秒以内で伝えられる分量

JSONで返してください:
{
  "topic": "動画トピック（20文字以内）",
  "title": "タイトル（40文字以内・#Shorts付き）",
  "narration": "ナレーション（100文字以内）",
  "points": ["ポイント1（30文字以内）", "ポイント2", "ポイント3"]
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
        }),
      }
    );
    const json = await res.json() as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }> };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(text);
  } catch {
    return {
      topic: `${trendWord}と転職の関係`,
      title: `${trendWord}が転職市場に与える影響3選 #Shorts`,
      narration: `${trendWord}が話題の今、転職を考えている人が急増しています。`,
      points: ['① 市場の変化を把握する', '② スキルを磨く', '③ 行動を起こす'],
    };
  }
}

const CTA_MAP: Record<string, CtaConfig> = {
  job: {
    block: ['💼 転職・キャリア記事はこちら', 'https://job.asoventure.jp?utm_source=yt_trends', '', '#転職 #キャリア #Shorts'],
    tags: ['job', '転職', 'キャリア', 'Shorts'],
    ytCategoryId: '27',
  },
  finance: {
    block: ['💰 節約・投資記事はこちら', 'https://finance.asoventure.jp?utm_source=yt_trends', '', '#節約 #NISA #Shorts'],
    tags: ['finance', '節約', 'NISA', 'Shorts'],
    ytCategoryId: '27',
  },
  health: {
    block: ['💪 健康tips記事はこちら', 'https://health.asoventure.jp?utm_source=yt_trends', '', '#健康 #自律神経 #Shorts'],
    tags: ['health', '健康', 'Shorts'],
    ytCategoryId: '27',
  },
  education: {
    block: ['📚 学習tips記事はこちら', 'https://education.asoventure.jp?utm_source=yt_trends', '', '#勉強 #スキルアップ #Shorts'],
    tags: ['education', '勉強', 'Shorts'],
    ytCategoryId: '27',
  },
};

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // 1. Google Trends JP を取得
    const trends = await fetchGoogleTrendsJP();
    if (trends.length === 0) {
      return NextResponse.json({ ok: false, message: 'トレンド取得失敗' });
    }

    // 2. 親和性の高いキーワードを抽出（最大2個）
    const matched = trends.filter(t =>
      TREND_AFFINITY_KEYWORDS.some(kw => t.includes(kw))
    ).slice(0, 2);

    if (matched.length === 0) {
      await notifyDiscord(`[Trends] 本日のJPトレンドに親和性キーワードなし: ${trends.slice(0,5).join(', ')}`);
      return NextResponse.json({ ok: true, message: 'no matching trends', trends: trends.slice(0,5) });
    }

    const results = [];
    for (const trendWord of matched) {
      const category = detectCategory(trendWord);
      const content = await generateTrendTopic(trendWord, category);
      const cta = CTA_MAP[category] ?? CTA_MAP.job;

      // Canvas動画生成
      const generated = await generateDynamicContent(content.topic, content.narration, category);
      const videoBuffer = await generateCanvasVideo({
        category,
        title: content.title,
        hookTitle: generated.hookTitle || `${trendWord}、知ってた？`,
        points: content.points,
        narration: generated.narration || content.narration,
        siteUrl: `${category}.asoventure.jp`,
        fullUrl: cta.block[1],
        ctaText: cta.block[0],
        lang: 'ja',
      });

      // YouTube投稿
      const token = await getYouTubeToken();
      const desc = `${trendWord}が話題の今、知っておきたい${content.topic}をわかりやすく解説。`;
      const youtubeUrl = await uploadToYouTube(token, videoBuffer, content.title, content.topic, desc, cta);
      const videoId = youtubeUrl.split('v=')[1] ?? '';

      if (videoId) {
        await postEngagementComment(token, videoId, category);
        await addToPlaylist(token, videoId, category).catch(() => {});
      }

      const msg = `[Trends] トレンド「${trendWord}」→ ${content.title} | ${youtubeUrl}`;
      await notifyDiscord(msg);
      results.push({ trendWord, category, title: content.title, youtubeUrl });
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (e) {
    const msg = `[Trends] エラー: ${e instanceof Error ? e.message : String(e)}`;
    await notifyDiscord(msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
