import type { NextConfig } from "next";

// Only apply base path when explicitly building for GitHub Pages deployment
const isGitHubPagesDeployment = process.env.GITHUB_PAGES_DEPLOYMENT === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPagesDeployment ? "/search" : "",
  assetPrefix: isGitHubPagesDeployment ? "/search" : "",
  trailingSlash: isGitHubPagesDeployment,
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
