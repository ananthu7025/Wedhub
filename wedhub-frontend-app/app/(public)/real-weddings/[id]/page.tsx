import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getPublicWeddingStory } from "@/lib/api/catalog";
import { getPublicMediaUrl } from "@/lib/media/url";
import { StoryDetailData, StoryDetailPhoto, StoryDetailView } from "./StoryDetailView";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

// Rich Pinterest gallery photos curated for the 6 stories
const SAMPLE_DETAILS: Record<string, StoryDetailData> = {
  "sample-1": {
    id: "sample-1",
    coupleName: "Ananya & Rohan",
    location: "Palace Grounds, Bengaluru",
    tag: "South Indian Traditional",
    snippet: "A grand floral celebration featuring traditional Kanjeevaram silk, fragrant jasmine canopies, and majestic temple-style decor.",
    narrativeStory: [
      "Set amidst the verdant lawns of Palace Grounds in Bengaluru, Ananya and Rohan’s wedding was a harmonious blend of rich Carnatic heritage and contemporary royal elegance.",
      "The ceremony commenced at dawn with traditional Nadaswaram melodies echoing through a temple-inspired mandap handcrafted with thousands of marigolds, lotus buds, and brass vilakku lamps.",
      "Ananya donned a handwoven vermilion Kanjeevaram sari accented with heirloom temple gold jewelry, while Rohan wore a pristine ivory tussar silk veshti. The reception that evening transformed the venue into a starlit wonderland with acoustic live music and a royal banquet."
    ],
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    vendorCity: "Bengaluru, Karnataka",
    coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80", caption: "Temple Mandap with traditional brass lamps and marigolds", aspectRatioClass: "aspect-[3/4]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80", caption: "The Bride in handwoven Kanjeevaram silk", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
      { id: "p3", url: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&q=80", caption: "Joyous laughter during the ring fishing ritual", aspectRatioClass: "aspect-[4/3]", category: "Rituals" },
      { id: "p4", url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", caption: "Intricate jasmine jada and gold hair ornaments", aspectRatioClass: "aspect-[1/1]", category: "Details" },
      { id: "p5", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", caption: "Sunset couple portrait under floral archway", aspectRatioClass: "aspect-[3/4]", category: "Couple Portraits" },
      { id: "p6", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", caption: "Candlelit courtyard setup for evening reception", aspectRatioClass: "aspect-[16/10]", category: "Reception" },
      { id: "p7", url: "https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=800&q=80", caption: "Traditional Mehendi patterns and kaleerein", aspectRatioClass: "aspect-[2/3]", category: "Mehendi" },
      { id: "p8", url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80", caption: "Groom procession with dhol and family celebration", aspectRatioClass: "aspect-[4/3]", category: "Baraat" },
      { id: "p9", url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80", caption: "Traditional South Indian feast served on banana leaves", aspectRatioClass: "aspect-[1/1]", category: "Dining" },
    ],
    relatedStories: [
      { id: "sample-2", coupleName: "Pooja & Kabir", location: "City Palace, Jaipur", coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80", tag: "Royal Heritage Wedding" },
      { id: "sample-3", coupleName: "Meera & Siddharth", location: "Heritage Village, Goa", coverImageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80", tag: "Beachside Destination" },
      { id: "sample-4", coupleName: "Kavya & Arjun", location: "Backwater Resort, Alleppey", coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", tag: "Kerala Christian Wedding" },
    ],
  },
  "sample-2": {
    id: "sample-2",
    coupleName: "Pooja & Kabir",
    location: "City Palace, Jaipur",
    tag: "Royal Heritage Wedding",
    snippet: "An opulent royal Rajasthani celebration with folk performances, royal processions, and palace courtyards.",
    narrativeStory: [
      "Overlooking the pink rooftops of Jaipur, Pooja and Kabir’s wedding was a modern fairytale inside the historic courtyards of the City Palace.",
      "The celebrations featured antique mirrors, carved marble jharokhas dripping with tuberoses, and traditional Manganiyar folk singers welcoming guests under amber chandeliers.",
      "The Pheras took place in the central courtyard as the sun dipped behind the Aravalli hills, painting the sandstone walls in shades of burnished gold and crimson."
    ],
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    vendorCity: "Jaipur, Rajasthan",
    coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", caption: "Majestic City Palace courtyard mandap at twilight", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=800&q=80", caption: "Opulent crimson velvet lehenga with zardozi embroidery", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
      { id: "p3", url: "https://images.unsplash.com/photo-1546804784-896d0dca3805?w=800&q=80", caption: "Baraat arrival with royal vintage cars and shehnai players", aspectRatioClass: "aspect-[4/3]", category: "Baraat" },
      { id: "p4", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80", caption: "Intricate Kundan polki necklace and nath", aspectRatioClass: "aspect-[1/1]", category: "Jewelry Details" },
      { id: "p5", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", caption: "Pheras surrounded by hundreds of brass diyas", aspectRatioClass: "aspect-[3/4]", category: "Pheras" },
      { id: "p6", url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80", caption: "Palace terrace gala dinner with fireworks display", aspectRatioClass: "aspect-[16/10]", category: "Reception" },
      { id: "p7", url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", caption: "Candid emotional moment during the vidaai", aspectRatioClass: "aspect-[3/4]", category: "Vidaai" },
    ],
    relatedStories: [
      { id: "sample-1", coupleName: "Ananya & Rohan", location: "Palace Grounds, Bengaluru", coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80", tag: "South Indian Traditional" },
      { id: "sample-5", coupleName: "Ishaan & Diya", location: "The Leela, Udaipur", coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80", tag: "Lakeside Luxury Wedding" },
      { id: "sample-6", coupleName: "Nikhil & Sara", location: "Heritage Haveli, Jodhpur", coverImageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80", tag: "Rajasthani Fusion" },
    ],
  },
  "sample-3": {
    id: "sample-3",
    coupleName: "Meera & Siddharth",
    location: "Heritage Village, Goa",
    tag: "Beachside Destination",
    snippet: "A serene sunset beach ceremony filled with fairy-lit coconut groves, bohemian decor, and endless joy.",
    narrativeStory: [
      "With the sound of crashing waves in the background, Meera and Siddharth traded vows beneath a driftwood canopy draped in blush chiffon and pampas grass on the shores of South Goa.",
      "The celebrations were breezy and joyful, with guests dancing barefoot on the sand and enjoying tropical cocktails under fairy-lit coconut groves.",
      "Their reception transformed into a lively beach party with an electric live saxophonist, fire dancers, and heartfelt speeches under the starry Goan sky."
    ],
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    vendorCity: "Goa",
    coverImageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", caption: "Sunset beach canopy framed by swaying palm trees", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80", caption: "Bride in lightweight pastel floral organza lehenga", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
      { id: "p3", url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80", caption: "Romantic beach stroll at twilight", aspectRatioClass: "aspect-[4/3]", category: "Couple Portraits" },
      { id: "p4", url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", caption: "Boho macrame and tropical floral arrangements", aspectRatioClass: "aspect-[1/1]", category: "Decor Details" },
      { id: "p5", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80", caption: "Golden hour sangeet dance on the beachfront deck", aspectRatioClass: "aspect-[3/4]", category: "Sangeet" },
      { id: "p6", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", caption: "Fairy-lit canopy dinner under the palm groves", aspectRatioClass: "aspect-[16/10]", category: "Reception" },
    ],
    relatedStories: [
      { id: "sample-4", coupleName: "Kavya & Arjun", location: "Backwater Resort, Alleppey", coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", tag: "Kerala Christian Wedding" },
      { id: "sample-5", coupleName: "Ishaan & Diya", location: "The Leela, Udaipur", coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80", tag: "Lakeside Luxury Wedding" },
      { id: "sample-1", coupleName: "Ananya & Rohan", location: "Palace Grounds, Bengaluru", coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80", tag: "South Indian Traditional" },
    ],
  },
  "sample-4": {
    id: "sample-4",
    coupleName: "Kavya & Arjun",
    location: "Backwater Resort, Alleppey",
    tag: "Kerala Christian Wedding",
    snippet: "A tranquil backwater ceremony with houseboat processions and traditional sadhya feast.",
    narrativeStory: [
      "Surrounded by the serene backwaters of Alleppey, Kavya and Arjun celebrated a heartfelt union in a heritage church nestled among water lilies and coconut palms.",
      "Guests arrived aboard traditional decorated kettuvallams (houseboats), greeted by chenda melam drummers and refreshing tender coconut water.",
      "The bride looked breathtaking in an ivory lace gown with a dramatic trailing veil, complemented by the groom’s sharp navy bespoke tuxedo."
    ],
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    vendorCity: "Kochi, Kerala",
    coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", caption: "Bride in ivory lace gown on the backwater dock", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
      { id: "p2", url: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&q=80", caption: "Exchange of rings inside the heritage wooden chapel", aspectRatioClass: "aspect-[4/3]", category: "Ceremony" },
      { id: "p3", url: "https://images.unsplash.com/photo-1529636798458-92182e662485?w=800&q=80", caption: "Houseboat cruise across Vembanad lake with family", aspectRatioClass: "aspect-[16/10]", category: "Celebration" },
      { id: "p4", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80", caption: "Bridal bouquet with white orchids and baby’s breath", aspectRatioClass: "aspect-[1/1]", category: "Details" },
      { id: "p5", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", caption: "Lakeside sunset couple portraits", aspectRatioClass: "aspect-[3/4]", category: "Couple Portraits" },
    ],
    relatedStories: [
      { id: "sample-1", coupleName: "Ananya & Rohan", location: "Palace Grounds, Bengaluru", coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80", tag: "South Indian Traditional" },
      { id: "sample-3", coupleName: "Meera & Siddharth", location: "Heritage Village, Goa", coverImageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80", tag: "Beachside Destination" },
    ],
  },
  "sample-5": {
    id: "sample-5",
    coupleName: "Ishaan & Diya",
    location: "The Leela, Udaipur",
    tag: "Lakeside Luxury Wedding",
    snippet: "A three-day lakeside celebration with rooftop sangeet and a sunset lake-view mandap.",
    narrativeStory: [
      "With Lake Pichola and the City Palace as their panoramic backdrop, Ishaan and Diya hosted a dazzling three-day destination extravaganza in Udaipur.",
      "From a vibrant poolside mehendi with colorful Rajasthani turbans and puppet shows to a glittering rooftop sangeet under starry fireworks, every event was designed to perfection.",
      "The mandap was perched right at the water's edge, creating the magical illusion of floating on the shimmering lake as sacred Vedic chants filled the evening air."
    ],
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    vendorCity: "Udaipur, Rajasthan",
    coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80", caption: "Floating mandap overlooking Lake Pichola", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1509927083803-4bd519298ac4?w=800&q=80", caption: "Bride in emerald and rose gold designer lehenga", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
      { id: "p3", url: "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=800&q=80", caption: "Sangeet couple performance with pyro fountains", aspectRatioClass: "aspect-[4/3]", category: "Sangeet" },
      { id: "p4", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80", caption: "Diamond and uncut emerald bridal choker set", aspectRatioClass: "aspect-[1/1]", category: "Jewelry Details" },
      { id: "p5", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", caption: "Shikara boat ride couple portrait at sunset", aspectRatioClass: "aspect-[3/4]", category: "Couple Portraits" },
    ],
    relatedStories: [
      { id: "sample-2", coupleName: "Pooja & Kabir", location: "City Palace, Jaipur", coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80", tag: "Royal Heritage Wedding" },
      { id: "sample-6", coupleName: "Nikhil & Sara", location: "Heritage Haveli, Jodhpur", coverImageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80", tag: "Rajasthani Fusion" },
    ],
  },
  "sample-6": {
    id: "sample-6",
    coupleName: "Nikhil & Sara",
    location: "Heritage Haveli, Jodhpur",
    tag: "Rajasthani Fusion",
    snippet: "A blue-city haveli wedding blending Rajasthani rituals with a modern fusion reception.",
    narrativeStory: [
      "Nestled below the towering ramparts of Mehrangarh Fort, Nikhil and Sara’s intimate wedding brought together traditional Marwari customs and contemporary bohemian touches.",
      "The haveli courtyards were draped with indigo block-print fabrics, earthen pottery, and thousands of fragrant white mogra blossoms.",
      "Following an emotional daytime Pheras ceremony, the evening transitioned into a candlelit acoustic sufi concert with Rajasthani delicacies served under starlight."
    ],
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    vendorCity: "Jodhpur, Rajasthan",
    coverImageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80", caption: "Haveli courtyard mandap framed by blue city walls", aspectRatioClass: "aspect-[3/4]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&q=80", caption: "Bride in yellow bandhani lehenga for Haldi", aspectRatioClass: "aspect-[2/3]", category: "Haldi" },
      { id: "p3", url: "https://images.unsplash.com/photo-1519225438550-48fc97a02565?w=800&q=80", caption: "Groom entry on royal white horse with dholak players", aspectRatioClass: "aspect-[4/3]", category: "Baraat" },
      { id: "p4", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80", caption: "Traditional jharokha window couple portrait", aspectRatioClass: "aspect-[1/1]", category: "Portraits" },
      { id: "p5", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", caption: "Rooftop candlelight dinner overlooking Mehrangarh fort", aspectRatioClass: "aspect-[16/10]", category: "Reception" },
    ],
    relatedStories: [
      { id: "sample-2", coupleName: "Pooja & Kabir", location: "City Palace, Jaipur", coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80", tag: "Royal Heritage Wedding" },
      { id: "sample-5", coupleName: "Ishaan & Diya", location: "The Leela, Udaipur", coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80", tag: "Lakeside Luxury Wedding" },
    ],
  },
};

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { id } = await params;

  if (SAMPLE_DETAILS[id]) {
    const s = SAMPLE_DETAILS[id];
    return {
      title: `${s.coupleName}'s ${s.tag} in ${s.location} | Real Weddings`,
      description: s.snippet,
      openGraph: {
        title: `${s.coupleName} | Real Weddings`,
        description: s.snippet,
        images: [{ url: s.coverImageUrl }],
      },
    };
  }

  try {
    const { data: real } = await getPublicWeddingStory(id);
    const coverKey = real.album.coverMedia?.optimizedObjectKey ?? real.album.coverMedia?.originalObjectKey;
    return {
      title: `${real.coupleName}'s Wedding in ${real.location} | Real Weddings`,
      description: real.snippet,
      openGraph: {
        title: `${real.coupleName} | Real Weddings`,
        description: real.snippet,
        images: coverKey ? [{ url: getPublicMediaUrl(coverKey) }] : [],
      },
    };
  } catch {
    return {
      title: "Real Wedding Story | itsmyKalyanam",
    };
  }
}

export default async function RealWeddingDetailPage({ params }: StoryPageProps) {
  const { id } = await params;

  // 1. Check if it's one of the sample curated stories
  if (SAMPLE_DETAILS[id]) {
    return (
      <div className="min-h-screen bg-[#fafbfc]">
        <PublicTopbar />
        <StoryDetailView story={SAMPLE_DETAILS[id]} />
        <PublicFooter />
      </div>
    );
  }

  // 2. Fetch real story from database
  try {
    const { data: real } = await getPublicWeddingStory(id);

    const coverKey = real.album.coverMedia?.optimizedObjectKey ?? real.album.coverMedia?.originalObjectKey;
    const coverUrl = coverKey
      ? getPublicMediaUrl(coverKey)
      : "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80";

    const photos: StoryDetailPhoto[] = [];

    // Add cover photo first
    photos.push({
      id: "cover",
      url: coverUrl,
      caption: `${real.coupleName} wedding celebration`,
      aspectRatioClass: "aspect-[16/10]",
      category: "Cover",
    });

    // Add all album photos
    (real.album.media ?? []).forEach((m, idx) => {
      const key = m.optimizedObjectKey ?? m.originalObjectKey;
      if (key) {
        // Vary aspect ratios dynamically for Pinterest masonry
        const ratios = ["aspect-[3/4]", "aspect-[4/3]", "aspect-[2/3]", "aspect-[1/1]"];
        photos.push({
          id: m.id,
          url: getPublicMediaUrl(key),
          caption: m.altText ?? `${real.coupleName} photo ${idx + 1}`,
          aspectRatioClass: ratios[idx % ratios.length],
          category: real.tag,
        });
      }
    });

    const storyData: StoryDetailData = {
      id: real.id,
      coupleName: real.coupleName,
      location: real.location,
      tag: real.tag,
      snippet: real.snippet,
      narrativeStory: [
        real.snippet,
        `This celebration was planned and captured in ${real.location} with photography and creative coverage curated by ${real.album.vendor.businessName}.`,
      ],
      vendorName: real.album.vendor.businessName,
      vendorSlug: real.album.vendor.slug,
      vendorCity: real.album.vendor.city ?? real.location,
      coverImageUrl: coverUrl,
      photos,
      relatedStories: Object.values(SAMPLE_DETAILS).slice(0, 3).map((s) => ({
        id: s.id,
        coupleName: s.coupleName,
        location: s.location,
        coverImageUrl: s.coverImageUrl,
        tag: s.tag,
      })),
    };

    return (
      <div className="min-h-screen bg-[#fafbfc]">
        <PublicTopbar />
        <StoryDetailView story={storyData} />
        <PublicFooter />
      </div>
    );
  } catch (error) {
    console.error("Failed to load wedding story:", error);
    notFound();
  }
}
