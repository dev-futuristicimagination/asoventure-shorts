// lib/github.ts — GitHub pending.json 管理（asoventure-shorts リポジトリ自体に保存）
import type { PendingData } from './types';

const GH_OWNER = 'dev-futuristicimagination';
const GH_REPO  = 'asoventure-shorts';
const GH_BRANCH = 'main';

function getToken() {
  return process.env.SHORTS_GITHUB_TOKEN || process.env.JOB_GITHUB_TOKEN || '';
}

export async function ghGet(path: string): Promise<{ content: string; sha: string } | null> {
  const token = getToken();
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) return null;
  const data = await res.json() as { content: string; sha: string };
  return { content: Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8'), sha: data.sha };
}

export async function ghPut(path: string, content: string, sha?: string): Promise<void> {
  const token = getToken();
  await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[bot] shorts: update ${path}`,
        content: Buffer.from(content, 'utf8').toString('base64'),
        branch: GH_BRANCH,
        ...(sha ? { sha } : {}),
      }),
    }
  );
}

export async function savePending(category: string, data: PendingData): Promise<void> {
  const path = `content/${category}-pending.json`;
  const existing = await ghGet(path);
  await ghPut(path, JSON.stringify(data, null, 2), existing?.sha);
}

export async function loadPending(category: string): Promise<PendingData | null> {
  const path = `content/${category}-pending.json`;
  const file = await ghGet(path);
  if (!file) return null;
  try { return JSON.parse(file.content) as PendingData; } catch { return null; }
}

export async function clearPending(category: string): Promise<void> {
  const path = `content/${category}-pending.json`;
  const existing = await ghGet(path);
  if (existing) await ghPut(path, '{}', existing.sha);
}
