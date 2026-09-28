import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getPublicWeddingStory } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";
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
  "sample-7": {
    id: "sample-7",
    coupleName: "Ritu & Dev",
    location: "Grand Hyatt, Mumbai",
    tag: "Punjabi Big Fat Wedding",
    snippet: "A grand celebration in Mumbai with foot-tapping dhol beats, glamorous sangeet sets, and lavish cocktail soiree.",
    narrativeStory: [
      "Ritu and Dev celebrated their union in magnificent Punjabi style at the Grand Hyatt Mumbai, surrounded by lively family traditions, high energy, and unforgettable music.",
      "The festivities kicked off with an electrifying Sangeet night featuring choreographed family performances, international live percussionists, and a grand midnight cocktail feast.",
      "The Anand Karaj the following morning was serene and prayerful, followed by an opulent reception in the grand ballroom draped with crystal chandeliers and blush roses."
    ],
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    vendorCity: "Mumbai, Maharashtra",
    coverImageUrl: "https://images.unsplash.com/photo-1545232979-fbf68fe9b1af?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1545232979-fbf68fe9b1af?w=800&q=80", caption: "Grand ballroom mandap setup with cascading crystals", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", caption: "Bridal portrait in intricately embroidered blush lehenga", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
      { id: "p3", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80", caption: "Couple entrance amidst pyro sparks and dhol beats", aspectRatioClass: "aspect-[4/3]", category: "Couple Portraits" },
    ],
    relatedStories: [
      { id: "sample-1", coupleName: "Ananya & Rohan", location: "Palace Grounds, Bengaluru", coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80", tag: "South Indian Traditional" },
      { id: "sample-8", coupleName: "Sneha & Abhiram", location: "Guruvayur Heritage, Thrissur", coverImageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", tag: "Kerala Hindu Traditional" },
    ],
  },
  "sample-8": {
    id: "sample-8",
    coupleName: "Sneha & Abhiram",
    location: "Guruvayur Heritage, Thrissur",
    tag: "Kerala Hindu Traditional",
    snippet: "An auspicious dawn wedding ceremony with traditional kasavu attire, temple gopuram backdrop, and grand vadya melam.",
    narrativeStory: [
      "Sneha and Abhiram tied the knot in the spiritual cultural heart of Kerala at Thrissur, greeted by dawn temple bells and fragrant jasmine garlands.",
      "The ceremony was steeped in timeless Kerala heritage: the bride adorned in handwoven kasavu mundu with traditional palakka and nagapadam gold ornaments, while the groom wore pristine silk.",
      "Following the thalikkettu ceremony, guests enjoyed a grand traditional 28-course Sadhya feast served on fresh banana leaves accompanied by classical instrumental melodies."
    ],
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    vendorCity: "Thrissur, Kerala",
    coverImageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80", caption: "Temple courtyard ceremony with brass nilavilakku lamps", aspectRatioClass: "aspect-[3/4]", category: "Ceremony" },
      { id: "p2", url: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&q=80", caption: "Bride in traditional kasavu attire and antique temple jewelry", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
      { id: "p3", url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", caption: "Traditional Kerala Sadhya served to wedding guests", aspectRatioClass: "aspect-[16/10]", category: "Dining" },
    ],
    relatedStories: [
      { id: "sample-4", coupleName: "Kavya & Arjun", location: "Backwater Resort, Alleppey", coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", tag: "Kerala Christian Wedding" },
      { id: "sample-7", coupleName: "Ritu & Dev", location: "Grand Hyatt, Mumbai", coverImageUrl: "https://images.unsplash.com/photo-1545232979-fbf68fe9b1af?w=600&q=80", tag: "Punjabi Big Fat Wedding" },
    ],
  },
  "sample-9": {
    id: "sample-9",
    coupleName: "Tanya & Varun",
    location: "Neemrana Fort Palace, Alwar",
    tag: "Royal Fort Wedding",
    snippet: "A medieval hill-fort wedding with tiered ramparts lit by oil torches, royal trumpeters, and timeless Rajputana majesty.",
    narrativeStory: [
      "Perched on the rugged Aravalli cliffs, Neemrana Fort Palace provided an awe-inspiring historical setting for Tanya and Varun’s royal nuptials.",
      "The fort's multi-tiered courtyards came alive with thousands of mashaal torches, folk dancers, and royal nagada drummers echoing across the valley.",
      "The couple exchanged vows on the palace rooftop under a canopy of marigolds, overlooking the ancient plains illuminated by firework displays."
    ],
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    vendorCity: "Alwar, Rajasthan",
    coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80", caption: "Torchlit fort ramparts during royal wedding reception", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", caption: "Bride in royal crimson zardozi lehenga on fort terrace", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
    ],
    relatedStories: [
      { id: "sample-2", coupleName: "Pooja & Kabir", location: "City Palace, Jaipur", coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80", tag: "Royal Heritage Wedding" },
      { id: "sample-10", coupleName: "Priyanka & Aditya", location: "Alila Diwa, Goa", coverImageUrl: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=600&q=80", tag: "Modern Minimalist Celebration" },
    ],
  },
  "sample-10": {
    id: "sample-10",
    coupleName: "Priyanka & Aditya",
    location: "Alila Diwa, Goa",
    tag: "Modern Minimalist Celebration",
    snippet: "Contemporary pastel aesthetic set amidst sprawling paddy fields, acoustic sundowners, and fairy-lit courtyard vows.",
    narrativeStory: [
      "Priyanka and Aditya opted for an intimate, design-forward celebration nestled among the tranquil paddy fields of South Goa.",
      "The aesthetic was organic and airy: bleached wood arches, dried florals, olive foliage, and warm ambient bistro lighting.",
      "An open-air sundowner cocktail turned into an intimate dance party under a starry coastal canopy."
    ],
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    vendorCity: "Goa",
    coverImageUrl: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80", caption: "Minimalist pastel floral mandap overlooking paddy fields", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=800&q=80", caption: "Bride in contemporary ivory silk lehenga", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
    ],
    relatedStories: [
      { id: "sample-3", coupleName: "Meera & Siddharth", location: "Heritage Village, Goa", coverImageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80", tag: "Beachside Destination" },
      { id: "sample-9", coupleName: "Tanya & Varun", location: "Neemrana Fort Palace, Alwar", coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80", tag: "Royal Fort Wedding" },
    ],
  },
  "sample-11": {
    id: "sample-11",
    coupleName: "Ananya & Karthik",
    location: "Chidambara Vilas, Karaikudi",
    tag: "Chettinad Heritage Wedding",
    snippet: "A heritage mansion wedding surrounded by Burmese teak pillars, Athangudi tiles, and rich Chettinad culinary feasts.",
    narrativeStory: [
      "In the storied town of Karaikudi, Ananya and Karthik’s wedding paid homage to centuries of grand merchant mansion architecture.",
      "Handmade Athangudi tile courtyards were accented with fresh banana stems, brass urlis, and fragrant tuberoses.",
      "The celebration featured classical violin duets and a banquet that showcased the world-famous culinary heritage of Chettinad."
    ],
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    vendorCity: "Karaikudi, Tamil Nadu",
    coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80", caption: "Heritage courtyard with carved teak pillars", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1546804784-896d0dca3805?w=800&q=80", caption: "Traditional Chettinad bridal portrait in pure zari silk", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
    ],
    relatedStories: [
      { id: "sample-1", coupleName: "Ananya & Rohan", location: "Palace Grounds, Bengaluru", coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80", tag: "South Indian Traditional" },
      { id: "sample-12", coupleName: "Simran & Aman", location: "ITC Grand Bharat, Gurugram", coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80", tag: "Sikh Anand Karaj" },
    ],
  },
  "sample-12": {
    id: "sample-12",
    coupleName: "Simran & Aman",
    location: "ITC Grand Bharat, Gurugram",
    tag: "Sikh Anand Karaj",
    snippet: "A spiritual morning Anand Karaj followed by an opulent black-tie reception and spectacular palace courtyard decor.",
    narrativeStory: [
      "Simran and Aman celebrated their union with a deeply moving Anand Karaj ceremony in a bespoke floral marquee followed by royal palace festivities.",
      "The bride wore an ethereal blush and mint green lehenga, while the groom was regal in an ivory sherwani with an emerald kalgi.",
      "The evening black-tie reception featured an 8-piece jazz band, an artisanal dessert pavilion, and breathtaking fireworks over the Aravali hills."
    ],
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    vendorCity: "Gurugram, Haryana",
    coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", caption: "Bespoke floral marquee for morning Anand Karaj", aspectRatioClass: "aspect-[16/10]", category: "Ceremony" },
      { id: "p2", url: "https://images.unsplash.com/photo-1509927083803-4bd519298ac4?w=800&q=80", caption: "Black-tie reception couple portrait", aspectRatioClass: "aspect-[2/3]", category: "Couple Portraits" },
    ],
    relatedStories: [
      { id: "sample-7", coupleName: "Ritu & Dev", location: "Grand Hyatt, Mumbai", coverImageUrl: "https://images.unsplash.com/photo-1545232979-fbf68fe9b1af?w=600&q=80", tag: "Punjabi Big Fat Wedding" },
      { id: "sample-11", coupleName: "Ananya & Karthik", location: "Chidambara Vilas, Karaikudi", coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80", tag: "Chettinad Heritage Wedding" },
    ],
  },
  "sample-13": {
    id: "sample-13",
    coupleName: "Devika & Ashwin",
    location: "Taj Green Cove, Kovalam",
    tag: "Kovalam Cliffside Destination",
    snippet: "Perched high above the Arabian Sea, exchanging garlands as waves crest against the rocky shoreline at sunset.",
    narrativeStory: [
      "Overlooking the boundless blue waters of Kovalam, Devika and Ashwin hosted a coastal destination wedding that captivated their guests.",
      "The mandap was set atop the dramatic granite cliff edge with waves crashing softly below as temple conch shells signaled the auspicious muhurtham.",
      "An open-air starlit reception followed with Kerala fusion barbecue, live coastal acoustic music, and lantern releases."
    ],
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    vendorCity: "Kovalam, Kerala",
    coverImageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", caption: "Cliffside mandap overlooking the Arabian Sea", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80", caption: "Sunset portraits on the Kovalam coastline", aspectRatioClass: "aspect-[2/3]", category: "Couple Portraits" },
    ],
    relatedStories: [
      { id: "sample-4", coupleName: "Kavya & Arjun", location: "Backwater Resort, Alleppey", coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", tag: "Kerala Christian Wedding" },
      { id: "sample-14", coupleName: "Radhika & Harsh", location: "Laxmi Vilas Palace, Vadodara", coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", tag: "Royal Gujarati Vivah" },
    ],
  },
  "sample-14": {
    id: "sample-14",
    coupleName: "Radhika & Harsh",
    location: "Laxmi Vilas Palace, Vadodara",
    tag: "Royal Gujarati Vivah",
    snippet: "A grand Indo-Saracenic palace wedding adorned with thousands of tuberoses, garba night festivities, and royal regalia.",
    narrativeStory: [
      "Four times the size of Buckingham Palace, Laxmi Vilas Palace provided a truly royal setting for Radhika and Harsh’s lavish Gujarati vivah.",
      "The weekend opened with a high-spirited Garba and Dandiya night under thousands of twinkling fairy lights in the sprawling gardens.",
      "The wedding ceremony was held in the royal courtyard with shehnai maestro performances and an opulent banquet of royal Kathiawadi fare."
    ],
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    vendorCity: "Vadodara, Gujarat",
    coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", caption: "Palace facade illuminated for the wedding night", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80", caption: "Bride in traditional Gujarati panetar sari", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
    ],
    relatedStories: [
      { id: "sample-2", coupleName: "Pooja & Kabir", location: "City Palace, Jaipur", coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80", tag: "Royal Heritage Wedding" },
      { id: "sample-13", coupleName: "Devika & Ashwin", location: "Taj Green Cove, Kovalam", coverImageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80", tag: "Kovalam Cliffside Destination" },
    ],
  },
  "sample-15": {
    id: "sample-15",
    coupleName: "Zoya & Farhan",
    location: "Shalimar Gardens, Srinagar",
    tag: "Regal Kashmir Garden Nikah",
    snippet: "An enchanting autumn ceremony beneath majestic Chinar trees with Kashmiri kahwa, wazwan, and pashmina accents.",
    narrativeStory: [
      "Framed by the golden leaves of century-old Chinar trees and the snow-capped Zabarwan range, Zoya and Farhan celebrated an autumn Nikah in Srinagar.",
      "The ceremony was rich in Kashmiri customs, featuring delicate walnut-wood carved shamianas, copper samovars serving saffron kahwa, and traditional Sufiana music.",
      "An elaborate 36-course royal Wazwan feast was served under silk pavilions adorned with handcrafted papier-mâché lanterns."
    ],
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    vendorCity: "Srinagar, Jammu & Kashmir",
    coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80", caption: "Autumn Mughal garden Nikah setting under Chinars", aspectRatioClass: "aspect-[16/10]", category: "Ceremony" },
      { id: "p2", url: "https://images.unsplash.com/photo-1546804784-896d0dca3805?w=800&q=80", caption: "Bride in emerald velvet tilla-embroidered pheran", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
    ],
    relatedStories: [
      { id: "sample-5", coupleName: "Ishaan & Diya", location: "The Leela, Udaipur", coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80", tag: "Lakeside Luxury Wedding" },
      { id: "sample-16", coupleName: "Nandini & Gautham", location: "Kumarakom Lake Resort, Kottayam", coverImageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80", tag: "Temple Bells & Lotus Pond" },
    ],
  },
  "sample-16": {
    id: "sample-16",
    coupleName: "Nandini & Gautham",
    location: "Kumarakom Lake Resort, Kottayam",
    tag: "Temple Bells & Lotus Pond",
    snippet: "Waterfront wooden pavilions lit by floating nilavilakkus, fragrant lotus garlands, and tranquil backwater breezes.",
    narrativeStory: [
      "At the serene Kumarakom Lake Resort on Lake Vembanad, Nandini and Gautham created a magical backwater celebration.",
      "The mandap was built over a natural lotus pond adorned with thousands of pink lotus blossoms and hanging brass bells.",
      "Sunset couple portraits on a traditional wooden boat were followed by an intimate dinner under illuminated banyan trees."
    ],
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    vendorCity: "Kottayam, Kerala",
    coverImageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80", caption: "Floating lotus pond mandap with traditional oil lamps", aspectRatioClass: "aspect-[16/10]", category: "Mandap & Decor" },
      { id: "p2", url: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&q=80", caption: "Sunset wooden boat cruise across the backwaters", aspectRatioClass: "aspect-[2/3]", category: "Couple Portraits" },
    ],
    relatedStories: [
      { id: "sample-4", coupleName: "Kavya & Arjun", location: "Backwater Resort, Alleppey", coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", tag: "Kerala Christian Wedding" },
      { id: "sample-8", coupleName: "Sneha & Abhiram", location: "Guruvayur Heritage, Thrissur", coverImageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", tag: "Kerala Hindu Traditional" },
    ],
  },
  "sample-17": {
    id: "sample-17",
    coupleName: "Rhea & Neil",
    location: "Taj Mahal Palace, Colaba, Mumbai",
    tag: "Contemporary Parsi & Western Fusion",
    snippet: "Grand ballroom celebration overlooking the Gateway of India with vintage chandeliers, jazz quartets, and bespoke fashion.",
    narrativeStory: [
      "In the iconic heritage wing of the Taj Mahal Palace Mumbai, Rhea and Neil hosted a celebration blending Parsi traditions with classic ballroom glamour.",
      "The evening began with an acoustic jazz trio playing under soaring vaulted ceilings while guests enjoyed bespoke craft cocktails.",
      "The couple shared their first dance on a chequered marble floor surrounded by cascading white orchids and soft amber candlelight."
    ],
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    vendorCity: "Mumbai, Maharashtra",
    coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80", caption: "Grand ballroom with crystal chandeliers and white florals", aspectRatioClass: "aspect-[16/10]", category: "Reception" },
      { id: "p2", url: "https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=800&q=80", caption: "Bride in embroidered vintage French chantilly lace gown", aspectRatioClass: "aspect-[2/3]", category: "Bridal Portrait" },
    ],
    relatedStories: [
      { id: "sample-7", coupleName: "Ritu & Dev", location: "Grand Hyatt, Mumbai", coverImageUrl: "https://images.unsplash.com/photo-1545232979-fbf68fe9b1af?w=600&q=80", tag: "Punjabi Big Fat Wedding" },
      { id: "sample-18", coupleName: "Divya & Vikram", location: "Wildflower Hall, Shimla", coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", tag: "Himalayan Cedar Forest Destination" },
    ],
  },
  "sample-18": {
    id: "sample-18",
    coupleName: "Divya & Vikram",
    location: "Wildflower Hall, Shimla",
    tag: "Himalayan Cedar Forest Destination",
    snippet: "A romantic fairytale framed by snow-capped peaks, pine-scented mountain air, and a glasshouse reception.",
    narrativeStory: [
      "Surrounded by cedar pine forests at 8,250 feet above sea level in Shimla, Divya and Vikram celebrated an alpine destination wedding.",
      "Guests gathered on open meadows facing the snow-capped Himalayan ranges, wrapped in warm cashmere shawls beside firepits.",
      "The reception took place inside a glasshouse conservatory filled with twinkling candles and evergreen pine garlands."
    ],
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    vendorCity: "Shimla, Himachal Pradesh",
    coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    photos: [
      { id: "p1", url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80", caption: "Glasshouse conservatory dinner in pine forest", aspectRatioClass: "aspect-[16/10]", category: "Reception" },
      { id: "p2", url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80", caption: "Couple portraits with snow-capped Himalayan backdrop", aspectRatioClass: "aspect-[2/3]", category: "Couple Portraits" },
    ],
    relatedStories: [
      { id: "sample-15", coupleName: "Zoya & Farhan", location: "Shalimar Gardens, Srinagar", coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80", tag: "Regal Kashmir Garden Nikah" },
      { id: "sample-17", coupleName: "Rhea & Neil", location: "Taj Mahal Palace, Colaba, Mumbai", coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80", tag: "Contemporary Parsi & Western Fusion" },
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
      // These are illustrative placeholder stories (fabricated couple/vendor
      // names, stock photos) shown to fill empty slots until enough real,
      // admin-curated stories exist (see app/(public)/page.tsx's
      // fillWeddingStorySlots). Never index them as real content — Google
      // (and this project's own no-fake-content rule) must never see a
      // fabricated wedding attributed to a fabricated vendor as if real.
      robots: { index: false, follow: true },
    };
  }

  let real;
  try {
    ({ data: real } = await getPublicWeddingStory(id));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const coverKey = real.album.coverMedia?.optimizedObjectKey ?? real.album.coverMedia?.originalObjectKey;
  return {
    title: `${real.coupleName}'s Wedding in ${real.location} | Real Weddings`,
    description: real.snippet,
    alternates: { canonical: `/real-weddings/${id}` },
    openGraph: {
      title: `${real.coupleName} | Real Weddings`,
      description: real.snippet,
      url: `/real-weddings/${id}`,
      images: coverKey ? [{ url: getPublicMediaUrl(coverKey) }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${real.coupleName} | Real Weddings`,
      description: real.snippet,
      images: coverKey ? [getPublicMediaUrl(coverKey)] : undefined,
    },
    robots: { index: true, follow: true },
  };
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
    const coverThumbKey = real.album.coverMedia?.thumbnailObjectKey ?? coverKey;
    const coverUrl = coverKey
      ? getPublicMediaUrl(coverKey)
      : "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80";
    const coverThumbUrl = coverThumbKey ? getPublicMediaUrl(coverThumbKey) : coverUrl;

    const photos: StoryDetailPhoto[] = [];

    // Add cover photo first
    photos.push({
      id: "cover",
      url: coverUrl,
      thumbUrl: coverThumbUrl,
      blurDataUrl: real.album.coverMedia?.blurDataUrl,
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
        const thumbKey = m.thumbnailObjectKey ?? key;
        photos.push({
          id: m.id,
          url: getPublicMediaUrl(key),
          thumbUrl: getPublicMediaUrl(thumbKey),
          blurDataUrl: m.blurDataUrl,
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
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
