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

  // Vercel serverless: ffmpeg バイナリと公開アセットをbundleに明示的に含める
  // これがないと /var/task/node_modules/ffmpeg-static/ffmpeg が ENOENT になる
  // また /var/task/public/fonts/ や /var/task/public/audio/bgm/ も含める
  outputFileTracingIncludes: {
    '/api/**': [
      './node_modules/ffmpeg-static/**',
      './public/fonts/**',
      './public/audio/bgm/**',
      './public/images/bg/**',
    ],
  },
};

export default nextConfig;
