"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { VendorDetail } from "@/lib/api/vendors.types";
import type { CatalogItem, CatalogItemVariant } from "@/lib/api/vendor-catalog.types";
import { getPublicMediaUrl } from "@/lib/media/url";

interface CartItemEntry {
  item: CatalogItem;
  variant?: CatalogItemVariant;
  rentalDuration: "1-day" | "3-days" | "5-days";
  quantity: number;
}

type StoreTheme = "noir" | "champagne" | "emerald";

export function ShopifyCatalogView({
  vendor,
  initialItems,
}: {
  vendor: VendorDetail;
  initialItems: CatalogItem[];
}) {
  const [items] = useState<CatalogItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("ALL");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "newest">("featured");
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const [theme, setTheme] = useState<StoreTheme>("noir");

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

  // Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [storeCopied, setStoreCopied] = useState(false);

  // WhatsApp Checkout Form inside Cart Drawer
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const vendorPhone = vendor.profile?.phone?.replace(/[^0-9]/g, "") || "919999999999";
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category?.name || "Bridal Rental Studio";

  // Derive unique collections / categories from items
  const collections = useMemo(() => {
    return ["ALL", "Bridal Sets", "Chokers", "Temple Jewellery", "Haram & Necklaces", "Bangles & Kadas", "Accessories"];
  }, []);

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

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (!item.isActive) return false;

        // Wishlist filter
        if (showWishlistOnly && !wishlist.includes(item.id)) return false;

        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
          const matchComp = item.components.some((c) => c.name.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchComp) return false;
        }

        // Collection / Tag Filter
        if (selectedTag !== "ALL") {
          const text = `${item.title} ${item.description || ""} ${item.components.map((c) => c.name).join(" ")}`.toLowerCase();
          const tag = selectedTag.toLowerCase();
          if (!text.includes(tag.slice(0, 4))) return false;
        }

        // Price Filter
        const price = getItemBasePrice(item);
        if (selectedPriceRange === "under-3000" && price >= 3000) return false;
        if (selectedPriceRange === "3000-6000" && (price < 3000 || price > 6000)) return false;
        if (selectedPriceRange === "above-6000" && price <= 6000) return false;

        return true;
      })
      .sort((a, b) => {
        const pA = getItemBasePrice(a);
        const pB = getItemBasePrice(b);
        if (sortBy === "price-asc") return pA - pB;
        if (sortBy === "price-desc") return pB - pA;
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return a.sortOrder - b.sortOrder;
      });
  }, [items, search, selectedTag, selectedPriceRange, sortBy, showWishlistOnly, wishlist]);

  // Wishlist toggle
  function toggleWishlist(id: string) {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  // Cart calculations
  const cartItemCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const cartSubtotal = cart.reduce((acc, curr) => {
    const base = getItemBasePrice(curr.item, curr.variant);
    const price = getCalculatedPrice(base, curr.rentalDuration);
    return acc + price * curr.quantity;
  }, 0);

  // Caution deposit estimation (approx 30% of rental, rounded to nearest 500, min 1000)
  const estimatedDeposit = cartSubtotal > 0 ? Math.max(1000, Math.round((cartSubtotal * 0.3) / 500) * 500) : 0;

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

  // Pre-compose WhatsApp Order Message
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
        const durText = entry.rentalDuration.replace("-", " ");
        return `${i + 1}. *${entry.item.title}*${variantText}\n   └ Duration: ${durText} | Qty: ${entry.quantity} | ${formatPrice(
          itemPrice * entry.quantity
        )}`;
      })
      .join("\n\n");

    const message = [
      `✨ *NEW RENTAL ORDER RESERVATION* ✨`,
      `Store: *${vendor.businessName}*`,
      ``,
      `👰 *Client Details:*`,
      `• Name: ${clientName.trim()}`,
      clientPhone.trim() ? `• WhatsApp / Phone: ${clientPhone.trim()}` : null,
      weddingDate ? `• Wedding / Event Date: ${weddingDate}` : `• Event Date: To be scheduled`,
      deliveryAddress.trim() ? `• Delivery / Trial City: ${deliveryAddress.trim()}` : null,
      ``,
      `🛍️ *Selected Bridal Suites:*`,
      itemsList,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `💰 *Estimated Rental Total:* ${formatPrice(cartSubtotal)}`,
      `🛡️ *Refundable Deposit:* ~${formatPrice(estimatedDeposit)} (Settled on handover)`,
      orderNotes.trim() ? `\n📝 *Notes / Saree Color:* ${orderNotes.trim()}` : null,
      ``,
      `Hello! I would like to check availability and book these sets for my event. Looking forward to your confirmation!`,
    ]
      .filter(Boolean)
      .join("\n");

    const whatsappUrl = `https://wa.me/${cleanVendorPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  }

  // Single Item Direct WhatsApp Inquiry
  function handleDirectItemWhatsApp(item: CatalogItem) {
    const cleanVendorPhone = vendorPhone.length === 10 ? `91${vendorPhone}` : vendorPhone;
    const price = getItemBasePrice(item);
    const msg = [
      `Hi *${vendor.businessName}*,`,
      `I'm browsing your online collection on WedHub and loved this set:`,
      `✨ *${item.title}* (Rental: ${formatPrice(price)})`,
      ``,
      `Could you let me know if this piece is available for a trial appointment / booking?`,
    ].join("\n");

    window.open(`https://wa.me/${cleanVendorPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function handleShareStorefrontWhatsApp() {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const msg = `✨ Check out the bridal rental collection from *${vendor.businessName}*:\n${currentUrl}\n\nBrowse exclusive handcrafted suites and reserve directly on WhatsApp!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function handleCopyStorefrontLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setStoreCopied(true);
      setTimeout(() => setStoreCopied(false), 2500);
    }
  }

  // Dynamic Theme Colors
  const themeStyles = {
    noir: {
      accent: "bg-neutral-900 text-white",
      accentBorder: "border-neutral-900",
      accentText: "text-neutral-900",
      subtleBg: "bg-neutral-100",
      bannerBg: "bg-[#161616]",
    },
    champagne: {
      accent: "bg-[#9A7B4F] text-white",
      accentBorder: "border-[#9A7B4F]",
      accentText: "text-[#9A7B4F]",
      subtleBg: "bg-[#F7F4EE]",
      bannerBg: "bg-[#25201A]",
    },
    emerald: {
      accent: "bg-[#1E4D3E] text-white",
      accentBorder: "border-[#1E4D3E]",
      accentText: "text-[#1E4D3E]",
      subtleBg: "bg-[#EDF5F1]",
      bannerBg: "bg-[#0E231C]",
    },
  }[theme];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white antialiased pb-20 sm:pb-0">
      {/* 1. Top Announcement Marquee (Shopify Prestige Style) */}
      <div className={`${themeStyles.bannerBg} text-white py-2 px-4 text-center tracking-wider text-[11px] sm:text-xs font-medium border-b border-white/10`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="hidden md:flex items-center gap-2 text-white/70">
            <span>✨ 100% Sanitized &amp; Handcrafted Suites</span>
            <span>·</span>
            <span>📍 Studio Trials Available</span>
          </div>
          <div className="mx-auto md:mx-0 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Direct WhatsApp Booking &amp; 20% Advance Date Lock</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-white/80">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="hover:text-white transition flex items-center gap-1"
            >
              <span>🔗 Share Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Luxury Sticky Header / Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3.5 min-w-0">
            {vendor.profile?.logoMedia ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getPublicMediaUrl(
                  vendor.profile.logoMedia.optimizedObjectKey ?? vendor.profile.logoMedia.originalObjectKey
                )}
                alt={vendor.businessName}
                className="h-12 w-12 rounded-full object-cover border border-neutral-200 shadow-xs"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                {vendor.businessName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <Link href={`/catalog/${vendor.slug}`} className="hover:opacity-90 transition">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 truncate font-serif">
                  {vendor.businessName}
                </h1>
              </Link>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                <span>{primaryCategory}</span>
                {vendor.city && <span>· 📍 {vendor.city.name}</span>}
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                  <span>✓</span> Verified Partner
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Nav Links (Shopify Menu Style) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-neutral-600">
            <a href="#catalog-grid" className="hover:text-neutral-900 transition">
              Collections
            </a>
            <a href="#rental-guide" className="hover:text-neutral-900 transition">
              Rental Guide
            </a>
            <a href="#faq" className="hover:text-neutral-900 transition">
              FAQs
            </a>
            <Link href={`/vendors/${vendor.slug}`} className="hover:text-neutral-900 transition">
              Portfolio
            </Link>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => setShowWishlistOnly((prev) => !prev)}
              className={`p-2.5 rounded-full border transition flex items-center gap-1 text-xs font-bold ${
                showWishlistOnly
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
              }`}
              title="View saved pieces"
            >
              <svg
                className={`w-4 h-4 ${showWishlistOnly || wishlist.length > 0 ? "fill-rose-500 text-rose-500" : "fill-none"}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {wishlist.length > 0 && <span className="text-[11px] font-mono">({wishlist.length})</span>}
            </button>

            {/* Direct WhatsApp Concierge Button */}
            <a
              href={`https://wa.me/${vendorPhone.length === 10 ? `91${vendorPhone}` : vendorPhone}?text=${encodeURIComponent(
                `Hi ${vendor.businessName}, I am browsing your online catalog on WedHub and would like to ask a question.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition shadow-xs"
            >
              <svg className="w-3.5 h-3.5 fill-current text-emerald-600" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
              </svg>
              <span>Chat</span>
            </a>

            {/* Shopping Bag Button (Shopify Ajax Cart Trigger) */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition shadow-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Bag ({cartItemCount})</span>
              {cartSubtotal > 0 && <span className="hidden sm:inline font-mono">· {formatPrice(cartSubtotal)}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Editorial Storefront Billboard (Shopify Dawn / Prestige) */}
      <section className="relative bg-neutral-900 text-white overflow-hidden">
        {vendor.profile?.coverMedia ? (
          <div className="absolute inset-0 opacity-30 mix-blend-overlay">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPublicMediaUrl(
                vendor.profile.coverMedia.optimizedObjectKey ?? vendor.profile.coverMedia.originalObjectKey
              )}
              alt={vendor.businessName}
              className="w-full h-full object-cover scale-105"
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 opacity-95" />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-xs font-semibold mb-4 border border-white/15">
              <span>★ {Number(vendor.averageRating) > 0 ? Number(vendor.averageRating).toFixed(1) : "5.0"}</span>
              <span>· {vendor.reviewCount > 0 ? `${vendor.reviewCount} Reviews` : "Curated Bridal Collection"}</span>
              <span>·</span>
              <span className="text-emerald-400">Available for Bookings</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
              {vendor.businessName}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-300 leading-relaxed font-light">
              {vendor.profile?.shortDescription ||
                "Exquisite handcrafted bridal jewellery, royal temple sets, Kundan chokers, and couture suites available for rent & studio trials."}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs">
              <a
                href="#catalog-grid"
                className="px-6 py-3 rounded-full bg-white text-neutral-900 font-bold hover:bg-neutral-100 transition shadow-lg flex items-center gap-2"
              >
                <span>Browse {items.length} Bridal Suites</span>
                <span>↓</span>
              </a>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold backdrop-blur-md border border-white/20 transition flex items-center gap-1.5"
              >
                <span>🔗 Share Catalog</span>
              </button>
            </div>
          </div>

          {/* Quick Rental Guarantee Badges */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0 bg-white/5 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 text-xs max-w-sm">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">✨</span>
              <div>
                <div className="font-bold text-white">100% Sanitized</div>
                <div className="text-[11px] text-neutral-400">Steam cleaned &amp; boxed</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xl">📅</span>
              <div>
                <div className="font-bold text-white">Flexible Slots</div>
                <div className="text-[11px] text-neutral-400">1 to 5 day rental options</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xl">💬</span>
              <div>
                <div className="font-bold text-white">Direct WhatsApp</div>
                <div className="text-[11px] text-neutral-400">Instant order confirmation</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xl">🛡️</span>
              <div>
                <div className="font-bold text-white">Refundable Caution</div>
                <div className="text-[11px] text-neutral-400">Returned upon set return</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Controls, Theme Switcher & Facets (Shopify Site Builder Controls) */}
      <section id="catalog-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        {/* Collection Pill Tabs */}
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {collections.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTag(tag);
                    setShowWishlistOnly(false);
                  }}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${
                    isSelected && !showWishlistOnly
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Theme Palette Switcher (Store Builder aesthetic control) */}
          <div className="hidden md:flex items-center gap-1.5 border border-neutral-200 rounded-full bg-white px-2 py-1 shrink-0 text-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1">Theme:</span>
            <button
              type="button"
              onClick={() => setTheme("noir")}
              className={`h-4 w-4 rounded-full bg-neutral-900 border ${theme === "noir" ? "ring-2 ring-neutral-400" : ""}`}
              title="Noir Theme"
            />
            <button
              type="button"
              onClick={() => setTheme("champagne")}
              className={`h-4 w-4 rounded-full bg-[#9A7B4F] border ${theme === "champagne" ? "ring-2 ring-[#9A7B4F]" : ""}`}
              title="Champagne Gold Theme"
            />
            <button
              type="button"
              onClick={() => setTheme("emerald")}
              className={`h-4 w-4 rounded-full bg-[#1E4D3E] border ${theme === "emerald" ? "ring-2 ring-[#1E4D3E]" : ""}`}
              title="Emerald Theme"
            />
          </div>
        </div>

        {/* Facet Toolbar: Search, Price, Sort & Grid Switcher */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search necklace, choker, haram, bangles, style…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-neutral-200 bg-white text-xs outline-none focus:border-neutral-900 transition shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Price Filter */}
            <select
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
              className="px-3.5 py-2.5 rounded-full border border-neutral-200 bg-white text-neutral-700 font-semibold outline-none cursor-pointer shadow-xs"
            >
              <option value="ALL">All Price Ranges</option>
              <option value="under-3000">Under ₹3,000</option>
              <option value="3000-6000">₹3,000 – ₹6,000</option>
              <option value="above-6000">₹6,000 &amp; Above</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3.5 py-2.5 rounded-full border border-neutral-200 bg-white text-neutral-700 font-semibold outline-none cursor-pointer shadow-xs"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Additions</option>
            </select>

            {/* Grid Layout Switcher (2, 3, 4 columns) */}
            <div className="hidden lg:flex items-center border border-neutral-200 rounded-full bg-white p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setGridCols(2)}
                className={`p-1.5 rounded-full ${gridCols === 2 ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"}`}
                title="Large Editorial Grid (2 Columns)"
              >
                <span className="font-mono text-[10px] px-1 font-bold">2×</span>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(3)}
                className={`p-1.5 rounded-full ${gridCols === 3 ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"}`}
                title="Standard Grid (3 Columns)"
              >
                <span className="font-mono text-[10px] px-1 font-bold">3×</span>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(4)}
                className={`p-1.5 rounded-full ${gridCols === 4 ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"}`}
                title="Compact Grid (4 Columns)"
              >
                <span className="font-mono text-[10px] px-1 font-bold">4×</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(selectedTag !== "ALL" || selectedPriceRange !== "ALL" || search || showWishlistOnly) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] text-neutral-400 font-semibold">Active Filters:</span>
            {selectedTag !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-200 text-neutral-800 font-medium">
                {selectedTag}
                <button type="button" onClick={() => setSelectedTag("ALL")}>✕</button>
              </span>
            )}
            {selectedPriceRange !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-200 text-neutral-800 font-medium">
                {selectedPriceRange}
                <button type="button" onClick={() => setSelectedPriceRange("ALL")}>✕</button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-200 text-neutral-800 font-medium">
                &ldquo;{search}&rdquo;
                <button type="button" onClick={() => setSearch("")}>✕</button>
              </span>
            )}
            {showWishlistOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-medium">
                Saved Wishlist
                <button type="button" onClick={() => setShowWishlistOnly(false)}>✕</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedTag("ALL");
                setSelectedPriceRange("ALL");
                setSearch("");
                setShowWishlistOnly(false);
              }}
              className="text-[11px] text-neutral-500 hover:text-neutral-900 underline font-semibold ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </section>

      {/* 5. Product Grid (Shopify Prestige / Dawn Theme Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-16 text-center max-w-md mx-auto my-12 shadow-xs">
            <span className="text-4xl">💎</span>
            <h3 className="mt-4 text-base font-bold text-neutral-900 font-serif">No suites match your criteria</h3>
            <p className="mt-1.5 text-xs text-neutral-500">
              Try adjusting your search terms or clearing your price and category filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedTag("ALL");
                setSelectedPriceRange("ALL");
                setShowWishlistOnly(false);
              }}
              className="mt-5 px-5 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-6 sm:gap-8 ${
              gridCols === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : gridCols === 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            }`}
          >
            {filteredItems.map((item) => {
              const primaryMedia = item.media[0];
              const secondaryMedia = item.media[1];
              const imgUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl;
              const hoverImgUrl = secondaryMedia?.url ?? secondaryMedia?.thumbnailUrl;
              const price = getItemBasePrice(item);
              const isWishlisted = wishlist.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="group relative bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Image Area with Badge & Hover Actions */}
                    <div
                      className="relative aspect-[4/5] bg-neutral-100 overflow-hidden cursor-pointer"
                      onClick={() => handleOpenQuickView(item)}
                    >
                      {imgUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={item.title}
                            className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
                              hoverImgUrl ? "group-hover:opacity-0" : ""
                            }`}
                          />
                          {hoverImgUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={hoverImgUrl}
                              alt={`${item.title} alternate view`}
                              className="w-full h-full object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-105"
                            />
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                          <span className="text-3xl">💎</span>
                          <span className="text-[11px] font-medium mt-1">Bridal Suite</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-bold text-neutral-900 tracking-wider uppercase shadow-xs">
                          Rental Suite
                        </span>
                        {item.isCustomizable && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-md text-[10px] font-bold text-white shadow-xs">
                            Customizable
                          </span>
                        )}
                      </div>

                      {/* Top Right Wishlist Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(item.id);
                        }}
                        className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-neutral-700 hover:text-rose-500 hover:scale-110 transition shadow-xs"
                        title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                      >
                        <svg
                          className={`w-4 h-4 ${isWishlisted ? "fill-rose-500 text-rose-500" : "fill-none"}`}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>

                      {/* Quick Hover Bar (Shopify Quick Action Bar) */}
                      <div className="absolute inset-x-3 bottom-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-900 text-white text-xs font-bold shadow-lg hover:bg-neutral-800 transition flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>+ Add to Bag</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectItemWhatsApp(item);
                          }}
                          className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition"
                          title="Inquire directly on WhatsApp"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4
                          onClick={() => handleOpenQuickView(item)}
                          className="text-sm font-bold text-neutral-900 line-clamp-1 hover:text-neutral-600 cursor-pointer transition font-serif"
                        >
                          {item.title}
                        </h4>
                      </div>

                      {/* Pieces Breakdown Badge */}
                      {item.components.length > 0 ? (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-500 line-clamp-1">
                          <span className="font-semibold text-neutral-800">✦ {item.components.length} Pieces:</span>
                          <span>{item.components.map((c) => c.name).join(", ")}</span>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-[11px] text-neutral-500 line-clamp-1">
                          {item.description || "Full bridal jewellery suite"}
                        </p>
                      )}

                      {/* Variants indicator */}
                      {item.variants.length > 0 && (
                        <div className="mt-1 text-[10px] text-neutral-400 font-medium">
                          {item.variants.length} style/finish options
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom / Price & CTA */}
                  <div className="px-4 sm:px-5 pb-4 pt-0 border-t border-neutral-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                        Rental Rate
                      </div>
                      <div className="text-base font-bold text-neutral-900 font-mono">
                        {formatPrice(price)}
                        <span className="text-[11px] text-neutral-500 font-normal ml-1">/ 3 days</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickView(item)}
                      className="text-xs font-bold text-neutral-900 hover:opacity-75 underline transition"
                    >
                      Quick View →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Rental Guide & Value Strip (Shopify Editorial Strip) */}
      <section id="rental-guide" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-neutral-200">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Simple 4-Step Process</span>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 mt-1">
            How Bridal Rentals Work
          </h3>
          <p className="mt-2 text-xs text-neutral-500">
            Enjoy luxury couture jewellery for your dream wedding without the burden of buying.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs relative">
            <span className="text-2xl font-mono font-bold text-neutral-300 absolute top-4 right-4">01</span>
            <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-lg mb-4">
              🛍️
            </div>
            <h4 className="font-bold text-sm text-neutral-900">1. Select &amp; Bag</h4>
            <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
              Explore our handcrafted collections and add your favorite sets to your rental bag.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs relative">
            <span className="text-2xl font-mono font-bold text-neutral-300 absolute top-4 right-4">02</span>
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-lg mb-4">
              💬
            </div>
            <h4 className="font-bold text-sm text-neutral-900">2. WhatsApp Order</h4>
            <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
              Submit your event date. Our designer confirms availability and locks your booking via WhatsApp.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs relative">
            <span className="text-2xl font-mono font-bold text-neutral-300 absolute top-4 right-4">03</span>
            <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-lg mb-4">
              ✨
            </div>
            <h4 className="font-bold text-sm text-neutral-900">3. Trial &amp; Handover</h4>
            <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
              Try the set at our showroom or get sanitized delivery boxed directly to your doorstep.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs relative">
            <span className="text-2xl font-mono font-bold text-neutral-300 absolute top-4 right-4">04</span>
            <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-lg mb-4">
              🛡️
            </div>
            <h4 className="font-bold text-sm text-neutral-900">4. Easy Return</h4>
            <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
              Return the suite after your celebrations and receive your 100% refundable security deposit.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Quick View Modal (Shopify PDP Modal) */}
      {quickViewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col md:flex-row">
            {/* Modal Image Area with Gallery Thumbnails */}
            <div className="md:w-1/2 bg-neutral-100 relative min-h-[300px] md:min-h-full flex flex-col justify-between p-4">
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
                  <div className="w-full h-full flex items-center justify-center text-5xl">💎</div>
                )}
                <button
                  type="button"
                  onClick={() => setQuickViewItem(null)}
                  className="absolute top-3 left-3 md:hidden h-8 w-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-neutral-800 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Thumbnail Selector */}
              {quickViewItem.media.length > 1 && (
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                  {quickViewItem.media.map((m, idx) => (
                    <button
                      key={m.id || idx}
                      type="button"
                      onClick={() => setQuickViewActivePhotoIdx(idx)}
                      className={`h-14 w-14 rounded-xl border-2 overflow-hidden shrink-0 transition ${
                        quickViewActivePhotoIdx === idx ? "border-neutral-900 scale-105" : "border-neutral-200 opacity-60"
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
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      {primaryCategory}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-neutral-900 mt-1">
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

                {/* Price Display with Duration Calculation */}
                <div className="mt-4 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Rental Rate:</div>
                  <div className="text-2xl font-bold text-neutral-900 font-mono mt-0.5">
                    {formatPrice(
                      getCalculatedPrice(
                        getItemBasePrice(quickViewItem, selectedVariant || undefined),
                        selectedDuration
                      )
                    )}
                    <span className="text-xs text-neutral-500 font-normal ml-1 font-sans">
                      ({selectedDuration.replace("-", " ")})
                    </span>
                  </div>
                </div>

                {/* Rental Duration Selector */}
                <div className="mt-4">
                  <label className="block text-xs font-bold text-neutral-800 mb-1.5">Rental Duration:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDuration("1-day")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center ${
                        selectedDuration === "1-day"
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
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
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <div>3 Days</div>
                      <div className="text-[10px] opacity-75 font-normal">Standard Wedding</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDuration("5-days")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center ${
                        selectedDuration === "5-days"
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <div>5 Days</div>
                      <div className="text-[10px] opacity-75 font-normal">Extended Events</div>
                    </button>
                  </div>
                </div>

                {/* Variants Selector */}
                {quickViewItem.variants.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Choose Option / Polish:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {quickViewItem.variants.map((v) => {
                        const label = Object.entries(v.attributes || {})
                          .map(([k, val]) => `${k}: ${val}`)
                          .join(", ");
                        const isSelected = selectedVariant?.id === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariant(v)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                              isSelected
                                ? "bg-neutral-900 text-white border-neutral-900"
                                : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                            }`}
                          >
                            {label || "Standard"} — {formatPrice(v.price)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pieces Included Checklist */}
                {quickViewItem.components.length > 0 && (
                  <div className="mt-4 bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80">
                    <h5 className="text-xs font-bold text-neutral-900 mb-2">
                      Pieces Included in Suite ({quickViewItem.components.length}):
                    </h5>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-neutral-700">
                      {quickViewItem.components.map((comp) => (
                        <li key={comp.id} className="flex items-center gap-1.5">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>
                            {comp.name} {comp.defaultQty > 1 ? `(${comp.defaultQty})` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rental Policies Note */}
                <div className="mt-4 text-[11px] text-neutral-500 space-y-1">
                  <div>🛡️ Refundable caution deposit collected upon handover</div>
                  <div>🚚 Studio trial available at {vendor.city?.name || "our showroom"}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-neutral-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart(quickViewItem, selectedVariant || undefined, selectedDuration);
                    setQuickViewItem(null);
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Add to Rental Bag</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectItemWhatsApp(quickViewItem)}
                  className="py-3.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-md flex items-center justify-center gap-1.5"
                  title="Ask on WhatsApp"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
                  </svg>
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Shopify Slide-Out Cart Drawer (Ajax Cart) with WhatsApp Checkout */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h3 className="font-bold text-base text-neutral-900 font-serif">Your Rental Bag</h3>
                <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full font-bold">
                  {cartItemCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Free Trial Progress Notification (Shopify Cart Upsell Style) */}
            <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-2">
              <span>✨</span>
              <span>
                <strong>Studio Trial Styling Included:</strong> Reserve your date to schedule an in-person match.
              </span>
            </div>

            {/* Drawer Body: Cart Items List + Booking Details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {cart.length === 0 ? (
                <div className="py-20 text-center text-neutral-500">
                  <span className="text-4xl">🛍️</span>
                  <p className="mt-3 text-sm font-bold text-neutral-900 font-serif">Your rental bag is empty</p>
                  <p className="mt-1 text-xs">Explore our bridal jewellery suites and add your favorites.</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 px-5 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition"
                  >
                    Start Browsing Collections
                  </button>
                </div>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="space-y-3">
                    {cart.map((entry) => {
                      const primaryMedia = entry.item.media[0];
                      const imgUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl;
                      const basePrice = getItemBasePrice(entry.item, entry.variant);
                      const itemPrice = getCalculatedPrice(basePrice, entry.rentalDuration);

                      return (
                        <div
                          key={`${entry.item.id}-${entry.variant?.id || "base"}-${entry.rentalDuration}`}
                          className="flex gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/70"
                        >
                          <div className="h-16 w-16 rounded-xl bg-white border border-neutral-200 overflow-hidden shrink-0">
                            {imgUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imgUrl} alt={entry.item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">💎</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-neutral-900 line-clamp-1 font-serif">
                              {entry.item.title}
                            </h5>
                            <div className="text-[10px] text-neutral-500 flex flex-wrap gap-1 mt-0.5">
                              <span className="bg-white px-1.5 py-0.5 rounded border border-neutral-200 font-medium">
                                {entry.rentalDuration.replace("-", " ")}
                              </span>
                              {entry.variant && (
                                <span className="bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                                  {Object.entries(entry.variant.attributes || {})
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs font-mono font-bold text-neutral-900">
                              {formatPrice(itemPrice)}
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex flex-col items-end justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCartQty(
                                  entry.item.id,
                                  entry.variant?.id,
                                  entry.rentalDuration,
                                  -entry.quantity
                                )
                              }
                              className="text-[11px] text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                            <div className="flex items-center border border-neutral-200 bg-white rounded-lg text-xs font-bold">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateCartQty(entry.item.id, entry.variant?.id, entry.rentalDuration, -1)
                                }
                                className="px-2 py-0.5 hover:bg-neutral-100"
                              >
                                -
                              </button>
                              <span className="px-2">{entry.quantity}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateCartQty(entry.item.id, entry.variant?.id, entry.rentalDuration, 1)
                                }
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

                  {/* Client Details Form for WhatsApp Checkout */}
                  <div className="bg-neutral-50/70 p-4 rounded-2xl border border-neutral-200/80 space-y-3 pt-3">
                    <div className="font-bold text-xs text-neutral-900 flex items-center justify-between">
                      <span>Booking / Client Details:</span>
                      <span className="text-[10px] text-neutral-400 font-normal">Sent directly via WhatsApp</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                        Your Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ananya Sharma"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                        Your Contact Phone (optional)
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                        Wedding / Event Date
                      </label>
                      <input
                        type="date"
                        value={weddingDate}
                        onChange={(e) => setWeddingDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                        Delivery City / Studio Pickup
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kochi / Studio Trial"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                        Special Notes / Saree Color Matching
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Matching red Kanjivaram saree; need trial slot this Saturday"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer: Order Total & Big WhatsApp CTA */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-neutral-200 bg-white space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Estimated Rental Subtotal:</span>
                    <span className="font-mono font-bold text-neutral-900">{formatPrice(cartSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                    <span>Refundable Caution Deposit (est.):</span>
                    <span className="font-mono font-semibold">~{formatPrice(estimatedDeposit)}</span>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                  🔒 Zero platform commission. Direct vendor order with WhatsApp verification.
                </div>

                <button
                  type="button"
                  onClick={handleSendWhatsAppOrder}
                  className="w-full py-4 px-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2 group"
                >
                  <svg className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
                  </svg>
                  <span>Place Order via WhatsApp 💬</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Share Store Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-bold text-lg text-neutral-900">Share Storefront</h4>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-800 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Share this live bridal rental catalog with brides, family members, or event planners to explore and
              order together.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleShareStorefrontWhatsApp}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
                </svg>
                <span>Share via WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyStorefrontLink}
                className="w-full py-3 px-4 rounded-xl border border-neutral-300 bg-white text-neutral-800 font-bold text-xs hover:bg-neutral-50 transition flex items-center justify-center gap-2"
              >
                <span>{storeCopied ? "✓ Link Copied to Clipboard!" : "📋 Copy Store Link"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Frequently Asked Questions Accordion */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 border-t border-neutral-200">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Rental FAQ</span>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 mt-1">
            Questions Brides Often Ask
          </h3>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "How does the refundable caution deposit work?",
              a: "A temporary security deposit (typically around 30% of rental value) is collected upon handover or dispatch. Once the jewellery set is returned in good order, 100% of the caution deposit is immediately refunded to your account.",
            },
            {
              q: "Can I try the jewellery set before the wedding?",
              a: "Yes! We offer studio trial appointments where you can bring your saree or bridal lehenga to match colors, chokers, and haram lengths perfectly. Direct WhatsApp messages allow you to book a convenient trial slot.",
            },
            {
              q: "Are the jewellery sets sanitized between brides?",
              a: "Absolutely. Every set undergoes ultrasonic steam cleaning and disinfection before being boxed with velvet lining, ensuring 100% hygiene and readiness for your wedding day.",
            },
            {
              q: "What if my wedding date changes or gets rescheduled?",
              a: "We understand wedding dates may fluctuate. Simply reach out to us via WhatsApp at least 7 days before your scheduled handover to transfer your advance reservation to your new date without penalty, subject to availability.",
            },
          ].map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={faq.q}
                className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left font-bold text-xs sm:text-sm text-neutral-900 flex items-center justify-between hover:bg-neutral-50 transition"
                >
                  <span>{faq.q}</span>
                  <span className="text-base text-neutral-400">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 11. Luxury Shopify-Style Footer */}
      <footer className="mt-12 bg-white border-t border-neutral-200 pt-16 pb-12 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-neutral-100">
            {/* Col 1 */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-base text-neutral-900">{vendor.businessName}</h4>
              <p className="text-neutral-500 leading-relaxed">
                Premium bridal and event rental collections. Handcrafted suites curated for unforgettable wedding
                celebrations.
              </p>
              {vendor.city && <div>📍 {vendor.city.name}</div>}
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <h5 className="font-bold text-neutral-900">Rental Policies</h5>
              <ul className="space-y-1.5 text-neutral-500">
                <li>1. 100% Sanitized &amp; Velvet Boxed</li>
                <li>2. Studio Trial Styling Available</li>
                <li>3. 100% Refundable Caution Deposit</li>
                <li>4. Flexible 1 to 5 Day Rental Slots</li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <h5 className="font-bold text-neutral-900">Collections</h5>
              <ul className="space-y-1.5 text-neutral-500">
                <li>• Royal Temple Jewellery Sets</li>
                <li>• Handcrafted Kundan &amp; Polki Chokers</li>
                <li>• Antique Matte Finish Harams</li>
                <li>• Bridal Bangles &amp; Matha Patti</li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-3">
              <h5 className="font-bold text-neutral-900">Order via WhatsApp</h5>
              <p className="text-neutral-500">
                Have custom questions or want to verify date availability? Chat directly with the designer.
              </p>
              <a
                href={`https://wa.me/${vendorPhone.length === 10 ? `91${vendorPhone}` : vendorPhone}?text=Hi! I am browsing your WedHub catalog and would like to ask a question.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-sm"
              >
                <span>💬 Start WhatsApp Chat</span>
              </a>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400">
            <div>
              &copy; {new Date().getFullYear()} {vendor.businessName}. Powered by WedHub Luxury Commerce.
            </div>
            <div className="flex items-center gap-4">
              <Link href={`/vendors/${vendor.slug}`} className="hover:underline">
                Vendor Profile
              </Link>
              <Link href="/search" className="hover:underline">
                Explore Marketplace
              </Link>
              <button type="button" onClick={() => setIsShareModalOpen(true)} className="hover:underline">
                Share Storefront
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* 12. Floating WhatsApp Concierge Button */}
      <a
        href={`https://wa.me/${vendorPhone.length === 10 ? `91${vendorPhone}` : vendorPhone}?text=${encodeURIComponent(
          `Hi ${vendor.businessName}, I am browsing your catalog and would like some assistance.`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 sm:bottom-6 right-5 z-40 h-13 w-13 rounded-full bg-emerald-600 text-white shadow-2xl hover:bg-emerald-700 hover:scale-105 transition flex items-center justify-center group"
        title="Chat with Store Stylist"
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
        </svg>
      </a>

      {/* 13. Mobile Bottom Sticky Checkout Bar (Shopify Mobile Experience) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-3 sm:hidden flex items-center justify-between gap-3 shadow-lg">
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="flex-1 py-3 px-4 rounded-xl bg-neutral-900 text-white font-bold text-xs flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-2">
            <span>🛍️</span>
            <span>Rental Bag ({cartItemCount})</span>
          </div>
          {cartSubtotal > 0 && <span className="font-mono">{formatPrice(cartSubtotal)}</span>}
        </button>

        <a
          href={`https://wa.me/${vendorPhone.length === 10 ? `91${vendorPhone}` : vendorPhone}?text=Hi! I am browsing your WedHub catalog and would like to ask a question.`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-xl bg-emerald-600 text-white shadow-md flex items-center justify-center shrink-0"
          title="Direct WhatsApp"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
