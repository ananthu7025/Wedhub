"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";

export function PublicFooter() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

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
              itsmyKalyanam is India&apos;s trusted wedding planning platform, helping millions of couples plan their dream wedding.
              From finding top-rated venues and photographers to bridal makeup, decor, and e-invites, itsmyKalyanam connects you with verified vendors, transparent pricing, authentic reviews, and endless wedding inspiration.
            </p>

            <div className="mt-6">
              <div className="text-xs font-semibold text-jet-black mb-3">FOLLOW US</div>
              <div className="flex items-center gap-2.5">
                {[
                  { name: "Facebook", href: "https://facebook.com", icon: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
                  { name: "Twitter", href: "https://twitter.com", icon: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" },
                  { name: "Instagram", href: "https://instagram.com", icon: "M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 2h11A4.5 4.5 0 0122 6.5v11a4.5 4.5 0 01-4.5 4.5h-11A4.5 4.5 0 012 17.5v-11A4.5 4.5 0 016.5 2z" },
                  { name: "YouTube", href: "https://youtube.com", icon: "M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43zM9.75 15.02V8.53l5.75 3.24-5.75 3.25z" },
                ].map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-input text-text-grey transition-colors hover:bg-brand-primary hover:text-white"
                    aria-label={s.name}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={s.icon} />
                    </svg>
                  </a>
                ))}
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
            {subscribed ? (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800">
                ✓ Thank you for subscribing to itsmyKalyanam updates!
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) setSubscribed(true);
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 rounded-md border border-neutral-grey bg-white px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
                />
                <button
                  type="submit"
                  className="rounded-md bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-primary-hover shadow-sm"
                >
                  Subscribe
                </button>
              </form>
            )}

            <Link
              href="/signup?type=vendor"
              className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-brand-primary px-4 py-2 text-xs font-bold text-brand-primary no-underline transition-colors hover:bg-brand-primary-soft"
            >
              Register as a Vendor ↗
            </Link>
          </div>
        </div>

        {/* 5 Footer Navigation Columns */}
        <div className="mt-12 grid grid-cols-2 gap-8 border-t border-border pt-10 sm:grid-cols-3 md:grid-cols-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">Wedding Planning</h4>
            <ul className="space-y-2 text-xs text-text-grey list-none p-0 m-0">
              <li><Link href="/search" className="hover:text-brand-primary hover:underline">Find Vendors</Link></li>
              <li><Link href="/search?categoryId=venue" className="hover:text-brand-primary hover:underline">Wedding Venues</Link></li>
              <li><Link href="/search?categoryId=photographer" className="hover:text-brand-primary hover:underline">Photographers</Link></li>
              <li><Link href="/search" className="hover:text-brand-primary hover:underline">Checklists &amp; Tools</Link></li>
              <li><Link href="/search" className="hover:text-brand-primary hover:underline">Wedding Cost Estimator</Link></li>
              <li><Link href="/search" className="hover:text-brand-primary hover:underline">E-Invites &amp; Save the Date</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">Wedding Ideas</h4>
            <ul className="space-y-2 text-xs text-text-grey list-none p-0 m-0">
              <li><Link href="/real-weddings" className="hover:text-brand-primary hover:underline">Real Wedding Stories</Link></li>
              <li><a href="#wedding-blogs" className="hover:text-brand-primary hover:underline">Latest Wedding Blog</a></li>
              <li><a href="#gallery-inspiration" className="hover:text-brand-primary hover:underline">Bridal Lehenga Trends</a></li>
              <li><a href="#gallery-inspiration" className="hover:text-brand-primary hover:underline">Mandap &amp; Decor Ideas</a></li>
              <li><a href="#gallery-inspiration" className="hover:text-brand-primary hover:underline">Pre-Wedding Shoots</a></li>
              <li><a href="#gallery-inspiration" className="hover:text-brand-primary hover:underline">Bridal Mehndi Designs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">For Vendors</h4>
            <ul className="space-y-2 text-xs text-text-grey list-none p-0 m-0">
              <li><Link href="/signup?type=vendor" className="hover:text-brand-primary hover:underline">Register as a Vendor</Link></li>
              <li><Link href="/login" className="hover:text-brand-primary hover:underline">Vendor Dashboard Login</Link></li>
              <li><Link href="/signup?type=vendor" className="hover:text-brand-primary hover:underline">Pricing &amp; Subscriptions</Link></li>
              <li><Link href="/login" className="hover:text-brand-primary hover:underline">Vendor Lead Management</Link></li>
              <li><Link href="/reviews/write" className="hover:text-brand-primary hover:underline">Review Guidelines</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">Popular Cities</h4>
            <ul className="space-y-2 text-xs text-text-grey list-none p-0 m-0">
              <li><Link href="/search?keyword=Bengaluru" className="hover:text-brand-primary hover:underline">Bengaluru</Link></li>
              <li><Link href="/search?keyword=Delhi" className="hover:text-brand-primary hover:underline">Delhi NCR</Link></li>
              <li><Link href="/search?keyword=Mumbai" className="hover:text-brand-primary hover:underline">Mumbai</Link></li>
              <li><Link href="/search?keyword=Hyderabad" className="hover:text-brand-primary hover:underline">Hyderabad</Link></li>
              <li><Link href="/search?keyword=Chennai" className="hover:text-brand-primary hover:underline">Chennai</Link></li>
              <li><Link href="/search?keyword=Goa" className="hover:text-brand-primary hover:underline">Goa</Link></li>
              <li><Link href="/search?keyword=Jaipur" className="hover:text-brand-primary hover:underline">Jaipur &amp; Udaipur</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-jet-black mb-3">Company &amp; Legal</h4>
            <ul className="space-y-2 text-xs text-text-grey list-none p-0 m-0">
              <li><Link href="/" className="hover:text-brand-primary hover:underline">About itsmyKalyanam</Link></li>
              <li><Link href="/" className="hover:text-brand-primary hover:underline">Careers &amp; Press</Link></li>
              <li><Link href="/reviews/write" className="hover:text-brand-primary hover:underline">Write a Review</Link></li>
              <li><Link href="/" className="hover:text-brand-primary hover:underline">Terms of Service</Link></li>
              <li><Link href="/" className="hover:text-brand-primary hover:underline">Privacy Policy</Link></li>
              <li><Link href="/" className="hover:text-brand-primary hover:underline">Contact Support</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="mt-10 flex flex-col items-center justify-between border-t border-border pt-6 text-xs text-text-grey sm:flex-row">
          <div>
            &copy; {new Date().getFullYear()} itsmyKalyanam Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="mt-3 flex items-center gap-4 sm:mt-0">
            <Link href="/" className="hover:text-brand-primary hover:underline">Privacy Policy</Link>
            <span>&bull;</span>
            <Link href="/" className="hover:text-brand-primary hover:underline">Terms of Use</Link>
            <span>&bull;</span>
            <Link href="/" className="hover:text-brand-primary hover:underline">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
