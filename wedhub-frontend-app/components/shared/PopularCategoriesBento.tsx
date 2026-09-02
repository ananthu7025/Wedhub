"use client";

import Image from "next/image";
import Link from "next/link";

export function PopularCategoriesBento() {
  return (
    <section className="mx-auto max-w-6xl px-8 sm:px-14 lg:px-20 py-8">
      {/* Section Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-jet-black">
            Popular Categories
          </h2>
          <p className="text-xs text-text-grey mt-0.5">
            Discover trending wedding services, bespoke venues &amp; planning tools
          </p>
        </div>
        <Link href="/search" className="text-xs font-bold text-brand-primary hover:underline">
          View All Services →
        </Link>
      </div>

      {/* Asymmetric Bento Grid with compact boxes and tight gaps matching reference */}
      <div className="space-y-3 sm:space-y-3.5">
        {/* ROW 1: 4-cols + 8-cols */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-3.5">
          {/* Card 1: Destination Weddings (1/3) */}
          <Link
            href="/search?keyword=Resort"
            className="group relative md:col-span-4 h-[180px] sm:h-[195px] rounded-[18px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-4 text-white no-underline"
          >
            <Image
              src="/images/bento/destination.jpg"
              alt="Destination Weddings"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 z-5" />

            <div className="relative z-10">
              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow">
                Destination Weddings
              </h3>
              <p className="text-[10px] sm:text-[11px] text-white/90 mt-0.5 max-w-[95%] drop-shadow-xs line-clamp-1">
                Palaces in Udaipur, beaches in Goa &amp; hills
              </p>
              <div className="text-[10px] sm:text-[11px] font-bold text-white mt-0.5 drop-shadow">
                Starting at ₹ 4,50,000
              </div>
            </div>

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-jet-black shadow-sm transition-transform group-hover:scale-105">
                View More ↗
              </span>
            </div>
          </Link>

          {/* Card 2: Luxury Banquet Halls (2/3) */}
          <Link
            href="/search?categoryId=venue"
            className="group relative md:col-span-8 h-[180px] sm:h-[195px] rounded-[18px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-4 text-white no-underline"
          >
            <Image
              src="/images/capsules/venue.jpg"
              alt="Luxury Banquet Halls & Resorts"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 66vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 z-5" />

            <div className="relative z-10">
              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow">
                Luxury Banquet Halls &amp; Resorts
              </h3>
              <p className="text-[10px] sm:text-[11px] text-white/90 mt-0.5 max-w-[85%] drop-shadow-xs line-clamp-1">
                5-star AC banquet halls with royal decor &amp; catering
              </p>
              <div className="text-[10px] sm:text-[11px] font-bold text-white mt-0.5 drop-shadow">
                Starting at ₹ 1,200 / plate
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-jet-black shadow-sm transition-transform group-hover:scale-105">
                View More ↗
              </span>
              {/* Carousel indicator dots */}
              <div className="flex items-center gap-1">
                <span className="h-1 w-3 rounded-full bg-[#fde047]"></span>
                <span className="h-1 w-1 rounded-full bg-white/60"></span>
                <span className="h-1 w-1 rounded-full bg-white/60"></span>
              </div>
            </div>
          </Link>
        </div>

        {/* ROW 2: 6-cols + 3-cols + 3-cols */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-3.5">
          {/* Card 3: Candid Photography (1/2) */}
          <Link
            href="/search?categoryId=photographer"
            className="group relative md:col-span-6 h-[165px] sm:h-[180px] rounded-[18px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-4 text-white no-underline"
          >
            <Image
              src="/images/capsules/photo.jpg"
              alt="Candid & Cinematic Photography"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 z-5" />

            <div className="relative z-10">
              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow">
                Candid &amp; Cinematic Photography
              </h3>
              <p className="text-[10px] sm:text-[11px] text-white/90 mt-0.5 max-w-[90%] drop-shadow-xs line-clamp-1">
                Award-winning wedding filmmakers &amp; drone shoots
              </p>
            </div>

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-jet-black shadow-sm transition-transform group-hover:scale-105">
                View More ↗
              </span>
            </div>
          </Link>

          {/* Card 4: Plan With AI Assistant (1/4) */}
          <Link
            href="/search"
            className="group relative md:col-span-3 h-[165px] sm:h-[180px] rounded-[18px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-4 text-white no-underline"
          >
            <Image
              src="/images/bento/planning.jpg"
              alt="Build Your Own Wedding Plan"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25 z-5" />

            <div className="relative z-10">
              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow">
                Build Your Wedding Plan!
              </h3>
              <p className="text-[10px] text-white/90 mt-0.5 drop-shadow-xs line-clamp-2">
                Vendors &amp; budget checklist in 10 mins
              </p>
            </div>

            <div className="relative z-10">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e55e2] text-white font-extrabold shadow-md transition-transform group-hover:scale-110">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </span>
            </div>
          </Link>

          {/* Card 5: Bridal Makeup & Glow (1/4) */}
          <Link
            href="/search?categoryId=makeup"
            className="group relative md:col-span-3 h-[165px] sm:h-[180px] rounded-[18px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-4 text-white no-underline"
          >
            <Image
              src="/images/capsules/makeup.jpg"
              alt="Bridal Makeup & Styling"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25 z-5" />

            <div className="relative z-10">
              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow">
                Bridal Makeup &amp; Glow
              </h3>
              <p className="text-[10px] text-white/90 mt-0.5 drop-shadow-xs line-clamp-1">
                HD &amp; Airbrush artists
              </p>
              <div className="text-[10px] font-bold text-white mt-0.5 drop-shadow">
                Starting at ₹ 15,000
              </div>
            </div>

            <div className="relative z-10">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e55e2] text-white font-extrabold shadow-md transition-transform group-hover:scale-110">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </span>
            </div>
          </Link>
        </div>

        {/* ROW 3: 4-cols + 4-cols + 4-cols */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-3.5">
          {/* Card 6: Designer Bridal Wear (1/3) */}
          <Link
            href="/search?keyword=wear"
            className="group relative md:col-span-4 h-[165px] sm:h-[180px] rounded-[18px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-4 text-white no-underline"
          >
            <Image
              src="/images/capsules/wear.jpg"
              alt="Designer Bridal Wear"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 z-5" />

            <div className="relative z-10">
              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow">
                Designer Bridal Wear
              </h3>
              <p className="text-[10px] sm:text-[11px] text-white/90 mt-0.5 drop-shadow-xs line-clamp-1">
                Handcrafted velvet lehengas &amp; sarees
              </p>
              <div className="text-[10px] sm:text-[11px] font-bold text-white mt-0.5 drop-shadow">
                Starting at ₹ 35,000
              </div>
            </div>

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-jet-black shadow-sm transition-transform group-hover:scale-105">
                View More ↗
              </span>
            </div>
          </Link>

          {/* Card 7: Mandap & Floral Decor (1/3) */}
          <Link
            href="/search?categoryId=decorator"
            className="group relative md:col-span-4 h-[165px] sm:h-[180px] rounded-[18px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-4 text-white no-underline"
          >
            <Image
              src="/images/capsules/decor.jpg"
              alt="Mandap & Floral Decor"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 z-5" />

            <div className="relative z-10">
              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow">
                Mandap &amp; Floral Decor
              </h3>
              <p className="text-[10px] sm:text-[11px] text-white/90 mt-0.5 drop-shadow-xs line-clamp-1">
                Dreamy floral canopies &amp; fairy lights
              </p>
              <div className="text-[10px] sm:text-[11px] font-bold text-white mt-0.5 drop-shadow">
                Starting at ₹ 60,000
              </div>
            </div>

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-jet-black shadow-sm transition-transform group-hover:scale-105">
                Book Decor ↗
              </span>
            </div>
          </Link>

          {/* Card 8: Bridal Mehndi & Henna (1/3) */}
          <Link
            href="/search?keyword=mehndi"
            className="group relative md:col-span-4 h-[165px] sm:h-[180px] rounded-[18px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-4 text-white no-underline"
          >
            <Image
              src="/images/capsules/mehndi.jpg"
              alt="Bridal Mehndi & Henna"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 z-5" />

            <div className="relative z-10">
              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow">
                Bridal Mehndi &amp; Henna
              </h3>
              <p className="text-[10px] sm:text-[11px] text-white/90 mt-0.5 drop-shadow-xs line-clamp-1">
                Rajasthani &amp; organic henna artists
              </p>
              <div className="text-[10px] sm:text-[11px] font-bold text-white mt-0.5 drop-shadow">
                Starting at ₹ 5,000
              </div>
            </div>

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-jet-black shadow-sm transition-transform group-hover:scale-105">
                View More ↗
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
