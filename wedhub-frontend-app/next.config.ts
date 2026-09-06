import type { NextConfig } from "next";

// Arch Phase 19 Stage A (Security Hardening) — this is the app that
// actually renders HTML to real browsers (the backend is API-only and
// never serves a page), so this is where CSP/clickjacking/MIME-sniffing
// headers have real value. Third-party origins allowed below were
// verified against actual usage in this codebase, not guessed:
//   - https://checkout.razorpay.com — Razorpay's Checkout.js, loaded via
//     <Script src="https://checkout.razorpay.com/v1/checkout.js"> in
//     CheckoutButton.tsx (vendor subscription) and
//     PublishCheckoutButton.tsx (₹49 wedding website publish). Razorpay's
//     documented checkout flow also opens an iframe from
//     checkout.razorpay.com and calls out to api.razorpay.com and
//     lumberjack.razorpay.com (checkout analytics/telemetry beacons).
//   - images.unsplash.com — placeholder imagery, still referenced (e.g.
//     app/(auth)/login/page.tsx) and already an allowed images.remotePatterns
//     origin below.
//   - pub-7116e74b9a3d44a1ab03594911f56ad8.r2.dev — the real R2 public
//     media bucket, same origin already allowed in images.remotePatterns.
//   - accounts.google.com — Google Identity Services (GIS), loaded via
//     <script src="https://accounts.google.com/gsi/client"> for the
//     "Sign in with Google" button (GoogleSignInButton.tsx). GIS renders
//     its button/One Tap UI in an iframe from accounts.google.com and
//     posts the ID token back via postMessage — no redirect navigation,
//     so no frame-ancestors/navigation exception is needed for it.
//   - *.r2.cloudflarestorage.com — media uploads (vendor logo/cover,
//     portfolio photos, category images, gallery inspiration, etc.) go
//     straight from the browser to a presigned R2 PutObject URL
//     (wedhub-backend/src/integrations/storage/r2.client.ts's endpoint is
//     `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`) — never
//     proxied through the API — so connect-src must allow it or every
//     upload fails with a CSP-blocked fetch. Wildcarded because the
//     account-id subdomain differs per R2 account/environment.
// Google Fonts is NOT referenced here on purpose: the one font in use
// (Plus_Jakarta_Sans, app/layout.tsx) goes through next/font/google, which
// downloads and self-hosts the font file at build time — the browser never
// makes a runtime request to fonts.googleapis.com/fonts.gstatic.com, so
// the CSP doesn't need to allow those hosts.
//
// No nonce/strict-dynamic here: this app relies on static optimization
// for most public pages, and nonce-based CSP forces dynamic rendering on
// every page (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
// 'unsafe-inline' on script-src/style-src is the pragmatic tradeoff Next.js's
// own docs use for the no-nonce case — Next.js/React and Tailwind's
// generated styles rely on inline styles, and this keeps the policy from
// breaking the build. This CSP is enforced (not Report-Only): verified by
// `next build` + starting the app + curling real pages (home, search,
// vendor profile, subscription) for the header and by static/manual
// review of every external origin this app's code actually loads — see
// docs/11-progress-log.md for what was and wasn't verified live in a
// real browser (no headless-browser console-error check was available in
// this environment).
const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://accounts.google.com/gsi/client"
    : "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://accounts.google.com/gsi/client",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://images.unsplash.com https://pub-7116e74b9a3d44a1ab03594911f56ad8.r2.dev",
  "font-src 'self' data:",
  "connect-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://lumberjack.razorpay.com https://accounts.google.com https://*.r2.cloudflarestorage.com",
  "frame-src https://checkout.razorpay.com https://api.razorpay.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

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
  async headers() {
    return [
      {
        // Applies to every route this app serves — there is no page in
        // this marketplace that is meant to be iframed by another site
        // (verified: no iframe/frame-ancestors usage anywhere in this
        // codebase), so X-Frame-Options: DENY / frame-ancestors 'none' is
        // safe for all of it.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // Conservative default — grepped the codebase for camera/
            // microphone/geolocation usage and found none, so all three
            // (plus the newer browsing-topics signal) are disabled.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
        ],
      },
    ];
  },
};

export default nextConfig;
