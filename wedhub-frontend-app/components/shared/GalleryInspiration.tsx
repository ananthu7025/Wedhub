"use client";

import { useState } from "react";
import Image from "next/image";

const GALLERY_ITEMS = [
  {
    id: "1",
    category: "Bridal Wear",
    title: "Handcrafted Crimson Velvet Bridal Lehenga",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80",
    tags: "Bridal Outfit",
  },
  {
    id: "2",
    category: "Mandap & Decor",
    title: "Floral Royal Canopy & Golden Fairy Lights Mandap",
    imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80",
    tags: "Mandap Decor",
  },
  {
    id: "3",
    category: "Mehndi",
    title: "Intricate Rajasthani Bridal Henna Art",
    imageUrl: "https://images.unsplash.com/photo-1584282479904-4c4f9f6d6332?w=600&q=80",
    tags: "Bridal Mehndi",
  },
  {
    id: "4",
    category: "Pre-Wedding",
    title: "Sunset Golden Hour Silhouette Couple Shoot",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    tags: "Pre-Wedding",
  },
  {
    id: "5",
    category: "Jewellery",
    title: "Traditional Polki & Kundan Wedding Choker Set",
    imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80",
    tags: "Bridal Jewellery",
  },
  {
    id: "6",
    category: "Mandap & Decor",
    title: "Pastel Marigold & Lotus Haldi Ceremony Decor",
    imageUrl: "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=600&q=80",
    tags: "Haldi Decor",
  },
];

const CATEGORIES = ["All", "Bridal Wear", "Mandap & Decor", "Mehndi", "Pre-Wedding", "Jewellery"];

export function GalleryInspiration() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredItems = activeCategory === "All"
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <section id="gallery-inspiration" className="px-6 py-10 max-[900px]:px-4">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-jet-black">
            Gallery Inspiration
          </h2>
          <p className="text-xs text-text-grey mt-0.5">
            Discover real wedding decor, bridal outfits, jewelry, and creative ideas
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeCategory === cat
                  ? "bg-brand-primary text-white shadow-sm"
                  : "bg-surface-input text-text-grey hover:bg-neutral-grey-30 hover:text-text-dark"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-surface-input shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            />
            {/* Subtle Gradient Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-95" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <span className="inline-block rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm mb-1">
                {item.tags}
              </span>
              <p className="text-xs font-bold leading-snug line-clamp-2">{item.title}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
