/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize build for Vercel deployment
  experimental: {
    // Reduce bundle size
    optimizePackageImports: ['react', 'react-dom'],
  },
  
  // Bundle analyzer for size optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize better-sqlite3 for serverless
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    
    // External better-sqlite3 for Vercel
    if (isServer) {
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3'
      });
    }
    
    // Tree shake unused imports
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };
    
    return config;
  },
  
  // Output standalone for better Vercel optimization - THIS IS KEY FOR VERCEL
  output: 'standalone',
  
  // Compress images and other assets
  compress: true,
  
  // Reduce bundle size by excluding source maps in production
  productionBrowserSourceMaps: false,
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Enable SWC minification for smaller bundles
  swcMinify: true,
  
  // Exclude large directories from build
  distDir: '.next',
  
  // Optimize images
  images: {
    unoptimized: true // For static export compatibility
  }
}