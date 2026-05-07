import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint設定の依存解決エラーを回避。型チェック(tsc)は引き続き実行される。
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
