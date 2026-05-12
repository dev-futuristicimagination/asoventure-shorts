// app/api/youtube-analytics/route.ts
// YouTube Analytics API で時間帯別・曜日別データを取得し
// 最適投稿時刻を analytics-optimal-time.json に保存する週次 Cron
// schedule: "0 13 * * *" (JST 22:00 毎日)

import { NextResponse } from 'next/server';
import { getYouTubeToken } from '@/lib/youtube';
import { notifyDiscord } from '@/lib/gemini';

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCGZeUqxlF_8W0uzrz5ZyRpw';
const ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2/reports';

interface HourlyRow { hour: number; views: number; estimatedMinutesWatched: number; }
interface DayRow    { day: string; views: number; }

export async function GET(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = await getYouTubeToken();

    // 過去90日の範囲
    const endDate   = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().split('T')[0];

    // ── 1. 時間帯別データ取得 ─────────────────────────────────────────
    const hourlyParams = new URLSearchParams({
      ids:        `channel==${CHANNEL_ID}`,
      startDate,
      endDate,
      metrics:    'views,estimatedMinutesWatched',
      dimensions: 'hour',
      sort:       '-views',
    });
    const hourlyRes = await fetch(`${ANALYTICS_BASE}?${hourlyParams}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // ── 2. 曜日別データ取得 ─────────────────────────────────────────
    const dayParams = new URLSearchParams({
      ids:        `channel==${CHANNEL_ID}`,
      startDate,
      endDate,
      metrics:    'views',
      dimensions: 'day',
      sort:       'day',
    });
    const dayRes = await fetch(`${ANALYTICS_BASE}?${dayParams}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // ── スコープエラー判定 ─────────────────────────────────────────
    if (!hourlyRes.ok) {
      const errText = await hourlyRes.text();
      if (hourlyRes.status === 403) {
        const msg = '[Analytics] スコープ不足 - YouTube Analytics API が有効でない可能性あり。OAuthスコープに yt-analytics.readonly を追加してください。';
        await notifyDiscord(msg);
        return NextResponse.json({ ok: false, error: msg, detail: errText.slice(0, 300) });
      }
      return NextResponse.json({ ok: false, error: `Analytics API error: ${hourlyRes.status}`, detail: errText.slice(0, 300) });
    }

    const hourlyJson = await hourlyRes.json() as { rows?: [string, string][] };
    const dayJson    = dayRes.ok ? await dayRes.json() as { rows?: [string, string][] } : { rows: [] };

    // ── 時間帯分析 ───────────────────────────────────────────────
    const hourlyRows: HourlyRow[] = (hourlyJson.rows || []).map(r => ({
      hour: parseInt(r[0]),
      views: parseInt(r[1]),
      estimatedMinutesWatched: parseInt(r[2] || '0'),
    }));

    // 時間帯別視聴数でTop3を抽出（JST = UTC+9）
    const sortedByViews = [...hourlyRows].sort((a, b) => b.views - a.views);
    const top3Hours = sortedByViews.slice(0, 3).map(r => {
      const jstHour = (r.hour + 9) % 24;
      return { utcHour: r.hour, jstHour, views: r.views };
    });

    // ── 曜日分析 ─────────────────────────────────────────────────
    const dayViewMap: Record<string, number> = {};
    for (const row of (dayJson.rows || [])) {
      const d = new Date(row[0]);
      const dow = d.getUTCDay(); // 0=日, 1=月 ... 6=土
      dayViewMap[dow] = (dayViewMap[dow] || 0) + parseInt(row[1]);
    }
    const sortedDays = Object.entries(dayViewMap)
      .sort(([,a],[,b]) => b - a)
      .map(([dow, views]) => ({
        dow: parseInt(dow),
        dayName: ['日','月','火','水','木','金','土'][parseInt(dow)],
        views,
      }));

    // ── 最適投稿時刻の決定 ───────────────────────────────────────
    // Top1の時間の30分前に投稿（視聴ピーク前に公開）
    const bestJstHour = top3Hours[0]?.jstHour ?? 19;
    const publishJstHour = bestJstHour > 0 ? bestJstHour - 1 : 23; // 1時間前
    const publishUtcHour = (publishJstHour - 9 + 24) % 24;

    const result = {
      updatedAt:       new Date().toISOString(),
      period:          `${startDate} 〜 ${endDate}`,
      top3ViewHours:   top3Hours,
      topDays:         sortedDays.slice(0, 3),
      recommendation: {
        bestJstHours:    top3Hours.map(h => h.jstHour),
        publishJstHour,
        publishUtcHour,
        note:            `視聴ピーク ${top3Hours[0]?.jstHour ?? 19}時JST の1時間前（${publishJstHour}時JST）に投稿推奨`,
      },
      totalViews:      hourlyRows.reduce((s, r) => s + r.views, 0),
    };

    // ── GitHub にキャッシュ保存 ──────────────────────────────────
    await saveAnalyticsCache(result);

    const msg = `[Analytics] 最適投稿時刻更新: JST ${publishJstHour}:00（視聴ピーク ${top3Hours[0]?.jstHour}時JST）| Top曜日: ${sortedDays[0]?.dayName}曜日`;
    await notifyDiscord(msg);

    return NextResponse.json({ ok: true, ...result });

  } catch (e) {
    const msg = `[Analytics] エラー: ${e instanceof Error ? e.message : String(e)}`;
    await notifyDiscord(msg).catch(() => {});
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// ── GitHub に analytics-optimal-time.json として保存 ──────────────────
async function saveAnalyticsCache(data: object): Promise<void> {
  const token  = process.env.SHORTS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
  const repo   = 'dev-futuristicimagination/asoventure-shorts';
  const path   = 'lib/analytics-optimal-time.json';
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  // 既存SHAの取得（更新時に必要）
  let sha = '';
  try {
    const existing = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'asoventure-shorts' },
    });
    if (existing.ok) {
      const d = await existing.json() as { sha?: string };
      sha = d.sha || '';
    }
  } catch { /* 新規作成 */ }

  const body: Record<string, string> = {
    message: `chore: update analytics-optimal-time.json [${new Date().toISOString().split('T')[0]}]`,
    content,
    branch: 'main',
  };
  if (sha) body.sha = sha;

  await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'asoventure-shorts',
    },
    body: JSON.stringify(body),
  });
}
