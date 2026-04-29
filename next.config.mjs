/** @type {import('next').NextConfig} */
const nextConfig = {
  // @line/bot-sdk, @line/liff は ESM のため外部パッケージとして扱う
  experimental: {
    serverComponentsExternalPackages: ['@line/bot-sdk'],
  },

  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
