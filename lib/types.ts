// lib/types.ts — 共有型定義

export interface ShortItem {
  topic: string;
  title: string;
  narration: string;
  videoPrompt: string;
}

export interface PendingData {
  category: string;
  topic: string;
  title: string;
  narration: string;
  youtubeDescription: string;
  videoPrompt: string;
  operationName: string;
  createdAt: string;
}

export interface CtaConfig {
  block: string[];
  tags: string[];
  ytCategoryId: string;
}
