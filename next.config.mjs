/** @type {import('next').NextConfig} */
const nextConfig = {
  // @line/bot-sdk は ESM のため外部パッケージとして扱う
  serverExternalPackages: ['@line/bot-sdk'],

  // Vercel デプロイ向け
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
