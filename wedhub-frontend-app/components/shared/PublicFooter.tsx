import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { FooterNewsletterForm } from "@/components/shared/FooterNewsletterForm";
import { listCategories } from "@/lib/api/catalog";
import { CONTACT_EMAIL, CONTACT_PHONE, SOCIAL_LINKS } from "@/lib/seo/site";

// Resolves a real Category.id for a footer link's ?categoryId= param — a
// hardcoded slug-shaped string like "venue" never matches search's UUID
// filter and gets silently dropped (SEO/QA audit finding). Falls back to a
// free-text keyword search if the category isn't seeded, same precedent as
// PublicTopbar's venuesLink.
function categoryHref(categories: { id: string; slug: string }[], slug: string, keyword: string) {
  const category = categories.find((c) => c.slug === slug);
  return category ? `/search?categoryId=${category.id}` : `/search?keyword=${encodeURIComponent(keyword)}`;
}

export async function PublicFooter() {
  const { data: categories } = await listCategories();
  const venuesHref = categoryHref(categories, "venues", "venue");
  const photographyHref = categoryHref(categories, "photography-videography", "photographer");

  return (
    <footer className="mt-16 border-t border-border bg-white text-text-body">
      {/* Top Narrative & App Promo section */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* About itsmyKalyanam */}
          <div className="lg:col-span-7">
            <div className="mb-4">
              <BrandLogo variant="dark" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-jet-black-70 mb-2">
              itsmyKalyanam — Everything For Your Kalyanam
            </h3>
            <p className="text-xs leading-relaxed text-text-grey">
              Everything for your Kalyanam. Discover wedding photographers, venues, makeup artists, caterers and more across Kerala.
              From finding venues and photographers to bridal makeup, decor, and e-invites, itsmyKalyanam connects you with wedding vendors, transparent pricing, and wedding inspiration.
            </p>

            <div className="mt-6 flex flex-wrap items-start gap-8">
              <div>
                <div className="text-xs font-semibold text-jet-black mb-3">FOLLOW US</div>
                <div className="flex items-center gap-2.5">
                  <a
                    href={SOCIAL_LINKS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-input text-text-grey transition-colors hover:bg-brand-primary hover:text-white"
                    aria-label="Instagram"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 2h11A4.5 4.5 0 0122 6.5v11a4.5 4.5 0 01-4.5 4.5h-11A4.5 4.5 0 012 17.5v-11A4.5 4.5 0 016.5 2z" />
                    </svg>
                  </a>
                  <a
                    href={SOCIAL_LINKS.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-input text-text-grey transition-colors hover:bg-brand-primary hover:text-white"
                    aria-label="Facebook"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="border-l border-border pl-8">
                <div className="text-xs font-semibold text-jet-black mb-3">CONTACT US</div>
                <div className="flex flex-col gap-2 text-xs text-text-grey">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="flex items-center gap-2 transition-colors hover:text-brand-primary"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    {CONTACT_EMAIL}
                  </a>
                  <a
                    href={`tel:${CONTACT_PHONE.replace(/\s+/g, "")}`}
                    className="flex items-center gap-2 transition-colors hover:text-brand-primary"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {CONTACT_PHONE}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter Box */}
          <div className="lg:col-span-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">
              Stay Inspired With Wedding Trends
            </h3>
            <p className="text-xs text-text-grey mb-3">
              Get the latest bridal fashion, decor tips, real wedding features, and exclusive vendor deals delivered to your inbox.
            </p>
            <FooterNewsletterForm />

            <Link
              href="/signup?type=vendor"
              className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-brand-primary px-4 py-2 text-xs font-bold text-brand-primary no-underline transition-colors hover:bg-brand-primary-soft"
            >
              Register as a Vendor ↗
            </Link>
          </div>
        </div>

        {/* 4 Footer Navigation Columns */}
        <div className="mt-12 grid grid-cols-2 gap-8 border-t border-border pt-10 sm:grid-cols-3 md:grid-cols-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">Wedding Planning</h4>
            <ul className="space-y-2 text-xs text-text-grey list-none p-0 m-0">
              <li><Link href="/search" className="hover:text-brand-primary hover:underline">Find Vendors</Link></li>
              <li><Link href={venuesHref} className="hover:text-brand-primary hover:underline">Wedding Venues</Link></li>
              <li><Link href={photographyHref} className="hover:text-brand-primary hover:underline">Photographers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">Wedding Ideas</h4>
            <ul className="space-y-2 text-xs text-text-grey list-none p-0 m-0">
              <li><Link href="/real-weddings" className="hover:text-brand-primary hover:underline">Real Wedding Stories</Link></li>
              <li><Link href="/blog" className="hover:text-brand-primary hover:underline">Latest Wedding Blog</Link></li>
              <li><Link href="/gallery?category=outfit" className="hover:text-brand-primary hover:underline">Bridal Lehenga Trends</Link></li>
              <li><Link href="/gallery?category=decor-ideas" className="hover:text-brand-primary hover:underline">Mandap &amp; Decor Ideas</Link></li>
              <li><Link href="/gallery?category=wedding-photography" className="hover:text-brand-primary hover:underline">Pre-Wedding Shoots</Link></li>
              <li><Link href="/gallery?category=mehndi" className="hover:text-brand-primary hover:underline">Bridal Mehndi Designs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">For Vendors</h4>
            <ul className="space-y-2 text-xs text-text-grey list-none p-0 m-0">
              <li><Link href="/signup?type=vendor" className="hover:text-brand-primary hover:underline">Register as a Vendor</Link></li>
              <li><Link href="/login" className="hover:text-brand-primary hover:underline">Vendor Dashboard Login</Link></li>
              <li><Link href="/reviews/write" className="hover:text-brand-primary hover:underline">Write a Review</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">Popular Districts</h4>
            <ul className="space-y-2 text-xs text-text-grey list-none p-0 m-0">
              <li><Link href="/search?keyword=Thiruvananthapuram" className="hover:text-brand-primary hover:underline">Thiruvananthapuram</Link></li>
              <li><Link href="/search?keyword=Kochi" className="hover:text-brand-primary hover:underline">Kochi</Link></li>
              <li><Link href="/search?keyword=Kozhikode" className="hover:text-brand-primary hover:underline">Kozhikode</Link></li>
              <li><Link href="/search?keyword=Thrissur" className="hover:text-brand-primary hover:underline">Thrissur</Link></li>
              <li><Link href="/search?keyword=Kollam" className="hover:text-brand-primary hover:underline">Kollam</Link></li>
              <li><Link href="/search?keyword=Kannur" className="hover:text-brand-primary hover:underline">Kannur</Link></li>
              <li><Link href="/search?keyword=Malappuram" className="hover:text-brand-primary hover:underline">Malappuram</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="mt-10 flex flex-col items-center justify-between border-t border-border pt-6 text-xs text-text-grey sm:flex-row">
          <div>
            &copy; {new Date().getFullYear()} itsmyKalyanam Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="mt-3 flex items-center gap-3 sm:mt-0">
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-brand-primary hover:underline">{CONTACT_EMAIL}</a>
            <span>&middot;</span>
            <a href={`tel:${CONTACT_PHONE.replace(/\s+/g, "")}`} className="hover:text-brand-primary hover:underline">{CONTACT_PHONE}</a>
            <span>&middot;</span>
            <a href="/sitemap.xml" className="hover:text-brand-primary hover:underline">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
