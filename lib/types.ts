// lib/types.ts — 型定義

export interface ShortItem {
  topic: string;
  title: string;
  narration: string;
  videoPrompt: string;
  useVeo3?: boolean;  // false=Canvas(¥0)、true=Veo3(¥420)、未指定=カテゴリデフォルト
}

// Canvas（テキスト+背景+BGM）用アイテム型
export interface CanvasItem {
  topic: string;
  title: string;
  narration: string;      // TTS読み上げ内容
  points: string[];       // 画面に表示する箇条書き（3〜5件・各20文字以内）
  siteUrl: string;        // 表示用短縮URL (例: health.asoventure.jp)
  fullUrl: string;        // X投稿用フルURL
  ctaText: string;        // CTA文言 (例: "詳しくはこちら")
  lang?: 'ja' | 'en';
  bgImageUrl?: string;    // 記事OGP画像URL（背景に使用）
  hookTitle?: string;     // 疑問文フック（スライド1専用・Gemini生成）
}

export interface PendingData {
  category: string;
  topic: string;
  title: string;
  titleB?: string;       // 【2026-05-10追加】A/Bテスト用B案タイトル
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