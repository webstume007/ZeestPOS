import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Fix for PGlite instantiateWasm error on Vercel
    config.resolve.alias = {
      ...config.resolve.alias,
      // Optional: Prevent pg-native from throwing missing module errors
      "pg-native": false,
    };
    
    // Treat WASM files as static assets so PGlite can fetch them correctly
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    
    return config;
  },
};

export default nextConfig;
