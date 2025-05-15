import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Exclude discovery-split directory from build
  webpack: (config) => {
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /discovery-split/,
    });
    return config;
  },
};

export default nextConfig;
