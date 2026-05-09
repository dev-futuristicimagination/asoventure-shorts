import type { NextConfig } from "next";

const nextConfig = {
  // eslint.ignoreDuringBuilds は Next.js 16 の NextConfig 型に含まれないため
  // as unknown as NextConfig でキャストして型エラーを回避
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // ffmpeg-static のバイナリファイルを Next.js バンドルから除外する
  // バンドル後 /var/task/.next/server/chunks/ffmpeg に移動
  // 存在しないと ENOENT になる (Vercel serverless 環境)
  serverExternalPackages: ['ffmpeg-static', '@resvg/resvg-wasm', 'sharp'],

  // Vercel serverless: ffmpeg バイナリと関連アセットをbundleに明示的に含める
  // これがないと /var/task/node_modules/ffmpeg-static/ffmpeg が ENOENT になる
  // また /var/task/public/fonts/ や /var/task/public/audio/bgm/ も含める
  outputFileTracingIncludes: {
    '/api/**': [
      './node_modules/ffmpeg-static/**',
      './node_modules/@resvg/resvg-wasm/**',
      './public/fonts/**',
      './public/audio/bgm/**',
      './public/images/bg/**',
    ],
  },
} as NextConfig;

export default nextConfig;