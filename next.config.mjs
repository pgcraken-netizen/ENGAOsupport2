/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14.x: @line/bot-sdk は ESM のため外部パッケージとして扱う
  experimental: {
    serverComponentsExternalPackages: ['@line/bot-sdk'],
  },

  // Vercel デプロイ向け: 不要な警告を抑制
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
