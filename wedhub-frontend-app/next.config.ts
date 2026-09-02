import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        // Placeholder imagery only, matching the approved mockup's use of
        // Unsplash — replace with the real CDN/R2 hostname once vendor media
        // is wired up in Frontend Arch Phase 5 (see frontenddocs/05-stage-vendor-experience.md).
      },
    ],
  },
};

export default nextConfig;
