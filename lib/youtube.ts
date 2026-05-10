// lib/youtube.ts — YouTube OAuth + Upload 共有モジュール
// 【2026-05-07 重要修正】CTAの整合性を確保
// - 実在しないサービス機能を宣伝する「うその宣言」を全て除去
// - 動画が約束できるのは「チャンネル登録」と「LINE相談（Cheese）」のみ
// - カテゴリ別に実在する誘導先のみを使用

import type { CtaConfig } from './types';

export async function getYouTubeToken(): Promise<string> {
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

// ── 実在するCTAのみ（カテゴリ別）────────────────────────────────────
// ⚠️ 「〇〇.asoventure.jpで〇〇できます」はサービスが実在する場合のみ
// 実在確認済み: cheese.asoventure.jp / lin.ee/8VAVNEk / job.asoventure.jp
// 未確認: health / finance / education / life.asoventure.jp
//   → これらはチャンネル登録 + LINE相談のみに絞る
function buildDescription(
  topic: string,
  description: string,
  cta: CtaConfig
): string {
  const ENGAGEMENT_CTA = [
    '👍 いいね & 🔔 チャンネル登録で毎日役立つ情報をお届け！',
    '💬 感想・質問はコメントで教えてください↓',
    '',
  ].join('\n');

  const AI_DISCLOSURE = [
    '',
    '────────────────',
    '【制作情報】この動画はAI（Veo3・Gemini）を使用して生成されています。',
    'Made with AI: Veo3 (Google DeepMind) + Gemini',
    '────────────────',
  ].join('\n');

  return [ENGAGEMENT_CTA, topic, '', description, AI_DISCLOSURE, '', ...cta.block].join('\n');
}

// ── SRT字幕生成（narrationテキストから自動生成）──────────────────────
// 視聴完了率UP：Shortsの60〜70%は無音視聴 → 字幕で補完
export function generateSRT(narration: string, durationSeconds = 15): string {
  // narrationを自然な区切り（句点・読点・改行）でセグメント分割
  const segments = narration
    .replace(/([。！？\n])/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .slice(0, 6); // 最大6セグメント

  if (!segments.length) return '';

  const timePerSeg = durationSeconds / segments.length;

  const toSRTTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  return segments.map((text, i) => {
    const start = i * timePerSeg;
    const end = (i + 1) * timePerSeg - 0.1;
    return `${i + 1}\n${toSRTTime(start)} --> ${toSRTTime(end)}\n${text}`;
  }).join('\n\n');
}

// ── 字幕アップロード（captions.insert）─────────────────────────────────
export async function uploadCaptions(
  token: string,
  videoId: string,
  srtContent: string,
  lang = 'ja'
): Promise<void> {
  if (!srtContent.trim()) return;
  const metadata = { snippet: { videoId, language: lang, name: '自動生成字幕', isDraft: false } };
  const form = new FormData();
  form.append('snippet', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([srtContent], { type: 'text/plain' }), 'captions.srt');
  const res = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) console.warn('[Captions] upload failed:', res.status, await res.text());
}

// ── コメント自動投稿（ピン留め手順）─────────────────────────────────────
// 注意: YouTube APIにピン留め機能はない（Studio UIのみ）
// → 投稿直後の最初のコメントとして表示される（実質的に上位に来る）
export async function postEngagementComment(
  token: string,
  videoId: string,
  category: string
): Promise<void> {
  // カテゴリ別の整合性のあるCTAコメント（実在サービスのみ）
  const commentMap: Record<string, string> = {
    cheese:  '🧀 AIがガクチカを0分で生成！無料LINE登録↓\nhttps://cheese.asoventure.jp/api/line-redirect?ref=yt_cheese\n\n👍 いいね & 🔔 チャンネル登録で就活tips毎日！',
    job:     '💼 転職・就活の悩みはAIキャリアコーチへ（無料）↓\nhttps://cheese.asoventure.jp/api/line-redirect?ref=yt_job\n\n👍 & 🔔 チャンネル登録で面接tips毎日！',
    health:  '💪 体調管理×キャリアUP！無料相談↓\nhttps://cheese.asoventure.jp?utm_source=youtube&utm_medium=comment&utm_campaign=health\n\n👍 & 🔔 チャンネル登録で健康tips毎日！',
    finance: '💰 年収UPは転職×キャリア戦略！無料相談↓\nhttps://cheese.asoventure.jp?utm_source=youtube&utm_medium=comment&utm_campaign=finance\n\n👍 & 🔔 チャンネル登録でお金tips毎日！',
    default: '🔔 チャンネル登録で毎日役立つtips！\n\n👍 いいね & 💬 コメントで感想を教えてね！',
  };
  const commentText = commentMap[category] ?? commentMap.default;

  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          videoId,
          topLevelComment: { snippet: { textOriginal: commentText } },
        },
      }),
    }
  );
  if (!res.ok) console.warn('[Comment] post failed:', res.status, await res.text());
}

// ── 再生リスト自動追加 ────────────────────────────────────────────────
// 各カテゴリのプレイリストIDはVercel環境変数で管理
// YOUTUBE_PLAYLIST_CHEESE / _JOB / _HEALTH / _FINANCE / _EDUCATION / _LIFE / _JAPAN
export async function addToPlaylist(
  token: string,
  videoId: string,
  category: string
): Promise<void> {
  const envKey = `YOUTUBE_PLAYLIST_${category.toUpperCase()}`;
  const playlistId = process.env[envKey];
  if (!playlistId) {
    console.warn(`[Playlist] No playlist ID for category: ${category} (env: ${envKey})`);
    return;
  }
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } },
      }),
    }
  );
  if (!res.ok) console.warn(`[Playlist] add failed for ${category}:`, res.status);
}

// ─── 最適投稿時刻計算（予約投稿）────────────────────────────────────────
// 【2026-05-11 修正】YouTube Shorts は 07:00/19:00 JST が最高エンゲージメント
// Cron がいつ実行されても、次の最適時刻に予約投稿する
// ⚠️ YouTube API 仕様: publishAt 使用時は privacyStatus:'private' が必須
function getNextOptimalPublishTime(): string {
  const nowUTC = Date.now();

  // JST の今日 00:00 を UTC ミリ秒で計算（+9h して日付を揃え、-9h で UTC に戻す）
  const nowJSTDate = new Date(nowUTC + 9 * 60 * 60 * 1000);
  const jstMidnight = Date.UTC(
    nowJSTDate.getUTCFullYear(),
    nowJSTDate.getUTCMonth(),
    nowJSTDate.getUTCDate()
  ) - 9 * 60 * 60 * 1000; // JST 00:00 の UTC ミリ秒

  // 7:00 / 19:00 JST を UTC ミリ秒で表現
  const today7am  = jstMidnight + 7  * 3600 * 1000;
  const today7pm  = jstMidnight + 19 * 3600 * 1000;
  const tomorrow7am = jstMidnight + 31 * 3600 * 1000; // 翌日 7:00 JST

  // 現在より15分以上先の最初の最適時刻を選ぶ
  const minPublishAt = nowUTC + 15 * 60 * 1000;
  let target = tomorrow7am;
  if (today7am  > minPublishAt) target = today7am;
  else if (today7pm > minPublishAt) target = today7pm;

  return new Date(target).toISOString();
}
export async function uploadToYouTube(
  token: string,
  videoBuffer: Buffer,
  title: string,
  topic: string,
  description: string,
  cta: CtaConfig
): Promise<string> {
  const metadata = {
    snippet: {
      title: `${title} #Shorts`.slice(0, 100),
      description: buildDescription(topic, description, cta),
      tags: [...cta.tags, 'Shorts', 'アソベンチャー'],
      categoryId: cta.ytCategoryId,
      defaultLanguage: 'ja',
    },
    status: {
      // 【2026-05-11 修正】publishAt 使用時は YouTube API 仕様で 'private' が必須
      // 予約時刻になると自動で公開される。'public' + publishAt の組み合わせは 400 エラー
      privacyStatus: 'private',
      selfDeclaredMadeForKids: false,
      publishAt: getNextOptimalPublishTime(),
    },
  };
  const form = new FormData();
  form.append('snippet', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('video', new Blob([new Uint8Array(videoBuffer)], { type: 'video/mp4' }), 'shorts.mp4');
  const res = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) throw new Error(`YouTube upload failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { id: string };
  return `https://www.youtube.com/watch?v=${data.id}`;
}

export async function postToBuffer(topic: string, youtubeUrl: string, category: string): Promise<boolean> {
  const token = process.env.BUFFER_ACCESS_TOKEN || '';
  const channelId = process.env.BUFFER_CHANNEL_ID || '69e04b4f031bfa423c0b5e18';
  if (!token) return false;
  const ctaLine = ['cheese', 'job'].includes(category)
    ? '🧀 Cheese無料登録: https://lin.ee/8VAVNEk'
    : '📺 チャンネル登録: https://www.youtube.com/@asoventure_project';
  const text = [`🎬 ${topic}`, '', '▶️ YouTube Shorts:', youtubeUrl, '', ctaLine, '', `#Shorts #${category}`].join('\n').slice(0, 280);
  const res = await fetch('https://api.buffer.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      query: `mutation { createPost(input: { text: ${JSON.stringify(text)}, channelId: "${channelId}", schedulingType: automatic, mode: addToQueue }) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`,
    }),
  });
  const json = await res.json() as { errors?: unknown; data?: { createPost?: { message?: string } } };
  return !json.errors && !json.data?.createPost?.message;
}


// TikTok/Reels/Instagram multi-channel Buffer posting
// Enable by setting BUFFER_INSTAGRAM_CHANNEL_ID and BUFFER_TIKTOK_CHANNEL_ID in Vercel env
export async function postToBufferMultiChannel(
  topic: string,
  youtubeUrl: string,
  category: string
): Promise<{ x: boolean; instagram: boolean; tiktok: boolean }> {
  const token = process.env.BUFFER_ACCESS_TOKEN || '';
  if (!token) return { x: false, instagram: false, tiktok: false };
  const xChannelId = process.env.BUFFER_CHANNEL_ID || '69e04b4f031bfa423c0b5e18';
  const igChannelId = process.env.BUFFER_INSTAGRAM_CHANNEL_ID || '';
  const ttChannelId = process.env.BUFFER_TIKTOK_CHANNEL_ID || '';
  const isCheese = ['cheese', 'job'].includes(category);
  const ctaLine = isCheese
    ? 'Cheese LINE: https://lin.ee/8VAVNEk'
    : 'YouTube: https://www.youtube.com/@asoventure_project';
  const textX = ['[Shorts] ' + topic, '', 'YouTube Shorts: ' + youtubeUrl, '', ctaLine, '', '#Shorts #' + category].join('\n').slice(0, 280);
  const textIG = ['[Shorts] ' + topic, '', ctaLine, '', '#Shorts #' + category + ' #reels #asoventure'].join('\n').slice(0, 2200);
  const gql = (chId: string, txt: string) =>
    '{ "query": "mutation { createPost(input: { text: ' + JSON.stringify(txt).slice(1,-1) + ', channelId: \\"' + chId + '\\", schedulingType: automatic, mode: addToQueue }) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }" }';
  async function bufferPost(chId: string, txt: string): Promise<boolean> {
    if (!chId) return false;
    try {
      const r = await fetch('https://api.buffer.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: gql(chId, txt),
      });
      const j = await r.json() as { errors?: unknown; data?: { createPost?: { message?: string } } };
      return !j.errors && !j.data?.createPost?.message;
    } catch { return false; }
  }
  const [rx, rig, rtt] = await Promise.allSettled([
    bufferPost(xChannelId, textX),
    bufferPost(igChannelId, textIG),
    bufferPost(ttChannelId, textX),
  ]);
  return {
    x: rx.status === 'fulfilled' ? rx.value : false,
    instagram: rig.status === 'fulfilled' ? rig.value : false,
    tiktok: rtt.status === 'fulfilled' ? rtt.value : false,
  };
}

export async function postArticleToBuffer(xPostText: string): Promise<boolean> {
  const token = process.env.BUFFER_ACCESS_TOKEN || '';
  const channelId = process.env.BUFFER_CHANNEL_ID || '69e04b4f031bfa423c0b5e18';
  if (!token) { console.warn('[Buffer] BUFFER_ACCESS_TOKEN未設定'); return false; }
  const res = await fetch('https://api.buffer.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      query: `mutation { createPost(input: { text: ${JSON.stringify(xPostText)}, channelId: "${channelId}", schedulingType: automatic, mode: addToQueue }) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`,
    }),
  });
  const json = await res.json() as { errors?: unknown; data?: { createPost?: { message?: string; post?: { id: string } } } };
  const ok = !json.errors && !json.data?.createPost?.message;
  if (!ok) {
    console.warn('[Buffer] 投稿失敗:', JSON.stringify(json).slice(0, 300));
  } else {
    console.log('[Buffer] 投稿成功:', json.data?.createPost?.post?.id);
  }
  return ok;
}
