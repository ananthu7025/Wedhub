import Image from "next/image";
import type { WeddingWebsiteMedia, WeddingWebsitePublicView } from "@/lib/api/wedding-website.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { themeFor } from "./theme";
import { RsvpForm } from "./RsvpForm";
import { ShareButtons } from "./ShareButtons";

/**
 * The single renderer for BOTH the temporary preview and the permanent
 * published website — Business Rule 12 (docs/12-stage-wedding-website.md):
 * "preview and published website must use the same template renderer."
 * Visual variation between the 3 templates comes entirely from theme.ts,
 * not from separate component trees. Consumes the narrow
 * WeddingWebsitePublicView shape (same for preview and published reads),
 * never the wide owner-only draft shape — this component must never be
 * handed owner/payment data.
 */

function objectKeyFor(media: WeddingWebsiteMedia): string {
  return media.optimizedObjectKey ?? media.thumbnailObjectKey ?? media.originalObjectKey;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function countdownLabel(weddingDate: string | null): string | null {
  if (!weddingDate) return null;
  const diffMs = new Date(weddingDate).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days === 1 ? "1 day to go" : `${days} days to go`;
}

export function WeddingWebsiteRenderer({
  website,
  canonicalUrl,
  mode,
}: {
  website: WeddingWebsitePublicView;
  canonicalUrl: string;
  mode: "preview" | "published";
}) {
  const theme = themeFor(website.template);
  const coupleNames = `${website.brideName} & ${website.groomName}`;
  const weddingDateLabel = formatDate(website.weddingDate);
  const countdown = countdownLabel(website.weddingDate);
  const heroKey = website.coverMedia ? objectKeyFor(website.coverMedia) : null;
  const couplePhotoKey = website.couplePhotoMedia ? objectKeyFor(website.couplePhotoMedia) : null;

  return (
    <div className={`min-h-screen ${theme.sectionBgClass}`}>
      {mode === "preview" && (
        <div className="bg-jet-black-90 px-4 py-2 text-center text-xs font-bold text-white">
          Preview mode — this link is temporary and not indexed by search engines
        </div>
      )}

      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        {heroKey ? (
          <Image src={getPublicMediaUrl(heroKey)} alt={coupleNames} fill className="object-cover" priority sizes="100vw" />
        ) : (
          <div className={`absolute inset-0 ${theme.accentBgClass}`} />
        )}
        <div className={`absolute inset-0 ${theme.heroOverlay}`} />
        <div className="relative z-10 w-full px-6 pb-12 text-center sm:px-10">
          <p className={`mb-3 text-xs font-bold tracking-[0.3em] uppercase ${theme.heroEyebrowClass}`}>
            {heroKey ? "We're getting married" : "Welcome to our wedding"}
          </p>
          <h1 className={`text-4xl font-extrabold text-white drop-shadow sm:text-6xl ${theme.headingFontClass}`}>
            {coupleNames}
          </h1>
          {weddingDateLabel && (
            <p className="mt-4 text-sm font-semibold text-white/90 sm:text-base">
              {weddingDateLabel}
              {countdown && <span className="ml-2 font-normal text-white/70">· {countdown}</span>}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-14 sm:px-10">
        {/* Blessings — traditional Indian wedding invitation convention:
            "With the blessings of" followed by each side's parents. Only
            rendered once at least one side is filled in; a side with no
            parents text simply doesn't get its own block. */}
        {(website.brideParents || website.groomParents) && (
          <section className="mb-14 text-center">
            <p className={`mb-6 text-xs font-bold tracking-[0.3em] uppercase ${theme.accentTextClass}`}>With the blessings of</p>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {website.brideParents && (
                <div>
                  <p className="mb-2 text-sm font-bold text-text-dark">{website.brideName}&apos;s Parents</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-text-grey">{website.brideParents}</p>
                </div>
              )}
              {website.groomParents && (
                <div>
                  <p className="mb-2 text-sm font-bold text-text-dark">{website.groomName}&apos;s Parents</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-text-grey">{website.groomParents}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {website.shortDescription && (
          <p className={`mb-14 text-center text-base leading-relaxed ${theme.accentTextClass}`}>{website.shortDescription}</p>
        )}

        {/* Couple photo + story */}
        {(couplePhotoKey || website.coupleStory || website.brideDescription || website.groomDescription || website.howWeMet) && (
          <section className="mb-16">
            <SectionHeading theme={theme}>Our Story</SectionHeading>
            {couplePhotoKey && (
              <div className="relative mx-auto mb-8 aspect-[4/5] w-full max-w-sm overflow-hidden rounded-lg">
                <Image src={getPublicMediaUrl(couplePhotoKey)} alt={coupleNames} fill className="object-cover" sizes="384px" />
              </div>
            )}
            {website.coupleStory && <p className="mb-6 text-center leading-relaxed text-text-dark">{website.coupleStory}</p>}
            {(website.brideDescription || website.groomDescription) && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {website.brideDescription && (
                  <div>
                    <h3 className={`mb-1 text-sm font-bold ${theme.accentTextClass}`}>{website.brideName}</h3>
                    <p className="text-sm leading-relaxed text-text-grey">{website.brideDescription}</p>
                  </div>
                )}
                {website.groomDescription && (
                  <div>
                    <h3 className={`mb-1 text-sm font-bold ${theme.accentTextClass}`}>{website.groomName}</h3>
                    <p className="text-sm leading-relaxed text-text-grey">{website.groomDescription}</p>
                  </div>
                )}
              </div>
            )}
            {website.howWeMet && (
              <p className="mt-6 text-center text-sm leading-relaxed text-text-grey italic">{website.howWeMet}</p>
            )}
          </section>
        )}

        {/* Events */}
        {website.events.length > 0 && (
          <section className="mb-16">
            <SectionHeading theme={theme}>Wedding Events</SectionHeading>
            <div className="flex flex-col gap-4">
              {website.events.map((event) => (
                <div key={event.id} className={`rounded-lg border p-5 ${theme.cardBorderClass}`}>
                  <h3 className="text-base font-bold text-text-dark">{event.name}</h3>
                  <p className="mt-1 text-sm text-text-grey">
                    {[formatDate(event.date), event.time].filter(Boolean).join(" · ")}
                    {event.venue && ` — ${event.venue}`}
                  </p>
                  {event.description && <p className="mt-2 text-sm text-text-dark">{event.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Venue */}
        {(website.venueName || website.venueAddress) && (
          <section className="mb-16 text-center">
            <SectionHeading theme={theme}>Venue</SectionHeading>
            {website.venueName && <p className="text-base font-bold text-text-dark">{website.venueName}</p>}
            {website.venueAddress && <p className="mt-1 text-sm text-text-grey">{website.venueAddress}</p>}
            {website.googleMapsUrl && (
              <a
                href={website.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold text-white ${theme.ctaVariant === "dark" ? "bg-jet-black-90" : "bg-brand-primary"}`}
              >
                View on Google Maps ↗
              </a>
            )}
          </section>
        )}

        {/* Gallery */}
        {website.gallery.length > 0 && (
          <section className="mb-16">
            <SectionHeading theme={theme}>Gallery</SectionHeading>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {website.gallery.map((item) => (
                <div key={item.id} className="relative aspect-square overflow-hidden rounded-md">
                  <Image src={getPublicMediaUrl(objectKeyFor(item))} alt={coupleNames} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RSVP — published mode only; a preview draft has no real slug to submit against */}
        {mode === "published" && website.slug && (
          <section className="mb-16">
            <SectionHeading theme={theme}>RSVP</SectionHeading>
            <RsvpForm slug={website.slug} />
          </section>
        )}

        {/* Contact / hashtag */}
        {(website.contactInfo || website.weddingHashtag) && (
          <section className="mb-16 text-center text-sm text-text-grey">
            {website.contactInfo && <p>{website.contactInfo}</p>}
            {website.weddingHashtag && <p className={`mt-1 font-bold ${theme.accentTextClass}`}>#{website.weddingHashtag.replace(/^#/, "")}</p>}
          </section>
        )}

        {mode === "published" && (
          <section className="text-center">
            <SectionHeading theme={theme}>Share</SectionHeading>
            <ShareButtons url={canonicalUrl} coupleNames={coupleNames} />
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ children, theme }: { children: string; theme: ReturnType<typeof themeFor> }) {
  return (
    <h2 className={`mb-6 text-center text-2xl font-bold text-text-dark ${theme.headingFontClass}`}>
      <span className={`mr-2 ${theme.accentTextClass}`}>{theme.divider}</span>
      {children}
      <span className={`ml-2 ${theme.accentTextClass}`}>{theme.divider}</span>
    </h2>
  );
}
