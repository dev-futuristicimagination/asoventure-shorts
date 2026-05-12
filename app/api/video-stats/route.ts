// app/api/video-stats/route.ts — 直近動画の統計分析（一時デバッグ用）
import { NextResponse } from 'next/server';
import { getYouTubeToken } from '@/lib/youtube';

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCGZeUqxlF_8W0uzrz5ZyRpw';

export async function GET() {
  try {
    const token = await getYouTubeToken();

    // 直近3日以内（予約投稿も含む）
    const after = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();

    // 最新20件を日付順で取得
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${CHANNEL_ID}&type=video&order=date&publishedAfter=${after}&maxResults=20`;
    const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
    const searchData = await searchRes.json() as { items?: Array<{ id: { videoId: string }; snippet: { title: string; publishedAt: string } }> };

    const items = searchData.items || [];

    if (items.length === 0) {
      // publishedAfterを外して最新10件
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${CHANNEL_ID}&type=video&order=date&maxResults=10`;
      const fallbackRes = await fetch(fallbackUrl, { headers: { Authorization: `Bearer ${token}` } });
      const fallbackData = await fallbackRes.json() as { items?: Array<{ id: { videoId: string }; snippet: { title: string; publishedAt: string } }> };
      items.push(...(fallbackData.items || []));
    }

    if (items.length === 0) return NextResponse.json({ ok: false, error: '動画なし' });

    const videoIds = items.map(i => i.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status,contentDetails&id=${videoIds}`;
    const statsRes = await fetch(statsUrl, { headers: { Authorization: `Bearer ${token}` } });
    const statsData = await statsRes.json() as {
      items?: Array<{
        id: string;
        snippet: { title: string; publishedAt: string; tags?: string[] };
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
        status: { privacyStatus: string; publishAt?: string };
        contentDetails: { duration: string };
      }>;
    };

    const videos = (statsData.items || []).map(v => ({
      id: v.id,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      scheduledAt: v.status.publishAt,
      privacy: v.status.privacyStatus,
      views: parseInt(v.statistics.viewCount || '0'),
      likes: parseInt(v.statistics.likeCount || '0'),
      comments: parseInt(v.statistics.commentCount || '0'),
      duration: v.contentDetails.duration,
      url: `https://youtu.be/${v.id}`,
    }));

    // 分析サマリー
    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    const avgViews   = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
    const topVideo   = videos.sort((a, b) => b.views - a.views)[0];

    return NextResponse.json({
      ok: true,
      count: videos.length,
      totalViews,
      avgViews,
      topVideo,
      videos: videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    });

  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
