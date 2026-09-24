"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { VendorDetail } from "@/lib/api/vendors.types";
import type {
  CatalogCollectionWithItems,
  CatalogItem,
  CatalogItemVariant,
  CatalogStoreSettings,
} from "@/lib/api/vendor-catalog.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { themeForCatalog } from "./catalog-theme";

// --- Clean SVG Icon Definitions (No System Icons / Emojis) ---

function SparklesSvg({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function HomeSvg({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
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
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
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

interface CartItemEntry {
  item: CatalogItem;
  variant?: CatalogItemVariant;
  rentalDuration: "1-day" | "3-days" | "5-days";
  quantity: number;
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

  // Cart Drawer state
  const [cart, setCart] = useState<CartItemEntry[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Quick View Modal state
  const [quickViewItem, setQuickViewItem] = useState<CatalogItem | null>(null);
  const [quickViewActivePhotoIdx, setQuickViewActivePhotoIdx] = useState<number>(0);
  const [selectedVariant, setSelectedVariant] = useState<CatalogItemVariant | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<"1-day" | "3-days" | "5-days">("3-days");

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

  function formatPrice(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function getItemBasePrice(item: CatalogItem, variant?: CatalogItemVariant): number {
    if (variant) return variant.price;
    if (item.variants.length > 0) {
      return Math.min(...item.variants.map((v) => v.price));
    }
    return item.basePrice || 0;
  }

  function getCalculatedPrice(basePrice: number, duration: "1-day" | "3-days" | "5-days"): number {
    if (duration === "1-day") return Math.round(basePrice * 0.75);
    if (duration === "5-days") return Math.round(basePrice * 1.35);
    return basePrice;
  }

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
  }

  // Cart calculation
  const cartItemCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const cartSubtotal = cart.reduce((acc, curr) => {
    const base = getItemBasePrice(curr.item, curr.variant);
    const price = getCalculatedPrice(base, curr.rentalDuration);
    return acc + price * curr.quantity;
  }, 0);

  function handleAddToCart(
    item: CatalogItem,
    variant?: CatalogItemVariant,
    duration: "1-day" | "3-days" | "5-days" = "3-days"
  ) {
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.item.id === item.id && c.variant?.id === variant?.id && c.rentalDuration === duration
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { item, variant, rentalDuration: duration, quantity: 1 }];
    });
    setIsCartOpen(true);
  }

  function handleUpdateCartQty(
    itemId: string,
    variantId: string | undefined,
    duration: string,
    delta: number
  ) {
    setCart((prev) =>
      prev
        .map((entry) => {
          if (entry.item.id === itemId && entry.variant?.id === variantId && entry.rentalDuration === duration) {
            const nextQty = entry.quantity + delta;
            return nextQty > 0 ? { ...entry, quantity: nextQty } : null;
          }
          return entry;
        })
        .filter(Boolean) as CartItemEntry[]
    );
  }

  function handleOpenQuickView(item: CatalogItem) {
    setQuickViewItem(item);
    setQuickViewActivePhotoIdx(0);
    setSelectedVariant(item.variants[0] || null);
    setSelectedDuration("3-days");
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

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1E1E1E] font-sans antialiased selection:bg-[#8F6B38] selection:text-white">
      {/* 1. Top Announcement Bar — single vendor-authored line, hidden if unset */}
      <div className="bg-[#141414] text-[#E0D9CE] text-[11px] sm:text-xs py-2 px-4 sm:px-8 border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {topAnnouncement ? (
            <div className="hidden lg:flex items-center gap-1.5">
              <SparklesSvg className="w-3.5 h-3.5 text-[#D8B478]" />
              <span>{topAnnouncement}</span>
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}

          <div className="flex items-center justify-between w-full lg:w-auto gap-4 text-[11px]">
            <a
              href={`tel:${vendorPhone}`}
              className="flex items-center gap-1.5 hover:text-white transition text-[#C7BBAA]"
            >
              <PhoneSvg className="w-3.5 h-3.5" />
              <span>{formattedPhone}</span>
            </a>
            <span className="text-[#3A3A3A] hidden sm:inline">|</span>
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
                className="h-11 w-11 rounded-full object-cover border border-[#E5DECF]"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#181818] text-[#D8B478] flex items-center justify-center font-serif text-base font-bold border border-[#D8B478]/30">
                {vendor.businessName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-serif tracking-widest text-base sm:text-lg font-bold uppercase text-[#1C1C1C]">
                {vendor.businessName}
              </div>
              <div className="text-[10px] tracking-wider uppercase text-[#887B6C] font-medium">
                {primaryCategory} · {cityName}
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
                  className="hover:text-[#916B33] transition"
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
              className="relative p-2 hover:opacity-75 transition"
              title="Saved items"
            >
              <HeartSvg className={`w-5 h-5 ${wishlist.length > 0 ? "fill-rose-500 text-rose-500" : "text-[#2E2A25]"}`} filled={wishlist.length > 0} />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#181818] text-white text-[10px] font-bold flex items-center justify-center">
                {wishlist.length}
              </span>
            </button>

            {/* Shopping Bag Trigger */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:opacity-75 transition"
              title="Shopping Bag"
            >
              <BagSvg className="w-5 h-5 text-[#2E2A25]" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#8F6B38] text-white text-[10px] font-bold flex items-center justify-center">
                {cartItemCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Section — full-bleed banner with text/buttons overlaid */}
      <section className="relative h-[70vh] min-h-[420px] max-h-[720px] overflow-hidden bg-[#1C1A17]">
        {activeHeroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeHeroImage}
            alt={vendor.businessName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2A2620] to-[#1C1A17]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16">
          <div className="max-w-xl">
            {heroPreheading && (
              <span className="text-[11px] uppercase tracking-widest text-[#E5C88A] font-bold">
                {heroPreheading}
              </span>
            )}
            <h1 className="mt-3 text-3xl sm:text-5xl lg:text-6xl font-serif text-white font-normal leading-[1.15] drop-shadow-sm">
              {heroTitle}
            </h1>
            {heroSubtitle && (
              <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed font-light max-w-lg">
                {heroSubtitle}
              </p>
            )}

            {(shopBtnLabel || trialBtnLabel) && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {shopBtnLabel && (
                  <a
                    href="#catalog-grid"
                    className={`px-7 py-3.5 rounded-lg ${theme.accentBgClass} ${theme.accentBgHoverClass} text-white text-xs sm:text-sm font-semibold tracking-wide transition shadow-sm flex items-center gap-2`}
                  >
                    <span>{shopBtnLabel}</span>
                    <ArrowRightSvg className="w-4 h-4" />
                  </a>
                )}
                {trialBtnLabel && (
                  <a
                    href={`https://wa.me/${vendorPhone}?text=${encodeURIComponent(`Hi ${vendor.businessName}, I would like to book a trial appointment.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 rounded-lg border border-white/70 text-white hover:bg-white/10 text-xs sm:text-sm font-semibold tracking-wide transition flex items-center gap-2"
                  >
                    <span>{trialBtnLabel}</span>
                    <CalendarSvg className="w-4 h-4" />
                  </a>
                )}
              </div>
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

      {/* 4. "Shop by Category" Section — vendor-curated collections only */}
      {collectionSummaries.length > 0 && (
        <section id="catalog-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              {customConfig?.categorySectionHeading && (
                <h2 className="text-2xl sm:text-3xl font-serif text-[#1F1C18] font-medium">
                  {customConfig.categorySectionHeading}
                </h2>
              )}
              {customConfig?.categorySectionSubheading && (
                <p className="text-xs sm:text-sm text-[#7A7165] mt-1">
                  {customConfig.categorySectionSubheading}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedCollectionId("ALL")}
              className="text-xs font-semibold text-[#8C6732] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRightSvg className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
            {collectionSummaries.map((collection) => {
              const isSelected = selectedCollectionId === collection.id;
              return (
                <div
                  key={collection.id}
                  onClick={() => setSelectedCollectionId(isSelected ? "ALL" : collection.id)}
                  className={`group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer shadow-sm transition-all duration-300 hover:shadow-lg bg-[#EFE9DF] ${
                    isSelected ? `ring-2 ${theme.accentRingClass} scale-[1.02]` : ""
                  }`}
                >
                  {collection.sampleImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={collection.sampleImage}
                      alt={collection.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#F7F4EE] to-[#E5DEC7]">
                      <SparklesSvg className="w-8 h-8 text-[#9A743D]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-x-3 bottom-3 text-white">
                    <h3 className="font-serif text-sm font-bold leading-tight">{collection.name}</h3>
                    <p className="text-[10px] text-[#E0D7C8] opacity-90 mt-0.5">
                      {collection.count} {collection.count === 1 ? "piece" : "pieces"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. "Featured Collections" Section */}
      <section id="featured-collections" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-[#EAE5DC]">
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
            {filteredItems.map((item) => {
              const primaryMedia = item.media[0];
              const imgUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl;
              const price = getItemBasePrice(item);
              const originalEstimated = Math.round(price * 2.5);
              const isWishlisted = wishlist.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#EDE8E0] p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow group"
                >
                  <div>
                    {/* Image Area with Badge & Heart */}
                    <div
                      className="relative aspect-square rounded-xl bg-[#F8F6F2] overflow-hidden cursor-pointer"
                      onClick={() => handleOpenQuickView(item)}
                    >
                      {imgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#B0A798]">
                          <SparklesSvg className="w-8 h-8" />
                        </div>
                      )}

                      {/* "New" Ochre Badge */}
                      <span className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full ${theme.accentBgClass} text-white text-[10px] font-bold tracking-wide`}>
                        New
                      </span>

                      {/* Wishlist Heart */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(item.id);
                        }}
                        className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-[#554C41] hover:text-rose-500 transition shadow-xs"
                      >
                        <HeartSvg className={`w-3.5 h-3.5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} filled={isWishlisted} />
                      </button>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="mt-3.5">
                      <h4
                        onClick={() => handleOpenQuickView(item)}
                        className="font-serif font-bold text-sm text-[#1C1A17] line-clamp-1 hover:text-[#916B33] cursor-pointer transition"
                      >
                        {item.title}
                      </h4>
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
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>Available for your dates</span>
                    </div>
                  </div>

                  {/* Add to Bag Button */}
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    className="mt-4 w-full py-2.5 px-3 rounded-lg border border-[#D5CDBD] text-[#1F1C18] text-xs font-bold hover:bg-[#1C1A17] hover:text-white transition flex items-center justify-center gap-2"
                  >
                    <BagSvg className="w-3.5 h-3.5" />
                    <span>Add to Bag</span>
                  </button>
                </div>
              );
            })}
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
                <div key={idx} className="bg-white p-5 rounded-2xl border border-[#EDE8E0] shadow-xs flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full bg-[#FAF6EE] border border-[#E8DFC8] flex items-center justify-center text-[#9A743D] shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#1C1A17]">{badge.title}</h4>
                    <p className="text-[11px] text-[#7A7165] mt-0.5">{badge.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. Studio Trials / promo banner — fully vendor-authored, hidden if unset */}
      {customConfig?.promoHeading && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-[#EFE9DF] rounded-3xl overflow-hidden border border-[#E0D7C8] flex flex-col md:flex-row items-center justify-between shadow-sm">
            <div className="w-full md:w-1/2 aspect-[16/9] md:aspect-auto h-56 md:h-72 overflow-hidden bg-[#E2DBD0]">
              {items[1]?.media[0]?.url || heroImages[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={items[1]?.media[0]?.url || heroImages[0] || ""}
                  alt={customConfig.promoHeading}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#9A743D]">
                  <HomeSvg className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="p-8 md:p-12 w-full md:w-1/2 relative">
              {customConfig.promoEyebrow && (
                <span className="text-[10px] uppercase tracking-widest text-[#8F6B38] font-bold">
                  {customConfig.promoEyebrow}
                </span>
              )}
              <h3 className="text-2xl sm:text-3xl font-serif text-[#1F1C18] mt-1.5 font-normal">
                {customConfig.promoHeading}
              </h3>
              {customConfig.promoDescription && (
                <p className="mt-2 text-xs sm:text-sm text-[#61584C] font-light max-w-md leading-relaxed">
                  {customConfig.promoDescription}
                </p>
              )}

              {trialBtnLabel && (
                <a
                  href={`https://wa.me/${vendorPhone}?text=${encodeURIComponent(`Hi ${vendor.businessName}, I would like to book a studio appointment.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#181818] text-white text-xs sm:text-sm font-semibold hover:bg-black transition shadow-sm"
                >
                  <span>{trialBtnLabel}</span>
                  <ArrowRightSvg className="w-4 h-4" />
                </a>
              )}

              {customConfig.promoQuote && (
                <div className="hidden sm:block absolute right-8 bottom-6 font-serif italic text-2xl text-[#8F6B38]/80">
                  {customConfig.promoQuote}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 7b. Vendor-authored photo gallery — real catalog photos only, no
          fabricated testimonial quotes/names. Hidden unless the vendor has
          both set a heading and there are photos to show. */}
      {galleryPhotos.length > 0 && customConfig?.galleryHeading && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {galleryPhotos.map((url, idx) => (
              <div
                key={url}
                className="aspect-[3/4] rounded-xl overflow-hidden bg-[#EFE9DF] border border-[#EDE8E0]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${vendor.businessName} piece ${idx + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
            {customConfig.instagramUrl && (
              <a
                href={customConfig.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-[3/4] rounded-xl border border-dashed border-[#D5CDBD] bg-[#FAF8F5] flex flex-col items-center justify-center gap-2 text-center px-3 hover:bg-[#F5F2EB] transition"
              >
                <InstagramSvg className="w-6 h-6 text-[#8F6B38]" />
                <span className="text-[11px] font-bold text-[#1F1C18]">Follow us on Instagram</span>
              </a>
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

      {/* 9. Quick View PDP Modal */}
      {quickViewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col md:flex-row">
            {/* Modal Image Area */}
            <div className="md:w-1/2 bg-[#F8F6F2] relative min-h-[300px] md:min-h-full flex flex-col justify-between p-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-xs">
                {quickViewItem.media[quickViewActivePhotoIdx] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      quickViewItem.media[quickViewActivePhotoIdx].url ??
                      quickViewItem.media[quickViewActivePhotoIdx].thumbnailUrl ??
                      ""
                    }
                    alt={quickViewItem.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#B0A798]">
                    <SparklesSvg className="w-12 h-12" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setQuickViewItem(null)}
                  className="absolute top-3 left-3 md:hidden h-8 w-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-neutral-800 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Thumbnails */}
              {quickViewItem.media.length > 1 && (
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                  {quickViewItem.media.map((m, idx) => (
                    <button
                      key={m.id || idx}
                      type="button"
                      onClick={() => setQuickViewActivePhotoIdx(idx)}
                      className={`h-14 w-14 rounded-xl border-2 overflow-hidden shrink-0 transition ${
                        quickViewActivePhotoIdx === idx ? "border-[#1F1C18] scale-105" : "border-[#E5DEC7] opacity-60"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url ?? m.thumbnailUrl ?? ""} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Product Details */}
            <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto max-h-[60vh] md:max-h-[90vh]">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-[#8F6B38] uppercase tracking-widest">
                      {primaryCategory}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1F1C18] mt-1">
                      {quickViewItem.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickViewItem(null)}
                    className="hidden md:flex h-8 w-8 rounded-full hover:bg-neutral-100 items-center justify-center text-neutral-500 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8E0]">
                  <div className="text-[10px] uppercase font-bold text-[#8A8175]">Rental Rate:</div>
                  <div className="text-2xl font-bold text-[#1F1C18] font-mono mt-0.5">
                    {formatPrice(
                      getCalculatedPrice(
                        getItemBasePrice(quickViewItem, selectedVariant || undefined),
                        selectedDuration
                      )
                    )}
                    <span className="text-xs text-[#7A7165] font-sans font-normal ml-1">
                      ({selectedDuration.replace("-", " ")})
                    </span>
                  </div>
                </div>

                {/* Duration selector */}
                <div className="mt-4">
                  <label className="block text-xs font-bold text-[#2A2621] mb-1.5">Rental Duration:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDuration("1-day")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center ${
                        selectedDuration === "1-day"
                          ? "bg-[#1C1A17] text-white border-[#1C1A17]"
                          : "bg-white text-[#2A2621] border-[#E0D7C8] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <div>1 Day</div>
                      <div className="text-[10px] opacity-75 font-normal">Trial / Shoot</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDuration("3-days")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center ${
                        selectedDuration === "3-days"
                          ? "bg-[#1C1A17] text-white border-[#1C1A17]"
                          : "bg-white text-[#2A2621] border-[#E0D7C8] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <div>3 Days</div>
                      <div className="text-[10px] opacity-75 font-normal">Wedding Standard</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDuration("5-days")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center ${
                        selectedDuration === "5-days"
                          ? "bg-[#1C1A17] text-white border-[#1C1A17]"
                          : "bg-white text-[#2A2621] border-[#E0D7C8] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <div>5 Days</div>
                      <div className="text-[10px] opacity-75 font-normal">Extended Events</div>
                    </button>
                  </div>
                </div>

                {/* Included pieces */}
                {quickViewItem.components.length > 0 && (
                  <div className="mt-4 bg-[#FAF8F5] rounded-xl p-4 border border-[#EDE8E0]">
                    <h5 className="text-xs font-bold text-[#1F1C18] mb-2">
                      Included in Suite ({quickViewItem.components.length}):
                    </h5>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#524B43]">
                      {quickViewItem.components.map((comp) => (
                        <li key={comp.id} className="flex items-center gap-1.5">
                          <CheckSvg className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{comp.name} {comp.defaultQty > 1 ? `(${comp.defaultQty})` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-[#EDE8E0] flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart(quickViewItem, selectedVariant || undefined, selectedDuration);
                    setQuickViewItem(null);
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-[#1C1A17] text-white text-xs font-bold hover:bg-black transition shadow-md flex items-center justify-center gap-2"
                >
                  <BagSvg className="w-4 h-4" />
                  <span>Add to Rental Bag</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              >
                ✕
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
                  className="w-full py-4 px-4 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <WhatsAppSvg className="w-5 h-5 fill-current" />
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
