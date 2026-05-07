// lib/youtube.ts — YouTube OAuth + Upload 共有モジュール
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
      description: [topic, '', description, '', ...cta.block].join('\n'),
      tags: cta.tags,
      categoryId: cta.ytCategoryId,
      defaultLanguage: 'ja',
    },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
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
