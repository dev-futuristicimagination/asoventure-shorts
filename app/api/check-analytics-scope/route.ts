// app/api/check-analytics-scope/route.ts
// YouTube Analytics スコープ確認用（一時テストルート）
// スコープがあるか・ないかを判定してDiscord通知する

import { NextResponse } from 'next/server';
import { getYouTubeToken } from '@/lib/youtube';

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCGZeUqxlF_8W0uzrz5ZyRpw';

export async function GET() {
  try {
    const token = await getYouTubeToken();
    const endDate   = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const params = new URLSearchParams({
      ids:        `channel==${CHANNEL_ID}`,
      startDate,
      endDate,
      metrics:    'views',
      dimensions: 'day',
    });

    const res = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const body = await res.text();

    if (res.status === 403) {
      return NextResponse.json({
        ok: false,
        scopeAvailable: false,
        status: 403,
        message: 'YouTube Analytics APIスコープなし → OAuthに yt-analytics.readonly を追加必要',
        detail: body.slice(0, 300),
      });
    }

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        scopeAvailable: null,
        status: res.status,
        message: `APIエラー: ${res.status}`,
        detail: body.slice(0, 300),
      });
    }

    const data = JSON.parse(body);
    return NextResponse.json({
      ok: true,
      scopeAvailable: true,
      message: 'YouTube Analytics APIスコープ確認OK ✅',
      rows: data.rows?.length ?? 0,
      sample: data.rows?.slice(0, 3),
    });

  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
