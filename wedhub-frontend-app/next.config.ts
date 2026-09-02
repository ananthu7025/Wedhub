import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        // Placeholder imagery only, matching the approved mockup's use of
        // Unsplash — kept for any screen that still needs filler content
        // beyond real vendor media.
      },
      {
        protocol: "https",
        hostname: "pub-7116e74b9a3d44a1ab03594911f56ad8.r2.dev",
        // Real R2 public media bucket — see wedhub-backend/.env's
        // R2_PUBLIC_BASE_URL and lib/media/url.ts's getPublicMediaUrl().
      },
    ],
  },
};

export default nextConfig;
