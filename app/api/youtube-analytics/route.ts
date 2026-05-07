// app/api/youtube-analytics/route.ts — YouTube Analytics 自動取得 + Discord通知
// 【2026-05-07 実データ分析から実装】
// 毎日の動画パフォーマンスを取得し、どのカテゴリ・フレーミングが強いかを自動分析

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

async function fetchRecentVideoStats(token: string, maxResults = 20): Promise<VideoStats[]> {
  // 直近20本の動画を取得
  const listRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=id,snippet&forMine=true&type=video&order=date&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json() as {
    items?: Array<{ id: { videoId: string }; snippet: { title: string; publishedAt: string } }>;
  };
  if (!listData.items?.length) return [];

  const videoIds = listData.items.map(i => i.id.videoId).join(',');

  // 統計データを取得
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

function analyzePerformance(stats: VideoStats[]): string {
  if (!stats.length) return '動画データなし';

  // 本日の動画だけ抽出
  const today = new Date().toISOString().slice(0, 10);
  const todayVideos = stats.filter(s => s.publishedAt.startsWith(today));
  const allVideos = stats.slice(0, 10); // 直近10本

  // 勝ちパターン検出
  const winPatterns = [
    { pattern: /初任給|NISA|節約|固定費|家計|投資|確定申告/, label: '💰 Finance系' },
    { pattern: /免疫|集中力|睡眠|栄養|食事/, label: '💚 Health実用系' },
    { pattern: /の使い方|最強|科学的|証明/, label: '📐 実用フレーミング' },
    { pattern: /AI|自動|効率/, label: '🤖 AI活用系' },
    { pattern: /ガクチカ|就活プレッシャー|悩んで/, label: '⚠️ 就活特化（弱）' },
  ];

  const topVideo = [...allVideos].sort((a, b) => b.views - a.views)[0];
  const bottomVideo = [...allVideos].sort((a, b) => a.views - b.views)[0];
  const avgViews = allVideos.reduce((s, v) => s + v.views, 0) / allVideos.length;

  // フレーミング別平均
  const patternStats = winPatterns.map(p => {
    const matched = allVideos.filter(v => p.pattern.test(v.title));
    const avg = matched.length ? matched.reduce((s, v) => s + v.views, 0) / matched.length : 0;
    return `${p.label}: 平均${Math.round(avg)}回 (${matched.length}本)`;
  });

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
    '**フレーミング別パフォーマンス:**',
    ...patternStats,
    '',
  ];

  if (todayVideos.length) {
    lines.push('**📅 本日の動画:**');
    todayVideos
      .sort((a, b) => b.views - a.views)
      .forEach(v => lines.push(`  ${v.views}回 | ${v.title.slice(0, 40)}...`));
  }

  // ─── Veo3昇格候補チェック（7日以内に500回超え）────────────────────
  // 【2026-05-07 追加】昇格基準: 7日以内投稿 AND 再生500回超 AND いいね率>1%
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const upgradeCandidate = allVideos.filter(v => {
    const likeRate = v.views > 0 ? v.likes / v.views : 0;
    return v.publishedAt >= sevenDaysAgo && v.views >= 500 && likeRate >= 0.01;
  });

  if (upgradeCandidate.length > 0) {
    lines.push('', '🚀 **Veo3昇格候補（通知のみ）:**');
    upgradeCandidate.forEach(v =>
      lines.push(`  ⬆️ ${v.title.slice(0, 35)} | ${v.views}回 / いいね率${Math.round((v.likes/v.views)*100)}%`)
    );
    lines.push('  → 同トピックでVeo3版を生成することを検討してください');
  }

  lines.push('', '→ 勝ちパターンをプールに反映済み（inferWeight関数）');

  return lines.join('\n');
}

export async function GET(req: Request) {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = await getYouTubeToken();
    const stats = await fetchRecentVideoStats(token, 20);
    const report = analyzePerformance(stats);

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
      report,
      topVideo: stats.sort((a, b) => b.views - a.views)[0],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
