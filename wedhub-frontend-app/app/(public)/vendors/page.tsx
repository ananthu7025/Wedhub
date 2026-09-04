import type { Metadata } from "next";
import Link from "next/link";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listCategories, searchVendors } from "@/lib/api/catalog";
import { CategoryCardGrid } from "./CategoryCardGrid";
import { CuratedVendorShelf } from "./CuratedVendorShelf";

export const metadata: Metadata = {
  title: "Wedding Vendors Directory | Wedding Categories",
  description:
    "Explore wedding categories — venues, photographers, makeup artists, decorators, bridal wear, and more. Find and book trusted wedding vendors.",
};

export default async function VendorsDirectoryPage() {
  const { data: categories } = await listCategories();

  // Dynamically take top categories from database to build vendor shelves
  const shelfCategories = categories.slice(0, 8);

  const shelves = await Promise.all(
    shelfCategories.map(async (cat) => {
      try {
        const { data } = await searchVendors({ categoryId: cat.id, limit: 8 });
        return {
          category: cat,
          vendors: data,
        };
      } catch {
        return {
          category: cat,
          vendors: [],
        };
      }
    }),
  );

  // Filter to shelves with actual approved vendors
  const populatedShelves = shelves.filter((s) => s.vendors.length > 0);

  // If no category-specific vendors exist yet, fetch latest general approved vendors
  let generalVendors: typeof populatedShelves[0]["vendors"] = [];
  if (populatedShelves.length === 0) {
    try {
      const { data } = await searchVendors({ limit: 8 });
      generalVendors = data;
    } catch {
      generalVendors = [];
    }
  }

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <PublicTopbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb Strip */}
        <nav className="mb-4 flex items-center gap-2 text-xs text-gray-500 font-medium">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <span>›</span>
          <span className="text-gray-800 font-semibold">Vendors</span>
        </nav>

        {/* Header Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Wedding Categories
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse through categories to find trusted and handpicked vendors for your celebration
          </p>
        </div>

        {/* Dynamic Pastel Category Cards 2-column Grid */}
        <CategoryCardGrid categories={categories} />

        {/* Curated Showcase Shelves (strictly populated by real database vendors) */}
        <div className="mt-12 space-y-4">
          {populatedShelves.map(({ category, vendors }) => (
            <CuratedVendorShelf
              key={category.id}
              title={category.name}
              subtitle={category.description ?? undefined}
              categoryId={category.id}
              vendors={vendors}
            />
          ))}

          {populatedShelves.length === 0 && generalVendors.length > 0 && (
            <CuratedVendorShelf
              title="Featured Wedding Vendors"
              subtitle="Explore verified professionals ready for your special day"
              vendors={generalVendors}
            />
          )}
        </div>

        {/* Category Navigation Quick Links */}
        {categories.length > 0 && (
          <section className="mt-16 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900">
              Browse Vendors by Category
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/search?categoryId=${cat.id}`}
                  className="rounded-full bg-gray-100 px-3.5 py-1.5 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
