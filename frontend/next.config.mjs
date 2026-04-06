/** @type {import('next').NextConfig} */

// Static export only when building for GitHub Pages
const isGHPages = !!process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig = {
  ...(isGHPages
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : {}),
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1",
  },
};

export default nextConfig;
