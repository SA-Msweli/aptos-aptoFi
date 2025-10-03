/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output configuration for static deployment
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },

  // Asset prefix for CDN deployment (optional)
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/aptofi' : '',

  // Note: Custom headers don't work with static export
  // Headers will be configured in Firebase hosting instead

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fallbacks for browser compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Add build ID to environment
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.BUILD_ID': JSON.stringify(buildId),
      })
    );

    return config;
  },

  // Environment variables to expose to the client
  env: {
    BUILD_TIMESTAMP: new Date().toISOString(),
  },

  // Experimental features
  experimental: {
    // Disable CSS optimization for now due to critters dependency issue
    // optimizeCss: true,
  }
}

export default nextConfig;