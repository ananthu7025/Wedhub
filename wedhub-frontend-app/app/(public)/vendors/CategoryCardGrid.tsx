import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/lib/api/vendors.types";

const PASTEL_PALETTE = [
  { bg: "bg-[#eef2ff]", border: "border-[#dce4ff]", text: "text-indigo-900" },
  { bg: "bg-[#fff1f2]", border: "border-[#ffe4e6]", text: "text-rose-900" },
  { bg: "bg-[#fff7ed]", border: "border-[#ffedd5]", text: "text-amber-900" },
  { bg: "bg-[#f0fdf4]", border: "border-[#dcfce7]", text: "text-emerald-900" },
  { bg: "bg-[#fefce8]", border: "border-[#fef9c3]", text: "text-yellow-900" },
  { bg: "bg-[#faf5ff]", border: "border-[#f3e8ff]", text: "text-purple-900" },
  { bg: "bg-[#fdf2f8]", border: "border-[#fce7f3]", text: "text-pink-900" },
  { bg: "bg-[#f0fdfa]", border: "border-[#ccfbf1]", text: "text-teal-900" },
];

export function CategoryCardGrid({ categories }: { categories: Category[] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
      {categories.map((category, index) => {
        const theme = PASTEL_PALETTE[index % PASTEL_PALETTE.length];

        // Dynamically compute subtext from real category data
        const subtext =
          category.description ||
          (category.attributes && category.attributes.length > 0
            ? category.attributes
                .slice(0, 4)
                .map((a) => a.label)
                .join(", ")
            : `Explore verified ${category.name.toLowerCase()} professionals and pricing`);

        return (
          <Link
            key={category.id}
            href={`/search?categoryId=${category.id}`}
            className={`group relative flex h-[130px] sm:h-[145px] items-center justify-between overflow-hidden rounded-2xl border ${theme.border} ${theme.bg} p-4 sm:p-5 text-inherit no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
          >
            {/* Left Content */}
            <div className="flex flex-col justify-center pr-4 max-w-[62%] sm:max-w-[65%]">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 text-base sm:text-lg group-hover:text-[#e00b41] transition-colors">
                <span>{category.name}</span>
                <span className="text-gray-400 group-hover:text-[#e00b41] group-hover:translate-x-1 transition-all text-sm">
                  ›
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {subtext}
              </p>
            </div>

            {/* Right Arched Cutout: Real category image or dynamic emblem */}
            <div className="relative h-full w-[105px] sm:w-[130px] flex-shrink-0 overflow-hidden rounded-l-[50px] shadow-xs bg-white/50">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 105px, 130px"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-gray-400">
                  <span className="text-2xl font-black text-gray-300">
                    {category.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/5" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
