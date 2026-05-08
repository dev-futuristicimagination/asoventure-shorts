// lib/types.ts — 共有型定義

export interface ShortItem {
  topic: string;
  title: string;
  narration: string;
  videoPrompt: string;
  useVeo3?: boolean;  // false=Canvas(¥0)、true=Veo3(¥420)、未指定=カテゴリデフォルト
}

// Canvas動画（テキスト＋背景＋BGM）用アイテム型
export interface CanvasItem {
  topic: string;
  title: string;
  narration: string;      // TTS読み上げ原稿
  points: string[];       // 画面に表示する箇条書き（3〜5個・各20文字以内推奨）
  siteUrl: string;        // 動画内表示用短縮URL (例: health.asoventure.jp)
  fullUrl: string;        // 説明欄・X投稿用フルURL
  ctaText: string;        // CTA文言 (例: "詳しくは↓")
  lang?: 'ja' | 'en';
  bgImageUrl?: string;    // 記事OGP画像URL（背景に使用）
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
