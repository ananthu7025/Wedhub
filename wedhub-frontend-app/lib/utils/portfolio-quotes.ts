/**
 * Decorative caption pool for the portfolio grid's non-photo "quote tile"
 * (see VendorPortfolioTabs.tsx) — platform-authored design flourish, never
 * presented as something a specific vendor wrote. Keyed by category name so
 * a photographer's grid reads differently from a caterer's, but every
 * string here is generic marketing copy, not vendor-specific content pulled
 * from any database field — the one genuinely vendor-specific piece of text
 * already shown elsewhere on the page is profile.shortDescription (the
 * hero tagline), which this deliberately does not duplicate or reword.
 *
 * pickPortfolioQuote is deterministic per vendor (seeded by vendorId), not
 * re-randomized on every render/reload — avoids a jarring flash of
 * different text on navigation and (more importantly) a server/client
 * hydration mismatch, since this page is server-rendered.
 */
const CATEGORY_QUOTES: Record<string, string[]> = {
  "Photography & Videography": [
    "Moments that last forever",
    "Every frame tells your story",
    "Captured with love, kept forever",
    "Where memories become timeless",
  ],
  Venues: [
    "Where your story begins",
    "A setting made for celebration",
    "Every corner, a memory waiting to happen",
  ],
  "Makeup Artists": [
    "Bringing out your natural glow",
    "Beauty that lasts every moment",
    "Radiance, crafted for your big day",
  ],
  "Mehendi Artists": [
    "Tradition drawn with love",
    "Patterns that celebrate you",
  ],
  Decorators: [
    "Every detail, beautifully arranged",
    "Turning venues into dreams",
    "Where design meets celebration",
  ],
  Caterers: [
    "Flavors worth celebrating",
    "A feast for every memory",
  ],
  "Bridal Wear": [
    "Elegance woven for your day",
    "Timeless style, made for you",
  ],
  "Groom Wear": [
    "Sharp style for your big day",
    "Tailored for the moment",
  ],
  Jewellery: [
    "Heirlooms in the making",
    "Sparkle that tells a story",
  ],
  "Cakes & Desserts": [
    "Sweetness, beautifully crafted",
    "A taste of celebration",
  ],
  "Artists & DJs": [
    "Setting the rhythm for your night",
    "Music that keeps the celebration alive",
  ],
  "Cocktail & Bar Services": [
    "Cheers to your celebration",
    "Crafted drinks, crafted memories",
  ],
  "Wedding Cars & Luxury Rentals": [
    "Arriving in style",
    "Your grand entrance, perfected",
  ],
  "Event Planners": [
    "Every detail, thoughtfully planned",
    "Turning vision into celebration",
  ],
  "Content Creators": [
    "Your story, beautifully told",
    "Moments made shareable",
  ],
};

// Used when a vendor's category isn't in the map above (a newly
// admin-added category, or no primary category set at all) — generic
// enough to read naturally for any wedding vendor.
const FALLBACK_QUOTES = [
  "Moments that last forever",
  "Celebrating every detail",
  "Crafted with care, made for you",
];

// Small deterministic string hash (djb2) — good enough for picking an index
// out of a short array, not used for anything security-sensitive.
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function pickPortfolioQuote(vendorId: string, categoryName: string | undefined): string {
  const pool = (categoryName && CATEGORY_QUOTES[categoryName]) || FALLBACK_QUOTES;
  const index = hashString(vendorId) % pool.length;
  return pool[index] as string;
}
