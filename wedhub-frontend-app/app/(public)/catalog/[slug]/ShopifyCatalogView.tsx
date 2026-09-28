"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CloseIcon } from "@/components/portfolio/icons";
import type { VendorDetail } from "@/lib/api/vendors.types";
import type {
  CatalogCollectionWithItems,
  CatalogItem,
  CatalogItemVariant,
  CatalogStoreSettings,
} from "@/lib/api/vendor-catalog.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { themeForCatalog } from "./catalog-theme";
import { formatCatalogPrice, getCatalogCalculatedPrice, getCatalogItemBasePrice, type RentalDuration } from "./catalog-pricing";
import { useCatalogCart } from "./useCatalogCart";

// --- Shopify-Style Scroll & Text Reveal Wrapper ---
function ScrollReveal({
  children,
  className = "",
  delay = 0,
  variant = "fade-up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "fade-up" | "text-reveal" | "fade";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: delay ? `${delay}ms` : undefined,
      }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
        isRevealed
          ? "opacity-100 translate-y-0"
          : variant === "text-reveal"
          ? "opacity-0 translate-y-4"
          : "opacity-0 translate-y-3.5"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// --- Clean SVG Icon Definitions (No System Icons / Emojis) ---

function SparklesSvg({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function MapPinSvg({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function CalendarSvg({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function PhoneSvg({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function WhatsAppSvg({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
    </svg>
  );
}

function SearchSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function HeartSvg({ className = "w-4 h-4", filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function BagSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25c-.669 0-1.189-.578-1.119-1.243l1.263-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function ShieldCheckSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function SanitizedSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  );
}

function SupportSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3.568-3.155a30.016 30.016 0 01-6.182 0L5.432 20.25v-3.091c-.34-.02-.68-.045-1.02-.072-1.133-.094-1.98-1.057-1.98-2.193v-4.286c0-.97.616-1.813 1.5-2.097a17.58 17.58 0 0116.318 0z" />
    </svg>
  );
}

function ChevronLeftSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ArrowRightSvg({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function InstagramSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// Fixed icon per trust-badge position — only the title/subtitle text is
// vendor-editable (see CatalogStoreSettings.trustBadges), matching the
// project's convention elsewhere of closed icon/preset sets rather than
// free-form icon choice.
const TRUST_BADGE_ICONS = [SanitizedSvg, CalendarSvg, WhatsAppSvg, ShieldCheckSvg];

function CheckSvg({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export function ShopifyCatalogView({
  vendor,
  initialItems,
  storeSettings,
  collections,
}: {
  vendor: VendorDetail;
  initialItems: CatalogItem[];
  storeSettings?: CatalogStoreSettings | null;
  collections: CatalogCollectionWithItems[];
}) {
  const [items] = useState<CatalogItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | "ALL">("ALL");

  // Vendor-saved storefront settings, persisted server-side via /catalog/me/settings
  const customConfig = storeSettings ?? null;
  const theme = themeForCatalog(storeSettings?.accentColor ?? "CRIMSON");

  // Vendor-authored footer links split across the two footer columns —
  // one ordered list rather than two fixed 5-link columns, so the vendor
  // controls count/order/labels/urls entirely.
  const footerLinks = customConfig?.footerLinks ?? [];
  const footerLinksFirstHalf = footerLinks.slice(0, Math.ceil(footerLinks.length / 2));
  const footerLinksSecondHalf = footerLinks.slice(Math.ceil(footerLinks.length / 2));

  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [lastWishlistedId, setLastWishlistedId] = useState<string | null>(null);

  // Cart state — shared with the standalone product page via sessionStorage
  // (see useCatalogCart's own header comment) so adding an item on a
  // product-detail page and navigating back to this grid doesn't lose it.
  const { cart, addToCart, updateQuantity, cartItemCount, cartSubtotal } = useCatalogCart(vendor.id);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [recentlyAddedItem, setRecentlyAddedItem] = useState<string | null>(null);
  const [animateCartBadge, setAnimateCartBadge] = useState(false);

  // WhatsApp Checkout Form inside Cart Drawer
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const vendorPhone = vendor.profile?.phone?.replace(/[^0-9]/g, "") || "919876543210";
  const formattedPhone = vendor.profile?.phone || "+91 98765 43210";
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category?.name || "Bridal Rentals";
  const cityName = vendor.city?.name || "Studio";

  // All vendor-facing marketing copy comes only from customConfig (real
  // settings, saved via the "Customize Storefront" modal) or from the
  // vendor's own profile data — never a hardcoded marketing fallback string.
  // A field that's unset simply doesn't render (see each section's guard).
  const heroPreheading = customConfig?.heroTagline || null;
  const heroTitle = customConfig?.heroHeadline || vendor.businessName;
  const heroSubtitle = customConfig?.heroSubtitle || vendor.profile?.shortDescription || null;
  const trialBtnLabel = customConfig?.trialButtonText || null;
  const shopBtnLabel = customConfig?.shopButtonText || null;
  const topAnnouncement = customConfig?.announcementText || null;

  const marqueeItems = useMemo(() => {
    if (topAnnouncement && topAnnouncement.trim()) {
      const parts = topAnnouncement
        .split(/[·|;]/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 0) return parts;
    }
    return [
      `Welcome to ${vendor.businessName} Luxury Bridal Catalog`,
      "100% Certified Authentic Suites",
      "Studio Trial & Fitting Appointments Available",
      `Secure Delivery in ${cityName}`,
    ];
  }, [topAnnouncement, vendor.businessName, cityName]);

// Vendor-curated collections (see CatalogCollectionsManager) — a vendor
  // explicitly assigns items to each one, so this is real merchandising
  // intent, not a keyword guess. A collection's sample image is its first
  // assigned item's first photo.
  const collectionSummaries = useMemo(
    () =>
      collections.map((c) => ({
        id: c.id,
        name: c.name,
        count: c.items.length,
        sampleImage: (c.items[0]?.media[0]?.url || c.items[0]?.media[0]?.thumbnailUrl) ?? undefined,
      })),
    [collections],
  );

  const formatPrice = formatCatalogPrice;
  const getItemBasePrice = getCatalogItemBasePrice;
  const getCalculatedPrice = getCatalogCalculatedPrice;

  // Curated shelf rows — stacked, titled sections (New Arrivals, Best
  // Sellers, then the vendor's single largest collection) rather than one
  // grid with tab filters, matching a reference layout the vendor asked to
  // match closely. Each row only renders if that named collection actually
  // exists (a vendor who never created a "New Arrivals"/"Best Sellers"
  // collection simply doesn't get that shelf — no fabricated content), and
  // is capped at 5 items so the homepage stays a preview, not the full
  // catalog (the collection's own "View All" link/tab still reaches every
  // item in it via the Featured Pieces section below).
  const shelfRows = useMemo(() => {
    const activeItemsByCollection = (collectionId: string) =>
      collections.find((c) => c.id === collectionId)?.items.filter((i) => i.isActive).slice(0, 5) ?? [];

    const newArrivals = collections.find((c) => c.name.toLowerCase() === "new arrivals");
    const bestSellers = collections.find((c) => c.name.toLowerCase() === "best sellers");
    // The largest remaining named collection (excluding the two cross-cutting
    // ones above) stands in for a single extra themed row, e.g. "Necklaces".
    const remaining = collections
      .filter((c) => c.id !== newArrivals?.id && c.id !== bestSellers?.id)
      .sort((a, b) => b.items.length - a.items.length);
    const spotlight = remaining[0];

    const candidates: Array<{ id: string; name: string; subheading: string; items: CatalogItem[] } | null> = [
      newArrivals ? { id: newArrivals.id, name: "New Arrivals", subheading: "Fresh designs for your special moments", items: activeItemsByCollection(newArrivals.id) } : null,
      bestSellers ? { id: bestSellers.id, name: "Best Sellers", subheading: "Our most-loved jewellery pieces", items: activeItemsByCollection(bestSellers.id) } : null,
      spotlight ? { id: spotlight.id, name: spotlight.name, subheading: "Elegant pieces for every occasion", items: activeItemsByCollection(spotlight.id) } : null,
    ];
    return candidates.filter((row): row is { id: string; name: string; subheading: string; items: CatalogItem[] } => row !== null && row.items.length > 0);
  }, [collections]);

  // Filtered items based on search and vendor-assigned collection
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.isActive) return false;
      if (showWishlistOnly && !wishlist.includes(item.id)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
        if (!matchTitle && !matchDesc) return false;
      }

      if (selectedCollectionId !== "ALL" && !item.collectionIds.includes(selectedCollectionId)) {
        return false;
      }

      return true;
    });
  }, [items, search, selectedCollectionId, showWishlistOnly, wishlist]);

  function toggleWishlist(id: string) {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    setLastWishlistedId(id);
    setTimeout(() => setLastWishlistedId(null), 400);
  }

  function handleAddToCart(item: CatalogItem, variant?: CatalogItemVariant, duration: RentalDuration = "3-days") {
    addToCart(item, variant, duration);
    setRecentlyAddedItem(item.title);
    setAnimateCartBadge(true);
    setTimeout(() => setAnimateCartBadge(false), 500);
    setTimeout(() => setRecentlyAddedItem(null), 3500);
  }

  function handleUpdateCartQty(itemId: string, variantId: string | undefined, duration: string, delta: number) {
    updateQuantity(itemId, variantId, duration, delta);
  }

  function handleSendWhatsAppOrder() {
    if (!clientName.trim()) {
      alert("Please enter your name so the store can confirm your booking.");
      return;
    }

    const cleanVendorPhone = vendorPhone.length === 10 ? `91${vendorPhone}` : vendorPhone;
    const itemsList = cart
      .map((entry, i) => {
        const base = getItemBasePrice(entry.item, entry.variant);
        const itemPrice = getCalculatedPrice(base, entry.rentalDuration);
        const variantText = entry.variant
          ? ` (${Object.entries(entry.variant.attributes || {})
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")})`
          : "";
        return `${i + 1}. *${entry.item.title}*${variantText}\n   └ Duration: ${entry.rentalDuration} | Qty: ${entry.quantity} — ${formatPrice(
          itemPrice * entry.quantity
        )}`;
      })
      .join("\n\n");

    const message = [
      `✨ *NEW RENTAL ORDER ENQUIRY* ✨`,
      `Store: *${vendor.businessName}*`,
      ``,
      `👰 *Client Details:*`,
      `• Name: ${clientName.trim()}`,
      clientPhone.trim() ? `• Phone: ${clientPhone.trim()}` : null,
      weddingDate ? `• Wedding / Event Date: ${weddingDate}` : `• Event Date: To be confirmed`,
      deliveryAddress.trim() ? `• Location: ${deliveryAddress.trim()}` : null,
      ``,
      `🛍️ *Selected Suites:*`,
      itemsList,
      ``,
      `💰 *Estimated Total:* ${formatPrice(cartSubtotal)}`,
      orderNotes.trim() ? `\n📝 *Notes:* ${orderNotes.trim()}` : null,
      ``,
      `Please let me know if these suites are available for my date!`,
    ]
      .filter(Boolean)
      .join("\n");

    const whatsappUrl = `https://wa.me/${cleanVendorPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  }

  // Hero carousel — entirely vendor-uploaded (see "Customize Storefront" →
  // Banner & Theme). No auto-pulling from vendor cover photo or catalog item
  // photos: if the vendor hasn't uploaded a hero image, the hero section
  // just shows its gradient background with text, no image.
  const heroImages = useMemo(
    () => (customConfig?.heroImages ?? []).map((img) => img.url).filter((url): url is string => url !== null),
    [customConfig?.heroImages],
  );

  const [heroSlide, setHeroSlide] = useState(0);
  const activeHeroImage = heroImages[heroSlide] ?? null;

  function goToHeroSlide(index: number) {
    if (heroImages.length === 0) return;
    setHeroSlide(((index % heroImages.length) + heroImages.length) % heroImages.length);
  }

  // "Real Brides, Real Moments" — entirely vendor-uploaded gallery photos
  // (see "Customize Storefront" → Gallery). No auto-pulling from catalog
  // item photos and no fabricated customer names/quotes.
  const galleryPhotos = useMemo(
    () => (customConfig?.galleryImages ?? []).map((img) => img.url).filter((url): url is string => url !== null),
    [customConfig?.galleryImages],
  );

  // Shared product card — used by every curated shelf row (New Arrivals,
  // Best Sellers, the spotlight collection) and the "Featured Pieces" grid,
  // so all four product listings render identically.
  function renderProductCard(item: CatalogItem) {
    const primaryMedia = item.media[0];
    const imgUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl;
    const price = getItemBasePrice(item);
    const originalEstimated = Math.round(price * 2.5);
    const isWishlisted = wishlist.includes(item.id);

    return (
      <div
        key={item.id}
        className="bg-white rounded-2xl border border-[#EDE8E0] p-4 flex flex-col justify-between shadow-xs hover:shadow-xl hover:-translate-y-1.5 hover:border-[#D5CDBD] transition-all duration-300 ease-out group relative"
      >
        <div>
          {/* Image Area with Badge & Heart & Quick Add */}
          <div className="relative aspect-square rounded-xl bg-[#F8F6F2] overflow-hidden">
            <Link href={`/catalog/${vendor.slug}/${item.slug}`} className="block h-full w-full">
              {imgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#B0A798]">
                  <SparklesSvg className="w-8 h-8" />
                </div>
              )}
            </Link>

            {/* "New" Ochre Badge */}
            <span className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full ${theme.accentBgClass} text-white text-[10px] font-bold tracking-wide shadow-xs`}>
              New
            </span>

            {/* Wishlist Heart */}
            <button
              type="button"
              onClick={() => toggleWishlist(item.id)}
              className={`absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-[#554C41] hover:text-rose-500 transition-all shadow-xs active:scale-125 cursor-pointer ${
                lastWishlistedId === item.id ? "animate-heart-pop" : ""
              }`}
            >
              <HeartSvg className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} filled={isWishlisted} />
            </button>

            {/* Quick Add Overlay on hover (Shopify signature) */}
            <div className="absolute inset-x-2.5 bottom-2.5 z-10 hidden sm:block opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCart(item);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#1C1A17]/95 hover:bg-[#1C1A17] backdrop-blur-md text-white text-[11px] font-bold shadow-xl flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 animate-shimmer cursor-pointer"
              >
                <BagSvg className="w-3.5 h-3.5" />
                <span>+ Quick Add</span>
              </button>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="mt-3.5">
            <Link
              href={`/catalog/${vendor.slug}/${item.slug}`}
              className="block font-serif font-bold text-sm text-[#1C1A17] line-clamp-1 hover:text-[#916B33] transition-colors no-underline"
            >
              {item.title}
            </Link>
            <p className="text-[11px] text-[#7A7165] line-clamp-1 mt-0.5 font-light">
              {item.description || `${primaryCategory} suite`}
            </p>
          </div>

          {/* Price Block */}
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-[#8A8175] font-semibold">
              Rental Price
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <div className="font-mono text-base font-bold text-[#1C1A17]">
                {formatPrice(price)}
                <span className="text-[11px] text-[#7A7165] font-sans font-normal ml-1">/ 3 days</span>
              </div>
              <div className="text-xs text-[#9E9588] line-through font-mono">
                {formatPrice(originalEstimated)}
              </div>
            </div>
          </div>

          {/* Availability Status */}
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#1E7446] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Available for your dates</span>
          </div>
        </div>

        {/* Add to Bag Button */}
        <button
          type="button"
          onClick={() => handleAddToCart(item)}
          className="mt-4 w-full py-2.5 px-3 rounded-lg border border-[#D5CDBD] text-[#1F1C18] text-xs font-bold hover:bg-[#1C1A17] hover:text-white hover:border-[#1C1A17] transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 animate-shimmer cursor-pointer shadow-2xs hover:shadow-md"
        >
          <BagSvg className="w-3.5 h-3.5" />
          <span>Add to Bag</span>
        </button>
      </div>
    );
  }

  // Vendor-authored promo tiles (Customize Storefront → Promo Banner) — a
  // repeatable list, not a fixed pair, so 1-4 tiles all render the same way.
  // Every piece of a tile (image, heading, description, button label, and
  // which real collection the button links to) is vendor-set; a tile with
  // no heading was already filtered out server-side. Hidden entirely if the
  // vendor has never added a tile.
  function renderPromoTiles() {
    if (!customConfig?.promoTiles || customConfig.promoTiles.length === 0) return null;

    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className={`grid grid-cols-1 gap-4 sm:gap-5 ${customConfig.promoTiles.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {customConfig.promoTiles.map((tile, idx) => (
            <ScrollReveal key={tile.id} delay={idx * 90}>
              <div
                className="group relative rounded-2xl overflow-hidden bg-[#2A2620] h-56 sm:h-64 flex items-end border border-[#E0D7C8] shadow-xs hover:shadow-xl transition-all duration-500"
              >
                {tile.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tile.imageUrl}
                    alt={tile.heading}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity group-hover:opacity-90" />
                <div className="relative p-6 sm:p-7 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <h3 className="text-xl sm:text-2xl font-serif text-white font-medium">{tile.heading}</h3>
                  {tile.description && (
                    <p className="mt-1 text-xs text-white/85 max-w-xs">{tile.description}</p>
                  )}
                  {tile.buttonLabel && (
                    <button
                      type="button"
                      onClick={() => {
                        if (tile.linkedCollection) {
                          setSelectedCollectionId(tile.linkedCollection.id);
                          document.getElementById("featured-collections")?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      className={`mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg ${theme.accentBgClass} ${theme.accentBgHoverClass} active:scale-95 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all duration-200`}
                    >
                      <span>{tile.buttonLabel}</span>
                      <ArrowRightSvg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1E1E1E] font-sans antialiased selection:bg-[#8F6B38] selection:text-white">
      {/* Floating Added to Bag Notification (Shopify Style) */}
      {recentlyAddedItem && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-slide-down-fade flex items-center gap-3 bg-[#1C1A17] text-white px-5 py-3 rounded-full shadow-2xl border border-white/10 text-xs font-semibold">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
            <CheckSvg className="w-3.5 h-3.5" />
          </span>
          <span>Added &ldquo;{recentlyAddedItem}&rdquo; to Bag</span>
          <button
            type="button"
            onClick={() => {
              setRecentlyAddedItem(null);
              setIsCartOpen(true);
            }}
            className="ml-2 underline text-[#E5C88A] hover:text-white transition cursor-pointer"
          >
            View Bag
          </button>
        </div>
      )}

      {/* 1. Top Announcement Bar with Infinite Scrolling Marquee */}
      <div className="bg-[#141414] text-[#E0D9CE] text-[11px] sm:text-xs py-2 px-4 border-b border-[#2A2A2A] overflow-hidden relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div className="overflow-hidden flex-1 relative">
            <div className="animate-marquee whitespace-nowrap flex items-center gap-8 text-[11px] font-medium tracking-wide">
              {[...marqueeItems, ...marqueeItems].map((itemText, idx) => (
                <div key={idx} className="flex items-center gap-8 shrink-0">
                  <span className="flex items-center gap-1.5 text-white/95">
                    <SparklesSvg className="w-3.5 h-3.5 text-[#D8B478] shrink-0" />
                    <span>{itemText}</span>
                  </span>
                  <span className="text-[#555] select-none shrink-0">•</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center shrink-0 gap-4 text-[11px]">
            <a
              href={`tel:${vendorPhone}`}
              className="flex items-center gap-1.5 hover:text-white transition text-[#C7BBAA]"
            >
              <PhoneSvg className="w-3.5 h-3.5" />
              <span>{formattedPhone}</span>
            </a>
            <span className="text-[#3A3A3A]">|</span>
            <a
              href={`https://wa.me/${vendorPhone}?text=${encodeURIComponent(`Hi ${vendor.businessName}! I am browsing your online catalog.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition font-medium"
            >
              <WhatsAppSvg className="w-3.5 h-3.5" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main Luxury Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EDE8E0] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
          {/* Brand Logo & Name */}
          <Link href={`/catalog/${vendor.slug}`} className="flex items-center gap-3.5 group">
            {vendor.profile?.logoMedia ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getPublicMediaUrl(
                  vendor.profile.logoMedia.optimizedObjectKey ?? vendor.profile.logoMedia.originalObjectKey
                )}
                alt={vendor.businessName}
                className="h-11 w-11 rounded-full object-cover border border-[#E5DECF] transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#181818] text-[#D8B478] flex items-center justify-center font-serif text-base font-bold border border-[#D8B478]/30 transition-transform duration-300 group-hover:scale-105">
                {vendor.businessName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-serif tracking-widest text-base sm:text-lg font-bold uppercase text-[#1C1C1C] transition-colors group-hover:text-[#916B33]">
                {vendor.businessName}
              </div>
              <div className="text-[10px] tracking-wider uppercase text-[#887B6C] font-medium">
                {customConfig?.heroTagline || `${primaryCategory} · ${cityName}`}
              </div>
            </div>
          </Link>

          {/* Navigation Links — real vendor-created collections only, no fixed labels */}
          {collectionSummaries.length > 0 && (
            <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium text-[#4A453F]">
              {collectionSummaries.slice(0, 5).map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => {
                    setSelectedCollectionId(collection.id);
                    const el = document.getElementById("catalog-grid");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="hover:text-[#916B33] transition-colors cursor-pointer"
                >
                  {collection.name}
                </button>
              ))}
            </nav>
          )}

          {/* Header Action Icons (Search, Wishlist, Bag) */}
          <div className="flex items-center gap-4 text-[#2E2A25]">
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Search pieces…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-40 focus:w-56 transition-all duration-300 pl-8 pr-3 py-1.5 rounded-full text-xs border border-[#E4DDD2] bg-[#FAF8F5] outline-none focus:border-[#916B33]"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9E9485]">
                <SearchSvg className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => setShowWishlistOnly((prev) => !prev)}
              className="relative p-2 hover:opacity-75 transition-transform active:scale-95 cursor-pointer"
              title="Saved items"
            >
              <HeartSvg className={`w-5 h-5 ${wishlist.length > 0 ? "fill-rose-500 text-rose-500" : "text-[#2E2A25]"}`} filled={wishlist.length > 0} />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#181818] text-white text-[10px] font-bold flex items-center justify-center">
                {wishlist.length}
              </span>
            </button>

            {/* Shopping Bag Trigger with Cart Pop Animation */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:opacity-75 transition-transform active:scale-95 cursor-pointer"
              title="Shopping Bag"
            >
              <BagSvg className="w-5 h-5 text-[#2E2A25]" />
              <span
                className={`absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#8F6B38] text-white text-[10px] font-bold flex items-center justify-center shadow-xs ${
                  animateCartBadge ? "animate-cart-pop" : ""
                }`}
              >
                {cartItemCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Section — full-bleed banner with Ken-Burns motion */}
      <section className="relative h-[70vh] min-h-[420px] max-h-[720px] overflow-hidden bg-[#1C1A17]">
        {activeHeroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeHeroImage}
            alt={vendor.businessName}
            className="absolute inset-0 w-full h-full object-cover animate-ken-burns will-change-transform"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2A2620] to-[#1C1A17]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16">
          <div className="max-w-xl">
            {heroPreheading && (
              <ScrollReveal delay={60}>
                <span className="text-[11px] uppercase tracking-widest text-[#E5C88A] font-bold">
                  {heroPreheading}
                </span>
              </ScrollReveal>
            )}
            <ScrollReveal delay={140} variant="text-reveal">
              <h1 className="mt-3 text-3xl sm:text-5xl lg:text-6xl font-serif text-white font-normal leading-[1.15] drop-shadow-sm">
                {heroTitle}
              </h1>
            </ScrollReveal>
            {heroSubtitle && (
              <ScrollReveal delay={220}>
                <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed font-light max-w-lg">
                  {heroSubtitle}
                </p>
              </ScrollReveal>
            )}

            {(shopBtnLabel || trialBtnLabel) && (
              <ScrollReveal delay={300}>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  {shopBtnLabel && (
                    <a
                      href="#catalog-grid"
                      className={`px-7 py-3.5 rounded-lg ${theme.accentBgClass} ${theme.accentBgHoverClass} text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-md hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 animate-shimmer`}
                    >
                      <span>{shopBtnLabel}</span>
                      <ArrowRightSvg className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  )}
                  {trialBtnLabel && (
                    <a
                      href={`https://wa.me/${vendorPhone}?text=${encodeURIComponent(`Hi ${vendor.businessName}, I would like to book a trial appointment.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3.5 rounded-lg border border-white/70 text-white hover:bg-white/10 text-xs sm:text-sm font-semibold tracking-wide transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <span>{trialBtnLabel}</span>
                      <CalendarSvg className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>

        {heroImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goToHeroSlide(heroSlide - 1)}
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center text-[#2E2A25] hover:bg-white transition shadow-sm"
            >
              <ChevronLeftSvg className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => goToHeroSlide(heroSlide + 1)}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center text-[#2E2A25] hover:bg-white transition shadow-sm"
            >
              <ChevronRightSvg className="w-4 h-4" />
            </button>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {heroImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToHeroSlide(idx)}
                  aria-label={`Go to photo ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === heroSlide ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* 4. "Shop by Category" Section — circular avatar icons in a row,
          vendor-curated collections only. Each icon crops to a circle via
          object-cover on a fixed-size round frame, matching a reference
          layout the vendor asked to match closely (as opposed to this
          section's earlier large rectangular tile treatment). */}
      {collectionSummaries.length > 0 && (
        <section id="catalog-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <ScrollReveal>
            <div className="flex items-end justify-between mb-7">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#1F1C18] font-medium">
                  {customConfig?.categorySectionHeading || "Shop by Category"}
                </h2>
                {customConfig?.categorySectionSubheading && (
                  <p className="text-xs sm:text-sm text-[#7A7165] mt-1">
                    {customConfig.categorySectionSubheading}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCollectionId("ALL")}
                className="text-xs font-semibold text-[#8C6732] hover:underline flex items-center gap-1 shrink-0"
              >
                <span>View All</span>
                <ArrowRightSvg className="w-3 h-3" />
              </button>
            </div>
          </ScrollReveal>

          <div className="flex items-start gap-5 sm:gap-8 overflow-x-auto no-scrollbar pb-3 pt-1">
            {collectionSummaries.map((collection, idx) => {
              const isSelected = selectedCollectionId === collection.id;
              return (
                <ScrollReveal key={collection.id} delay={idx * 40} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedCollectionId(isSelected ? "ALL" : collection.id)}
                    className="group flex flex-col items-center gap-2.5 shrink-0 w-20 sm:w-24 cursor-pointer transition-transform"
                  >
                    <div
                      className={`relative h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden bg-[#EFE9DF] shadow-xs transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 ${
                        isSelected ? `ring-2 ${theme.accentRingClass} ring-offset-2 ring-offset-[#FCFBF7] scale-105 shadow-md` : "ring-1 ring-[#EDE8E0]"
                      }`}
                    >
                      {collection.sampleImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={collection.sampleImage}
                          alt={collection.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#F7F4EE] to-[#E5DEC7]">
                          <SparklesSvg className="w-6 h-6 text-[#9A743D]" />
                        </div>
                      )}
                    </div>
                    <span className={`text-[11px] sm:text-xs font-semibold text-center leading-tight transition-colors ${
                      isSelected ? "text-[#1F1C18] font-bold" : "text-[#554C41] group-hover:text-[#1F1C18]"
                    }`}>
                      {collection.name}
                    </span>
                  </button>
                </ScrollReveal>
              );
            })}
          </div>
        </section>
      )}

      {/* 4b. Curated shelf rows — New Arrivals, Best Sellers, and a spotlight
          collection, each its own titled, stacked section (rather than tab
          filters on one grid), matching a reference layout the vendor asked
          to match closely. The vendor's own promo tiles (section 7 below)
          render after the first shelf row, same position as that reference. */}
      {shelfRows.map((row, idx) => (
        <div key={row.id}>
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ScrollReveal>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-serif text-[#1F1C18] font-medium">{row.name}</h2>
                  <p className="text-xs sm:text-sm text-[#7A7165] mt-1">{row.subheading}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCollectionId(row.id);
                    document.getElementById("featured-collections")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-xs font-semibold text-[#8C6732] hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>View All</span>
                  <ArrowRightSvg className="w-3 h-3" />
                </button>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 sm:gap-6">
              {row.items.map((item, itemIdx) => (
                <ScrollReveal key={item.id} delay={(itemIdx % 5) * 45}>
                  {renderProductCard(item)}
                </ScrollReveal>
              ))}
            </div>
          </section>

          {idx === 0 && renderPromoTiles()}
        </div>
      ))}

      {/* 5. "Featured Collections" Section */}
      <section id="featured-collections" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-[#EAE5DC]">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              {customConfig?.featuredSectionHeading && (
                <h2 className="text-2xl sm:text-3xl font-serif text-[#1F1C18] font-medium">
                  {customConfig.featuredSectionHeading}
                </h2>
              )}
              {customConfig?.featuredSectionSubheading && (
                <p className="text-xs sm:text-sm text-[#7A7165] mt-1">
                  {customConfig.featuredSectionSubheading}
                </p>
              )}
            </div>

            {/* Collection Tab Filters — real vendor-curated collections only */}
            {collectionSummaries.length > 0 && (
              <div className="flex items-center gap-6 text-xs font-semibold text-[#665D52] overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCollectionId("ALL")}
                  className={`pb-1 transition ${
                    selectedCollectionId === "ALL"
                      ? "text-[#1F1C18] border-b-2 border-[#1F1C18] font-bold"
                      : "hover:text-[#1F1C18]"
                  }`}
                >
                  All
                </button>
                {collectionSummaries.map((collection) => (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => setSelectedCollectionId(collection.id)}
                    className={`pb-1 transition ${
                      selectedCollectionId === collection.id
                        ? "text-[#1F1C18] border-b-2 border-[#1F1C18] font-bold"
                        : "hover:text-[#1F1C18]"
                    }`}
                  >
                    {collection.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Product Cards Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EDE8E0] p-12 text-center max-w-md mx-auto my-8">
            <SparklesSvg className="w-10 h-10 text-[#9A743D] mx-auto" />
            <h3 className="mt-3 text-base font-serif font-bold text-[#1C1A17]">No pieces found</h3>
            <p className="text-xs text-[#7A7165] mt-1">
              Try selecting &ldquo;View All&rdquo; to browse all suites.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCollectionId("ALL");
                setShowWishlistOnly(false);
                setSearch("");
              }}
              className="mt-4 px-5 py-2 rounded-full bg-[#1C1A17] text-white text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
            {filteredItems.map((item, itemIdx) => (
              <ScrollReveal key={item.id} delay={(itemIdx % 4) * 45}>
                {renderProductCard(item)}
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      {/* 6. Value Proposition Card Strip — vendor-authored trust badges, icon fixed per position */}
      {customConfig?.trustBadges && customConfig.trustBadges.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {customConfig.trustBadges.slice(0, 4).map((badge, idx) => {
              const Icon = TRUST_BADGE_ICONS[idx] ?? SparklesSvg;
              return (
                <ScrollReveal key={idx} delay={idx * 75}>
                  <div
                    className="group bg-white p-5 rounded-2xl border border-[#EDE8E0] shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 cursor-default"
                  >
                    <div className="h-11 w-11 rounded-full bg-[#FAF6EE] border border-[#E8DFC8] flex items-center justify-center text-[#9A743D] shrink-0 group-hover:scale-110 group-hover:bg-[#F4ECE0] transition-all duration-300">
                      <Icon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-3" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#1C1A17] group-hover:text-[#9A743D] transition-colors">
                        {badge.title}
                      </h4>
                      <p className="text-[11px] text-[#7A7165] mt-0.5">{badge.subtitle}</p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. Vendor-authored photo gallery — real catalog photos only, no
          fabricated testimonial quotes/names. Hidden unless the vendor has
          both set a heading and there are photos to show. */}
      {galleryPhotos.length > 0 && customConfig?.galleryHeading && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <ScrollReveal>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif text-[#1F1C18] font-medium">
                  {customConfig.galleryHeading}
                </h2>
                {customConfig.gallerySubheading && (
                  <p className="text-xs sm:text-sm text-[#7A7165] mt-1">
                    {customConfig.gallerySubheading}
                  </p>
                )}
              </div>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {galleryPhotos.map((url, idx) => (
              <ScrollReveal key={url} delay={(idx % 6) * 40}>
                <div
                  className="aspect-[3/4] rounded-xl overflow-hidden bg-[#EFE9DF] border border-[#EDE8E0]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${vendor.businessName} piece ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </ScrollReveal>
            ))}
            {customConfig.instagramUrl && (
              <ScrollReveal delay={galleryPhotos.length * 40}>
                <a
                  href={customConfig.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-[3/4] rounded-xl border border-dashed border-[#D5CDBD] bg-[#FAF8F5] flex flex-col items-center justify-center gap-2 text-center px-3 hover:bg-[#F5F2EB] transition"
                >
                  <InstagramSvg className="w-6 h-6 text-[#8F6B38]" />
                  <span className="text-[11px] font-bold text-[#1F1C18]">Follow us on Instagram</span>
                </a>
              </ScrollReveal>
            )}
          </div>
        </section>
      )}

      {/* 8. Luxury Shopify Brand Footer */}
      <footer className="bg-white border-t border-[#EDE8E0] pt-16 pb-12 text-xs text-[#6B6256]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-[#F0EBE3]">
            {/* Brand Col */}
            <div className="space-y-3 md:col-span-1">
              <div className="font-serif tracking-widest text-base font-bold uppercase text-[#1C1A17]">
                {vendor.businessName}
              </div>
              {(customConfig?.footerAboutText || vendor.profile?.shortDescription) && (
                <p className="text-[11px] leading-relaxed text-[#7A7165]">
                  {customConfig?.footerAboutText || vendor.profile?.shortDescription}
                </p>
              )}
              <div className="text-[11px] text-[#4A453E] font-medium flex items-center gap-1.5">
                <MapPinSvg className="w-3.5 h-3.5 text-[#9A743D]" />
                <span>{cityName}</span>
              </div>
            </div>

            {/* Quick Links (first half of vendor-authored footerLinks) */}
            {footerLinksFirstHalf.length > 0 && (
              <div>
                {customConfig?.footerQuickLinksHeading && (
                  <h5 className="font-bold text-[#1C1A17] text-xs mb-3">{customConfig.footerQuickLinksHeading}</h5>
                )}
                <ul className="space-y-2 text-[11px]">
                  {footerLinksFirstHalf.map((link, idx) => (
                    <li key={idx}>
                      <a href={link.url} className="hover:text-black">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Customer Support (second half of vendor-authored footerLinks) */}
            {footerLinksSecondHalf.length > 0 && (
              <div>
                {customConfig?.footerSupportHeading && (
                  <h5 className="font-bold text-[#1C1A17] text-xs mb-3">{customConfig.footerSupportHeading}</h5>
                )}
                <ul className="space-y-2 text-[11px]">
                  {footerLinksSecondHalf.map((link, idx) => (
                    <li key={idx}>
                      <a href={link.url} className="hover:text-black">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Follow Us */}
            <div>
              {customConfig?.footerSocialHeading && (
                <h5 className="font-bold text-[#1C1A17] text-xs mb-3">{customConfig.footerSocialHeading}</h5>
              )}
              <div className="flex items-center gap-3 text-lg text-[#3E3830]">
                {customConfig?.instagramUrl && (
                  <a
                    href={customConfig.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-rose-600 transition"
                    title="Instagram"
                  >
                    <InstagramSvg className="w-4 h-4" />
                  </a>
                )}
                <a
                  href={`https://wa.me/${vendorPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-600 transition"
                  title="WhatsApp"
                >
                  <WhatsAppSvg className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#8C8375]">
            <div>&copy; {new Date().getFullYear()} {vendor.businessName}. All rights reserved.</div>
            <div>{cityName}</div>
          </div>
        </div>
      </footer>

      {/* 10. Slide-out Cart Drawer with WhatsApp Checkout */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-5 border-b border-[#EDE8E0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BagSvg className="w-5 h-5 text-[#8F6B38]" />
                <h3 className="font-serif font-bold text-base text-[#1C1A17]">Your Rental Bag</h3>
                <span className="text-xs bg-[#FAF6EE] text-[#8F6B38] px-2 py-0.5 rounded-full font-bold">
                  {cartItemCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 font-bold"
                aria-label="Close cart"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="py-20 text-center text-[#7A7165]">
                  <BagSvg className="w-12 h-12 mx-auto text-[#B5AC9E]" />
                  <p className="mt-3 text-sm font-serif font-bold text-[#1C1A17]">Your bag is empty</p>
                  <p className="mt-1 text-xs">Explore our bridal jewellery suites and add your favorites.</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 px-5 py-2.5 rounded-full bg-[#1C1A17] text-white text-xs font-bold"
                  >
                    Start Browsing
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((entry) => {
                      const primaryMedia = entry.item.media[0];
                      const imgUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl;
                      const basePrice = getItemBasePrice(entry.item, entry.variant);
                      const itemPrice = getCalculatedPrice(basePrice, entry.rentalDuration);

                      return (
                        <div
                          key={`${entry.item.id}-${entry.variant?.id || "base"}-${entry.rentalDuration}`}
                          className="flex gap-3 bg-[#FAF8F5] p-3 rounded-2xl border border-[#EDE8E0]"
                        >
                          <div className="h-16 w-16 rounded-xl bg-white border border-[#E5DEC7] overflow-hidden shrink-0">
                            {imgUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imgUrl} alt={entry.item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#B0A798]">
                                <SparklesSvg className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-serif font-bold text-[#1C1A17] line-clamp-1">
                              {entry.item.title}
                            </h5>
                            <div className="text-[10px] text-[#7A7165] mt-0.5">
                              {entry.rentalDuration.replace("-", " ")}
                            </div>
                            <div className="mt-1 text-xs font-mono font-bold text-[#1C1A17]">
                              {formatPrice(itemPrice)}
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-between">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(entry.item.id, entry.variant?.id, entry.rentalDuration, -entry.quantity)}
                              className="text-[11px] text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                            <div className="flex items-center border border-[#E5DEC7] bg-white rounded-lg text-xs font-bold">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(entry.item.id, entry.variant?.id, entry.rentalDuration, -1)}
                                className="px-2 py-0.5 hover:bg-neutral-100"
                              >
                                -
                              </button>
                              <span className="px-2">{entry.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(entry.item.id, entry.variant?.id, entry.rentalDuration, 1)}
                                className="px-2 py-0.5 hover:bg-neutral-100"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Booking details */}
                  <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#EDE8E0] space-y-3 pt-3">
                    <div className="font-bold text-xs text-[#1C1A17]">Booking / Client Details:</div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#524B43] mb-1">
                        Your Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ananya Sharma"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E0D7C8] text-xs bg-white outline-none focus:border-[#916B33]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#524B43] mb-1">
                        Your WhatsApp / Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E0D7C8] text-xs bg-white outline-none focus:border-[#916B33]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#524B43] mb-1">
                        Event / Wedding Date
                      </label>
                      <input
                        type="date"
                        value={weddingDate}
                        onChange={(e) => setWeddingDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E0D7C8] text-xs bg-white outline-none focus:border-[#916B33]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#524B43] mb-1">
                        Delivery City / Studio Trial Location
                      </label>
                      <input
                        type="text"
                        placeholder={`e.g. ${cityName}`}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E0D7C8] text-xs bg-white outline-none focus:border-[#916B33]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#524B43] mb-1">
                        Special Requests / Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Need trial at studio; matching maroon bridal saree"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E0D7C8] text-xs bg-white outline-none focus:border-[#916B33]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Checkout Button */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-[#EDE8E0] bg-white space-y-3">
                <div className="flex items-center justify-between text-xs text-[#524B43]">
                  <span>Estimated Rental Subtotal:</span>
                  <span className="font-mono font-bold text-sm text-[#1C1A17]">{formatPrice(cartSubtotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSendWhatsAppOrder}
                  className="group relative overflow-hidden w-full py-4 px-4 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.45)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                  <WhatsAppSvg className="w-5 h-5 fill-current transition-transform duration-200 group-hover:scale-110" />
                  <span>Place Order via WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
