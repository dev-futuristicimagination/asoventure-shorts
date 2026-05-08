// lib/processed-urls.ts — 処理済み記事URL記録（GitHub上に保存）
// 目的: article-pipeline が「新しい記事のみ」を処理するための重複防止機構
// 保存場所: content/processed-articles.json (GitHubリポジトリ)

import { ghGet, ghPut } from './github';

const PROCESSED_PATH = 'content/processed-articles.json';
const MAX_KEEP = 200; // 最大保持URL数（古い順に削除）

interface ProcessedRecord {
  url: string;
  category: string;
  videoUrl: string;
  processedAt: string;
}

interface ProcessedStore {
  records: ProcessedRecord[];
  lastUpdated: string;
}

// 処理済みURLリストを取得
export async function loadProcessedUrls(): Promise<ProcessedStore> {
  try {
    const file = await ghGet(PROCESSED_PATH);
    if (!file) return { records: [], lastUpdated: '' };
    return JSON.parse(file.content) as ProcessedStore;
  } catch {
    return { records: [], lastUpdated: '' };
  }
}

// URLが処理済みか確認
export async function isAlreadyProcessed(url: string): Promise<boolean> {
  const store = await loadProcessedUrls();
  return store.records.some(r => r.url === url);
}

// 処理済みURLを記録
export async function markAsProcessed(
  url: string,
  category: string,
  videoUrl: string
): Promise<void> {
  const file = await ghGet(PROCESSED_PATH);
  let store: ProcessedStore;
  try {
    store = file ? JSON.parse(file.content) as ProcessedStore : { records: [], lastUpdated: '' };
  } catch {
    store = { records: [], lastUpdated: '' };
  }

  // 既存の同URLがあれば上書き、なければ追加
  store.records = store.records.filter(r => r.url !== url);
  store.records.push({
    url,
    category,
    videoUrl,
    processedAt: new Date().toISOString(),
  });

  // 最大保持数を超えた場合、古いものから削除
  if (store.records.length > MAX_KEEP) {
    store.records = store.records.slice(-MAX_KEEP);
  }

  store.lastUpdated = new Date().toISOString();

  await ghPut(PROCESSED_PATH, JSON.stringify(store, null, 2), file?.sha);
  console.log(`[ProcessedUrls] 記録: ${url} → ${videoUrl}`);
}

// カテゴリ別の処理済みURL一覧
export async function getProcessedByCategory(category: string): Promise<ProcessedRecord[]> {
  const store = await loadProcessedUrls();
  return store.records.filter(r => r.category === category);
}
