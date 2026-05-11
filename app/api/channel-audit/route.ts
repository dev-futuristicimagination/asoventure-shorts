// app/api/channel-audit/route.ts
// 【2026-05-12 プロデューサー追加】チャンネルID二重構造の確認と修復
// OAuth Refresh Tokenに紐付くチャンネルIDを取得してDiscordに報告
// 手動実行: GET /api/channel-audit?secret=...

import { NextResponse } from 'next/server';
import { getYouTubeToken } from '@/lib/youtube';
import { notifyDiscord } from '@/lib/gemini';

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const token = await getYouTubeToken();

    // OAuth トークンに紐付くチャンネル情報を取得
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json() as {
      items?: Array<{
        id: string;
        snippet: { title: string; description: string; customUrl?: string };
        statistics: { viewCount: string; subscriberCount: string; videoCount: string };
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
      }>;
    };

    const channels = data.items ?? [];

    // Discord に詳細レポートを送信
    const report = [
      '📊 **チャンネルID監査レポート**',
      `取得日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} JST`,
      '',
      ...channels.map((ch, i) => [
        `**チャンネル${i + 1}**`,
        `ID: \`${ch.id}\``,
        `名前: ${ch.snippet.title}`,
        `カスタムURL: ${ch.snippet.customUrl ?? '未設定'}`,
        `登録者: ${ch.statistics.subscriberCount}人`,
        `動画数: ${ch.statistics.videoCount}本`,
        `総再生数: ${ch.statistics.viewCount}回`,
        `アップロードPL: \`${ch.contentDetails?.relatedPlaylists?.uploads ?? 'N/A'}\``,
      ].join('\n')),
      '',
      '---',
      '✅ これがOAuth自動投稿先チャンネルです。',
      'KIの「UCGZeUqxlF_8W0uzrz5ZyRpw」と一致するか確認してください。',
      '不一致の場合は YOUTUBE_REFRESH_TOKEN の更新が必要です。',
    ].join('\n');

    await notifyDiscord(report);

    return NextResponse.json({
      ok: true,
      channels: channels.map(ch => ({
        id: ch.id,
        title: ch.snippet.title,
        customUrl: ch.snippet.customUrl,
        subscriberCount: ch.statistics.subscriberCount,
        videoCount: ch.statistics.videoCount,
        viewCount: ch.statistics.viewCount,
        uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads,
      })),
    });
  } catch (e) {
    const msg = `[ChannelAudit] エラー: ${e instanceof Error ? e.message : String(e)}`;
    await notifyDiscord(msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
