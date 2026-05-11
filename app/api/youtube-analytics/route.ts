// app/api/youtube-analytics/route.ts — YouTube Analytics 自動取得 + inferWeight フィードバック
// 【2026-05-07 実データ分析から実装】
// 【2026-05-10 v2 プロデューサー改訂】
//   - 実データから inferWeight への自動フィードバック追加
//   - カテゴリ別パフォーマンスを数値化し GitHub に analytics-weights.json を書き出し
//   - pipeline.ts の inferWeight がこのファイルを参照して重みを動的調整

import { NextResponse } from 'next/server';

interface VideoStats {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
}

async function getYouTubeToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID || '',
      client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error('YouTube token refresh failed');
  return data.access_token;
}

async function fetchRecentVideoStats(token: string, maxResults = 30): Promise<VideoStats[]> {
  const listRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=id,snippet&forMine=true&type=video&order=date&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json() as {
    items?: Array<{ id: { videoId: string }; snippet: { title: string; publishedAt: string } }>;
  };
  if (!listData.items?.length) return [];

  const videoIds = listData.items.map(i => i.id.videoId).join(',');
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const statsData = await statsRes.json() as {
    items?: Array<{
      id: string;
      snippet: { title: string; publishedAt: string };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
    }>;
  };

  return (statsData.items || []).map(item => ({
    id: item.id,
    title: item.snippet.title,
    views: parseInt(item.statistics.viewCount || '0'),
    likes: parseInt(item.statistics.likeCount || '0'),
    comments: parseInt(item.statistics.commentCount || '0'),
    publishedAt: item.snippet.publishedAt,
  }));
}

// ─── カテゴリ判定（タイトルから推定）─────────────────────────────────────
function detectCategory(title: string): string {
  if (/ガクチカ|ES|自己PR|就活|面接|採用|内定|志望動機|転職|履歴書/.test(title)) return 'cheese';
  if (/上司|職場|同僚|部下|社内|会議|残業|昇進|キャリアアップ|年収/.test(title)) return 'job';
  if (/NISA|投資|節約|家計|貯金|副業|収入|手取り|iDeCo/.test(title)) return 'finance';
  if (/睡眠|食事|運動|免疫|疲労|ストレス|腸活|健康|栄養/.test(title)) return 'health';
  if (/英語|資格|勉強|TOEIC|プログラミング|学習/.test(title)) return 'education';
  if (/暮らし|料理|掃除|整理|節約|一人暮らし/.test(title)) return 'life';
  if (/昭和|歌謡|名曲|懐メロ|アイドル|music1963/.test(title)) return 'music1963';
  return 'unknown';
}

// ─── inferWeight 自動フィードバック計算 ─────────────────────────────────────
// カテゴリ別の平均再生数を基に、次の生成での推奨重みを計算
interface CategoryWeight {
  category: string;
  avgViews: number;
  videoCount: number;
  recommendedWeight: number;
}

function computeInferWeights(stats: VideoStats[]): CategoryWeight[] {
  const byCategory: Record<string, VideoStats[]> = {};
  for (const v of stats) {
    const cat = detectCategory(v.title);
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(v);
  }

  const results: CategoryWeight[] = [];
  const allAvg = stats.reduce((s, v) => s + v.views, 0) / (stats.length || 1);

  for (const [cat, videos] of Object.entries(byCategory)) {
    if (cat === 'unknown') continue;
    const avgViews = videos.reduce((s, v) => s + v.views, 0) / videos.length;
    const ratio = allAvg > 0 ? avgViews / allAvg : 1;

    // 重み: 平均比1.5倍以上→8、1.2倍以上→6、0.8倍以上→4、それ未満→2
    const recommendedWeight = ratio >= 1.5 ? 8 : ratio >= 1.2 ? 6 : ratio >= 0.8 ? 4 : 2;
    results.push({ category: cat, avgViews: Math.round(avgViews), videoCount: videos.length, recommendedWeight });
  }

  return results.sort((a, b) => b.avgViews - a.avgViews);
}

// ─── GitHub に analytics-weights.json を書き出し ───────────────────────────
async function writeWeightsToGitHub(weights: CategoryWeight[]): Promise<void> {
  const pat = process.env.GITHUB_PAT || process.env.GH_PAT;
  if (!pat) {
    console.warn('[analytics] GITHUB_PAT not set, skip writing weights');
    return;
  }

  const data = {
    updatedAt: new Date().toISOString(),
    source: 'youtube-analytics-cron',
    weights: Object.fromEntries(weights.map(w => [w.category, w.recommendedWeight])),
    raw: weights,
  };

  const url = 'https://api.github.com/repos/dev-futuristicimagination/asoventure-shorts/contents/lib/analytics-weights.json';
  const headers = {
    Authorization: `Bearer ${pat}`,
    'User-Agent': 'asoventure-shorts',
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // 既存ファイルのSHAを取得
  let existingSha: string | undefined;
  try {
    const existing = await fetch(url, { headers }).then(r => r.json()) as { sha?: string };
    existingSha = existing.sha;
  } catch {
    // 新規ファイル
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const body: Record<string, unknown> = {
    message: `auto: analytics-weights 自動更新 ${new Date().toISOString().slice(0, 10)} [cron]`,
    content,
  };
  if (existingSha) body.sha = existingSha;

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.warn('[analytics] GitHub write failed:', res.status, await res.text());
  } else {
    console.log('[analytics] analytics-weights.json 更新完了');
  }
}

function analyzePerformance(stats: VideoStats[], weights: CategoryWeight[]): string {
  if (!stats.length) return '動画データなし';

  const today = new Date().toISOString().slice(0, 10);
  const todayVideos = stats.filter(s => s.publishedAt.startsWith(today));
  const allVideos = stats.slice(0, 10);

  const topVideo = [...allVideos].sort((a, b) => b.views - a.views)[0];
  const bottomVideo = [...allVideos].sort((a, b) => a.views - b.views)[0];
  const avgViews = allVideos.reduce((s, v) => s + v.views, 0) / allVideos.length;


  // --- A/B Title Pattern Analysis (2026-05-12 producer) ---
  const WIN_PATTERNS = {
    'NG暴露型':    /NG行動|やってはいけない|してはいけない/,
    '比較逆説型':  /より.*理由|より.*有利|より.*大切/,
    '数字選型':    /[1-9]選|[1-9]つのコツ|TOP[0-9]/,
    '暴露型':      /本当の理由|実は|意外と|知らない/,
    '懐かし型':    /ファミコン|たまごっち|昭和|ポケモン/,
  };
  const patternStats = Object.entries(WIN_PATTERNS).map(([name, regex]) => {
    const matched = allVideos.filter(v => regex.test(v.title));
    const avg = matched.length > 0 ? Math.round(matched.reduce((s,v) => s+v.views,0)/matched.length) : 0;
    return { pattern: name, count: matched.length, avgViews: avg };
  }).filter(p => p.count > 0).sort((a,b) => b.avgViews - a.avgViews);

  const lines = [
    `📊 **YouTube Shorts パフォーマンスレポート** ${today}`,
    '',
    `📈 **直近10本平均**: ${Math.round(avgViews)}回再生`,
    '',
    `🏆 **最高**: ${topVideo.title}`,
    `   → ${topVideo.views}回再生 / ${topVideo.likes}いいね`,
    '',
    `⬇️ **最低**: ${bottomVideo.title}`,
    `   → ${bottomVideo.views}回再生`,
    '',
    '**📊 カテゴリ別実績 → 自動重み調整:**',
    ...weights.map(w => `  ${w.category}: 平均${w.avgViews}回(${w.videoCount}本) → 重み${w.recommendedWeight}`),
    '',
    '→ analytics-weights.json に自動書き出し済み（次回生成から反映）',
    '',
    '**🧪 A/Bタイトルパターン分析:**',
    ...(patternStats.length > 0 ? patternStats.map(p => `  ${p.pattern}: ${p.count}本/平均${p.avgViews}回`) : ['  データ不足']),
  ];

  if (todayVideos.length) {
    lines.push('', '**📅 本日の動画:**');
    todayVideos
      .sort((a, b) => b.views - a.views)
      .forEach(v => lines.push(`  ${v.views}回 | ${v.title.slice(0, 40)}`));
  }

  // Veo3昇格候補
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const upgradeCandidate = allVideos.filter(v => {
    const likeRate = v.views > 0 ? v.likes / v.views : 0;
    return v.publishedAt >= sevenDaysAgo && v.views >= 500 && likeRate >= 0.01;
  });
  if (upgradeCandidate.length > 0) {
    lines.push('', '🚀 **Veo3昇格候補:**');
    upgradeCandidate.forEach(v =>
      lines.push(`  ⬆️ ${v.title.slice(0, 35)} | ${v.views}回 / いいね率${Math.round((v.likes/v.views)*100)}%`)
    );
  }

  return lines.join('\n');
}

export async function GET(req: Request) {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = await getYouTubeToken();
    const stats = await fetchRecentVideoStats(token, 30);

    // ─── inferWeight 自動フィードバック ───────────────────────────────
    const weights = computeInferWeights(stats);
    await writeWeightsToGitHub(weights); // 非同期でGitHubに書き出し

    const report = analyzePerformance(stats, weights);

    // Discord に送信
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (webhook) {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: report }),
      });
    }

    return NextResponse.json({
      ok: true,
      videoCount: stats.length,
      weights,
      report,
      topVideo: stats.sort((a, b) => b.views - a.views)[0],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
