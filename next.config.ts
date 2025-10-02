import type { NextConfig } from "next";

// Only apply base path when explicitly building for GitHub Pages deployment
const isGitHubPagesDeployment = process.env.GITHUB_PAGES_DEPLOYMENT === "true";
console.log(
  `[next.config.js] DEBUG: process.env.GITHUB_PAGES_DEPLOYMENT = '${process.env.GITHUB_PAGES_DEPLOYMENT}'`
);
console.log(
  `[next.config.js] DEBUG: isGitHubPagesDeployment = ${isGitHubPagesDeployment}`
);
console.log(
  `[next.config.js] DEBUG: Calculated assetPrefix = '${
    isGitHubPagesDeployment ? "/search" : ""
  }'`
);

const nextConfig: NextConfig = {
  // Keep static export for build-time compilation
  output:
    process.env.NEXT_STATIC_EXPORT || isGitHubPagesDeployment
      ? "export"
      : undefined,
  basePath: isGitHubPagesDeployment ? "/search" : "",
  assetPrefix: isGitHubPagesDeployment ? "/search" : "",
  trailingSlash: false,
  reactStrictMode: true, // Enable like next-atlas

  // Enable compression for static files
  compress: true,

  // Enable font optimization and package imports optimization
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
    // Enable modern bundling optimizations
    optimizeCss: true,
    // Enable tree shaking for better dead code elimination
    esmExternals: true,
    // Enable modern bundling features
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add rewrites for development to handle /search prefix
  async rewrites() {
    if (isGitHubPagesDeployment) return [];
    return [
      {
        source: "/search/:path*",
        destination: "/:path*",
      },
    ];
  },
  images: {
    unoptimized:
      process.env.NEXT_STATIC_EXPORT || isGitHubPagesDeployment ? true : false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ac.uk",
      },
      {
        protocol: "http",
        hostname: "**.ac.uk",
      },
      {
        protocol: "https",
        hostname: "**.edu",
      },
      {
        protocol: "https",
        hostname: "**.org",
      },
      {
        protocol: "https",
        hostname: "**.gov",
      },
      {
        protocol: "https",
        hostname: "**.org.uk",
      },
      {
        protocol: "https",
        hostname: "**.nhs.uk",
      },
      {
        protocol: "https",
        hostname: "cataloguementalhealth.ac.uk",
      },
      {
        protocol: "https",
        hostname: "www.cataloguementalhealth.ac.uk",
      },
    ],
    // Allow data URLs for client-side rendering fallbacks
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Skip server-side routes during static export
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Webpack optimizations like next-atlas
  webpack: (config, { dev, isServer }) => {
    // Use more stable chunk names to reduce build-to-build changes
    if (!dev && !isServer) {
      config.output.chunkFilename = "static/js/[name].[contenthash:8].js";
      config.output.filename = "static/js/[name].[contenthash:8].js";
    }

    // Optimize bundle splitting for better caching
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Separate vendor chunks for better caching
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 10,
            enforce: true,
          },
          // Separate MUI components
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: "mui",
            chunks: "all",
            priority: 20,
            enforce: true,
          },
          // Separate Recharts (only used in explore page)
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: "recharts",
            chunks: "async", // Only load when needed
            priority: 30,
            enforce: true,
          },
          // Separate React and React-DOM
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: "react",
            chunks: "all",
            priority: 25,
            enforce: true,
          },
          // Common chunks
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 5,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }

    // Remove console.log statements in production builds (client-side only)
    if (!dev && !isServer) {
      // Configure terser to remove console.log, console.debug, console.info
      if (config.optimization && config.optimization.minimizer) {
        config.optimization.minimizer.forEach((minimizer: any) => {
          if (minimizer.constructor.name === "TerserPlugin") {
            minimizer.options.terserOptions = {
              ...minimizer.options.terserOptions,
              compress: {
                ...minimizer.options.terserOptions?.compress,
                drop_console: true, // Remove all console.* calls
                drop_debugger: true, // Remove debugger statements
                // Additional optimizations
                pure_funcs: ["console.log", "console.info", "console.debug"],
                passes: 2, // Multiple passes for better optimization
              },
              mangle: {
                // Better variable name mangling
                keep_fnames: false,
              },
            };
          }
        });
      }
    }

    // Exclude discovery-split directory from build
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /discovery-split/,
    });

    // Module resolution is handled by Next.js optimizePackageImports

    // Add performance hints
    if (!dev && !isServer) {
      config.performance = {
        hints: "warning",
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
      };
    }

    return config;
  },
};

export default nextConfig;
