import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint設定の依存解決エラーを回避。型チェック(tsc)は引き続き実行される。
    ignoreDuringBuilds: true,
  },
  // ffmpeg-static はバイナリファイルのため Next.js バンドルから除外する
  // バンドルすると /var/task/.next/server/chunks/ffmpeg に移動されて
  // 実行権限が失われ ENOENT になる (Vercel serverless 環境)
  serverExternalPackages: ['ffmpeg-static'],
};

export default nextConfig;
