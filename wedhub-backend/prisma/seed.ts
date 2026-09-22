import { PrismaClient, type AttributeDataType } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SYSTEM_PERMISSIONS: Array<{ resource: string; action: string; description: string }> = [
  { resource: "vendor", action: "read", description: "View vendor profiles" },
  { resource: "vendor", action: "create", description: "Create vendors on behalf of a business" },
  { resource: "vendor", action: "update", description: "Edit vendor profiles" },
  { resource: "vendor", action: "approve", description: "Approve pending vendor profiles" },
  { resource: "vendor", action: "suspend", description: "Suspend an approved vendor" },
  { resource: "subscription", action: "manage", description: "Manage plans and vendor subscriptions" },
  { resource: "profile", action: "read", description: "View a user's own profile" },
  { resource: "profile", action: "update", description: "Edit a user's own profile" },
  { resource: "leads", action: "read", description: "View leads" },
  { resource: "leads", action: "update", description: "Update lead status/notes" },
  { resource: "media", action: "manage", description: "Upload and manage portfolio media" },
  { resource: "favorites", action: "manage", description: "Manage favorited vendors" },
  { resource: "shortlist", action: "manage", description: "Manage shortlists" },
  { resource: "enquiry", action: "create", description: "Submit a vendor enquiry" },
];

const SYSTEM_ROLES: Array<{ name: string; description: string; permissions: "all" | string[] }> = [
  { name: "admin", description: "Full platform access", permissions: "all" },
  {
    name: "end_user",
    description: "Default role for couples using the platform",
    permissions: ["profile:read", "profile:update", "favorites:manage", "shortlist:manage", "enquiry:create"],
  },
  {
    name: "vendor",
    description: "Default role for vendor accounts",
    permissions: ["profile:read", "profile:update", "leads:read", "leads:update", "media:manage"],
  },
];

// Standalone Gallery Inspiration taxonomy (GalleryCategory model) — kept
// separate from WEDDING_CATEGORIES/Category above since INSPIRATION_PHOTO
// FeaturedMedia rows have no vendor to derive a Category from. WedMeGood's
// "Photos" mega-menu groupings.
const GALLERY_CATEGORIES: string[] = [
  "Outfit",
  "Jewellery & Accessories",
  "Mehndi",
  "Decor & Ideas",
  "Wedding Card Designs",
  "Wedding Photography",
  "Groom Wear",
  "Bridal Makeup & Hair",
];

// The 14 vendor categories from itsmykalyanam_Vendor_Onboarding_Fields.xlsx
// (Summary & Overview sheet) — replaces the earlier 20-category placeholder
// list. Category Details attributes below are transcribed field-for-field
// from each category's sheet in that workbook (2026-09-11).
const WEDDING_CATEGORIES: string[] = [
  "Photography & Videography",
  "Venues",
  "Makeup Artists",
  "Mehendi Artists",
  "Decorators",
  "Caterers",
  "Bridal Wear",
  "Groom Wear",
  "Jewellery",
  "Cakes & Desserts",
  "Artists & DJs",
  "Cocktail & Bar Services",
  "Wedding Cars & Luxury Rentals",
  "Event Planners",
  "Content Creators",
];

interface AttributeSeed {
  key: string;
  label: string;
  dataType: AttributeDataType;
  options?: string[];
  isRequired?: boolean;
  helpText?: string;
  isFilterable?: boolean;
  isComparable?: boolean;
}

const CATEGORY_ATTRIBUTES: Record<string, AttributeSeed[]> = {
  "Photography & Videography": [
    {
      key: "services_offered",
      label: "Services Offered",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Candid Photography",
        "Traditional Photography",
        "Pre/Post-Wedding Shoot",
        "Cinematic Video",
        "Traditional Video",
        "Drone Coverage",
        "Live Streaming",
        "Photo Booth",
      ],
      helpText: "Core service capabilities",
      isComparable: true,
    },
    {
      key: "photography_style_specialty",
      label: "Photography Style Specialty",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Candid / Photojournalistic", "Fine Art", "Traditional / Classic", "Editorial / Fashion"],
      helpText: "Primary visual aesthetic",
      isComparable: true,
    },
    {
      key: "standard_delivery_time_photos",
      label: "Standard Delivery Time for Photos",
      dataType: "SELECT",
      isRequired: true,
      options: ["2 Weeks", "4 Weeks", "6-8 Weeks"],
      helpText: "Expected timeline for edited photos",
      isComparable: true,
    },
    {
      key: "standard_delivery_time_video",
      label: "Standard Delivery Time for Video / Teaser",
      dataType: "SELECT",
      isRequired: true,
      options: ["1 Month", "2 Months", "3 Months"],
      helpText: "Expected timeline for film edits",
    },
    {
      key: "deliverables_included",
      label: "Deliverables Included in Standard Package",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Edited High-Res Digital Photos",
        "Printed Premium Albums",
        "Cinematic Teaser (1-3 min)",
        "Full Highlight Film (15-30 min)",
        "Raw Data / Hard Drive",
        "Reels / Short Edits",
      ],
      helpText: "What the client physically/digitally gets",
    },
    {
      key: "team_size_standard",
      label: "Number of Photographers / Videographers in Standard Team",
      dataType: "SELECT",
      isRequired: true,
      options: ["2-3 Crew", "4-6 Crew", "8+ Crew"],
      helpText: "Team size deployed for standard wedding",
      isComparable: true,
    },
    {
      key: "album_specs",
      label: "Album Page Count / Book Quality",
      dataType: "TEXT",
      helpText: "e.g., 2 Albums (40 pages each, Flush Mount/Leatherette) — album specs if provided",
    },
    {
      key: "equipment_backups",
      label: "Equipment & Backups",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Full-frame Dual Card Slot Cameras", "On-site Backup Data Management", "Spare Gear Available"],
      helpText: "Technical reliability indicators",
      isComparable: true,
    },
  ],
  Venues: [
    {
      key: "venue_type",
      label: "Venue Type",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Convention Centre", "Luxury Hotel / Resort", "Heritage Property", "Open Air Lawn / Beach", "Banquet Hall", "Auditorium"],
      helpText: "Physical style of venue",
      isFilterable: true,
      isComparable: true,
    },
    { key: "floating_guest_capacity", label: "Floating Guest Capacity", dataType: "NUMBER", isRequired: true, helpText: "Maximum total guests venue can hold at once", isComparable: true },
    { key: "seating_guest_capacity", label: "Seating Guest Capacity", dataType: "NUMBER", isRequired: true, helpText: "Maximum seated dining / auditorium capacity", isComparable: true },
    { key: "halls_spaces_count", label: "Number of Halls / Spaces Available", dataType: "TEXT", isRequired: true, helpText: "e.g., 2 Halls + 1 Lawn — count of distinct event spaces" },
    {
      key: "ac_climate_control_status",
      label: "AC / Climate Control Status",
      dataType: "SELECT",
      isRequired: true,
      options: ["Fully Air-Conditioned", "Non-AC", "Outdoor Semi-Covered"],
      helpText: "Cooling infrastructure",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "catering_policy",
      label: "Catering Policy",
      dataType: "SELECT",
      isRequired: true,
      options: ["In-house Catering Only", "External Caterers Allowed", "Both"],
      helpText: "Food catering flexibility",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "alcohol_bar_policy",
      label: "Alcohol / Bar Policy",
      dataType: "SELECT",
      isRequired: true,
      options: ["In-house Bar Only", "Corkage Allowed", "No Alcohol Allowed"],
      helpText: "Alcohol rules and liquor license state",
    },
    { key: "parking_capacity", label: "Parking Capacity (Number of Cars)", dataType: "NUMBER", isRequired: true, helpText: "On-site vehicle parking slots" },
    { key: "changing_green_rooms", label: "Complementary Changing / Green Rooms", dataType: "TEXT", isRequired: true, helpText: "e.g., 2 AC Rooms for Bride & Groom — dressing facilities provided free" },
    {
      key: "power_backup",
      label: "Power Backup / Generator",
      dataType: "SELECT",
      isRequired: true,
      options: ["100% Full Power Backup", "Limited Backup"],
      helpText: "Electricity safety during power cuts",
    },
    { key: "curfew_cutoff_time", label: "Curfew / DJ Cut-off Time", dataType: "TIME", isRequired: true, helpText: "Nighttime noise restrictions" },
    { key: "per_plate_cost_veg", label: "Per Plate Cost - Veg (INR)", dataType: "NUMBER", helpText: "Food cost per head if catering in-house" },
    { key: "per_plate_cost_non_veg", label: "Per Plate Cost - Non-Veg (INR)", dataType: "NUMBER", helpText: "Non-veg food cost per head" },
    { key: "venue_rental_fee_per_day", label: "Venue Rental Fee per Day (INR)", dataType: "NUMBER", isRequired: true, helpText: "Fixed hall/space rental charge", isComparable: true },
  ],
  "Makeup Artists": [
    {
      key: "makeup_specialization",
      label: "Makeup Specialization",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Bridal HD Makeup",
        "Airbrush Makeup",
        "Traditional South Indian Bridal",
        "Engagement / Reception Look",
        "Groom Makeup",
        "Party / Guest Makeup",
      ],
      helpText: "Core makeup techniques offered",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "service_location_flexibility",
      label: "Service Location Flexibility",
      dataType: "SELECT",
      isRequired: true,
      options: ["At Venue / Client Home Only", "At Artist Studio Only", "Both (Studio & Venue Travel)"],
      helpText: "Where makeup happens",
      isComparable: true,
    },
    { key: "brands_products_used", label: "Brands / Products Used", dataType: "TEXT", isRequired: true, helpText: "e.g., MAC, Huda Beauty, Bobbi Brown, NARS, Charlotte Tilbury, Estee Lauder — quality of makeup products used" },
    {
      key: "trial_makeup_availability",
      label: "Trial Makeup Availability",
      dataType: "SELECT",
      isRequired: true,
      options: ["Paid Trial Available", "Free Trial on Booking", "No Trial Provided"],
      helpText: "Pre-wedding makeup preview policy",
      isComparable: true,
    },
    {
      key: "hair_styling_draping_inclusions",
      label: "Includes Hair Styling & Draping?",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Hair Styling Included", "Saree / Dupatta Draping Included", "Jewellery Setting Included", "False Lashes Included"],
      helpText: "Package inclusive additions",
      isComparable: true,
    },
    { key: "family_guest_makeup_capacity", label: "Family / Guest Makeup Capacity per Event", dataType: "TEXT", isRequired: true, helpText: "e.g., Up to 5 people (with assistants) — how many extra relatives can be styled" },
    { key: "travel_outstation_charges_policy", label: "Travel / Outstation Charges Policy", dataType: "TEXTAREA", isRequired: true, helpText: "Transport rules for artist team" },
  ],
  "Mehendi Artists": [
    {
      key: "mehendi_style_specialization",
      label: "Mehendi Style Specialization",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Bridal Heavy Arabic",
        "Traditional Rajasthani",
        "Geometric / Modern Minimalist",
        "Portrait / Figure Mehendi",
        "Customized Story Lines / Elements",
      ],
      helpText: "Design styles mastered",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "henna_material_used",
      label: "Henna Material Used",
      dataType: "SELECT",
      isRequired: true,
      options: ["100% Organic / Chemical-free Homemade Cones", "Standard Commercial Cones"],
      helpText: "Safety of henna for skin",
      isComparable: true,
    },
    { key: "bridal_mehendi_package_pricing", label: "Bridal Mehendi Package Pricing (INR)", dataType: "NUMBER", isRequired: true, helpText: "Starting cost for bride's hands and feet", isComparable: true },
    { key: "guest_family_mehendi_pricing", label: "Guest / Family Mehendi Pricing (per hand/person)", dataType: "NUMBER", isRequired: true, helpText: "Rate for wedding guests", isComparable: true },
    { key: "speed_capacity_guests_per_hour", label: "Speed / Capacity (Guests per Hour)", dataType: "TEXT", isRequired: true, helpText: "e.g., 8-10 guests per artist per hour — efficiency metric for large functions" },
    { key: "minimum_order_value_outstation", label: "Minimum Order Value for Outstation / Home Visit", dataType: "NUMBER", helpText: "Threshold to travel to location" },
  ],
  Decorators: [
    {
      key: "decor_services_offered",
      label: "Decor Services Offered",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Stage & Mandap Decor",
        "Entrance Arch & Pathway",
        "Photo Booth / Backdrops",
        "Floral Setup (Real Flowers)",
        "Lighting & Ambient Effects",
        "Table & Seating Setup",
        "Haldi / Mehendi Theme Setup",
      ],
      helpText: "Decor elements provided",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "decoration_style",
      label: "Decoration Style",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Traditional South Indian (Banana leaves, Marigold, Jasmine)",
        "Modern Minimalist",
        "Royal / Palace Theme",
        "Floral Fantasy",
        "Rustic / Boho",
      ],
      helpText: "Design themes",
      isComparable: true,
    },
    {
      key: "customization_availability",
      label: "Customization Availability",
      dataType: "SELECT",
      isRequired: true,
      options: ["Fully Customizable Designs", "Pre-designed Fixed Packages Only", "Both"],
      helpText: "Ability to create bespoke mood boards",
    },
    {
      key: "real_vs_artificial_flower_usage",
      label: "Real vs Artificial Flower Usage",
      dataType: "SELECT",
      isRequired: true,
      options: ["100% Real Flowers", "100% Artificial Silk Flowers", "Hybrid Mix"],
      helpText: "Floral material policy",
      isComparable: true,
    },
    { key: "inhouse_lighting_sound_support", label: "In-house Lighting & Sound Support?", dataType: "BOOLEAN", isRequired: true, helpText: "Does decorator provide ambient/architectural lighting" },
    { key: "minimum_event_budget_handled", label: "Minimum Event Budget Handled (INR)", dataType: "NUMBER", isRequired: true, helpText: "Floor budget decorator works with", isComparable: true },
  ],
  Caterers: [
    {
      key: "catering_service_types",
      label: "Catering Service Types",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Traditional Kerala Sadya (Banana Leaf)", "Live Food Counters", "Buffet Service", "Plated Fine Dining", "High Tea & Evening Snacks"],
      helpText: "Dining execution modes",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "cuisine_specialties",
      label: "Cuisine Specialties",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Traditional Kerala (Sadya / Malabar / Christian Feast)",
        "North Indian",
        "Chinese / Pan-Asian",
        "Continental / Italian",
        "Mughlai",
      ],
      helpText: "Cuisine capabilities",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "dietary_options_offered",
      label: "Dietary Options Offered",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Pure Veg", "Non-Veg", "Jain Food", "Halal Certified", "Vegan Options"],
      helpText: "Dietary compliance",
      isFilterable: true,
      isComparable: true,
    },
    { key: "guest_count_range_handled", label: "Minimum & Maximum Guest Count Handled", dataType: "NUMBER_RANGE", isRequired: true, helpText: "Operational scale (e.g., Min: 100 guests - Max: 5000 guests)" },
    { key: "per_plate_rate_veg_sadya", label: "Per Plate Rate - Pure Veg Sadya (INR)", dataType: "NUMBER", isRequired: true, helpText: "Cost range for traditional veg feast", isComparable: true },
    { key: "per_plate_rate_non_veg", label: "Per Plate Rate - Non-Veg Menu (INR)", dataType: "NUMBER", isRequired: true, helpText: "Cost range for non-veg buffet", isComparable: true },
    {
      key: "pricing_open_to_discussion",
      label: "Pricing Is Open to Discussion",
      dataType: "BOOLEAN",
      helpText: "Turn this on if per-plate rates vary by menu/guest count and you're open to negotiating — advertises that your pricing is flexible and fully customizable.",
    },
    {
      key: "inclusions_in_per_plate_rate",
      label: "Inclusions in Per Plate Rate",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Cutlery & Crockery", "Uniformed Service Staff", "Mineral Water Bottles", "Cleaning & Waste Disposal", "Welcome Drinks"],
      helpText: "What per plate rate covers",
    },
    {
      key: "live_counters_offered",
      label: "Live Counters Offered",
      dataType: "MULTI_SELECT",
      options: ["Dosa / Appam Live", "Chat Counter", "Barbeque / Grill", "Dessert & Ice Cream Counter", "Mocktail Bar"],
      helpText: "Interactive food stalls",
    },
  ],
  "Bridal Wear": [
    {
      key: "outfit_categories_offered",
      label: "Outfit Categories Offered",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Bridal Kanchipuram Sarees", "Designer Lehengas", "Christian Wedding Gowns", "Engagement Gowns", "Anarkalis / Salwars", "Reception Sarees"],
      helpText: "Clothing items sold/rented",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "business_model",
      label: "Business Model",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Custom Tailoring / Bespoke Design", "Ready-to-Wear Retail", "Rental Outfits"],
      helpText: "Purchase options",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "customization_lead_time",
      label: "Customization Lead Time",
      dataType: "SELECT",
      isRequired: true,
      options: ["15 Days", "30 Days", "45-60 Days"],
      helpText: "Time required to stitch/embroider bespoke outfits",
    },
    {
      key: "fitting_alteration_support",
      label: "Fitting & Alteration Support",
      dataType: "SELECT",
      isRequired: true,
      options: ["In-house Alterations Provided", "Self-Alteration Required"],
      helpText: "Post-purchase fitting service",
    },
    {
      key: "appointment_policy",
      label: "Appointment Policy",
      dataType: "SELECT",
      isRequired: true,
      options: ["Prior Appointment Required", "Walk-ins Welcome"],
      helpText: "Store visit requirement",
    },
    { key: "starting_price_bridal_lehenga_gown", label: "Starting Price Range - Bridal Lehenga / Gown (INR)", dataType: "NUMBER", isRequired: true, helpText: "Base price for heavy bridal attire", isComparable: true },
    { key: "starting_price_kanchipuram_saree", label: "Starting Price Range - Kanchipuram Saree (INR)", dataType: "NUMBER", isRequired: true, helpText: "Base price for bridal silk saree", isComparable: true },
  ],
  "Groom Wear": [
    {
      key: "groom_wear_offered",
      label: "Groom Wear Offered",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Sherwanis", "Tuxedos & Suits", "Indo-Western Fusion", "Designer Kurtas & Nehru Jackets", "Traditional Kasavu Mundu & Jubba Sets"],
      helpText: "Groom outfit options",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "service_type",
      label: "Service Type",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Bespoke Custom Tailoring", "Off-the-Shelf Retail", "Rental Options"],
      helpText: "Manufacturing/sales format",
      isComparable: true,
    },
    {
      key: "accessories_available",
      label: "Accessories Available",
      dataType: "MULTI_SELECT",
      options: ["Turbans / Safas", "Pocket Squares", "Cufflinks", "Mojaris / Shoes", "Brooches & Kilangi"],
      helpText: "Complementary menswear accessories",
    },
    {
      key: "stitching_delivery_timeline",
      label: "Stitching / Delivery Timeline",
      dataType: "SELECT",
      isRequired: true,
      options: ["10 Days", "20 Days", "30 Days"],
      helpText: "Turnaround time for custom suits/sherwanis",
    },
    { key: "starting_price_suit_tuxedo", label: "Starting Price - Suit / Tuxedo (INR)", dataType: "NUMBER", isRequired: true, helpText: "Base suit price", isComparable: true },
    { key: "starting_price_sherwani_set", label: "Starting Price - Sherwani Set (INR)", dataType: "NUMBER", isRequired: true, helpText: "Base sherwani price", isComparable: true },
  ],
  Jewellery: [
    {
      key: "jewellery_categories",
      label: "Jewellery Categories",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Real Gold & Diamond Jewellery",
        "Antique / Temple Jewellery",
        "Fine Silver Jewellery",
        "Designer Imitation / Fashion Jewellery",
        "Rental Bridal Jewellery Sets",
      ],
      helpText: "Type of materials/products",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "services_provided",
      label: "Services Provided",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Custom Jewellery Design", "Ready Purchases", "Bridal Jewellery Rental", "Old Gold Exchange", "Gemstone Consultation"],
      helpText: "Business offerings",
      isComparable: true,
    },
    {
      key: "certifications_purity",
      label: "Certifications & Purity",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["100% BIS Hallmarked Gold", "IGI / GIA Certified Diamonds", "Certified Precious Stones"],
      helpText: "Quality assurance standard",
      isFilterable: true,
      isComparable: true,
    },
    { key: "rental_deposit_terms", label: "Rental Deposit & Terms", dataType: "TEXTAREA", helpText: "Rules for rented jewellery" },
    {
      key: "custom_design_lead_time",
      label: "Custom Design Lead Time",
      dataType: "SELECT",
      isRequired: true,
      options: ["3 Weeks", "4-6 Weeks"],
      helpText: "Time needed to manufacture custom gold/diamond pieces",
      isComparable: true,
    },
  ],
  "Cakes & Desserts": [
    {
      key: "specialties_offered",
      label: "Specialties Offered",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Multi-Tier Wedding Cakes", "Customized Theme Cakes", "Cupcake Towers", "Dessert Tables & Grazing Platter", "Custom Favors / Cake Boxes"],
      helpText: "Baked items list",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "flavors_dietary_customizations",
      label: "Flavors & Dietary Customizations",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Eggless Options",
        "Gluten-Free",
        "Vegan",
        "Custom Gourmet Flavors (Red Velvet, Belgian Chocolate, Salted Caramel, Lotus Biscoff, Exotic Fruit)",
      ],
      helpText: "Dietary flexibility",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "cake_tasting_session",
      label: "Cake Tasting Session",
      dataType: "SELECT",
      isRequired: true,
      options: ["Paid Tasting Box Available", "Complimentary Tasting on Booking", "No Tasting"],
      helpText: "Sampling availability",
    },
    {
      key: "delivery_venue_setup_service",
      label: "Delivery & Venue Setup Service",
      dataType: "SELECT",
      isRequired: true,
      options: ["Refrigerated Van Delivery & On-site Setup Included", "Self Pickup Only"],
      helpText: "Logistics for delicate multi-tier cakes",
    },
    {
      key: "notice_period_required",
      label: "Notice Period Required for Booking",
      dataType: "SELECT",
      isRequired: true,
      options: ["Min 7 Days", "Min 15 Days", "Min 1 Month"],
      helpText: "Advance notice for bespoke cakes",
    },
    { key: "price_per_kg_tier_starting_rate", label: "Price per KG / Tier Starting Rate (INR)", dataType: "TEXT", isRequired: true, helpText: "e.g., ₹1,200 per kg / ₹5,000 starting tier cake — costing base", isComparable: true },
  ],
  "Artists & DJs": [
    {
      key: "performance_category",
      label: "Performance Category",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Wedding DJ",
        "Live Band / Music Ensemble",
        "Chenda Melam / Traditional Percussion",
        "Saxophonist / Violinist Solo",
        "Emcee / Anchor",
        "Dance Troupe / Choreographers",
      ],
      helpText: "Entertainment type",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "music_genres_specialization",
      label: "Music Genres Specialization",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Bollywood", "EDM / Commercial", "Malayalam / Regional Hits", "Tamil / Telugu Hits", "Retro / Classic", "Hip Hop", "Fusion"],
      helpText: "Musical repertoire",
      isComparable: true,
    },
    {
      key: "sound_lighting_equipment_included",
      label: "Sound & Lighting Equipment Included?",
      dataType: "SELECT",
      isRequired: true,
      options: ["Includes Sound Console & DJ Gear", "Includes Full Sound + Stage Lights", "Performance Only (Venue must provide equipment)"],
      helpText: "Technical setup responsibilities",
      isComparable: true,
    },
    {
      key: "performance_duration_per_event",
      label: "Performance Duration per Event",
      dataType: "SELECT",
      isRequired: true,
      options: ["2 Hours", "4 Hours", "Full Event (Up to 6 Hours)"],
      helpText: "Standard performance hours",
      isComparable: true,
    },
    {
      key: "language_fluency_emcees",
      label: "Language Fluency for Emcees/Anchors",
      dataType: "MULTI_SELECT",
      options: ["Malayalam", "English", "Hindi", "Tamil"],
      helpText: "Communication languages for stage host",
    },
  ],
  "Cocktail & Bar Services": [
    {
      key: "service_type_offered",
      label: "Service Type Offered",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Professional Bartenders & Mixologists",
        "Mobile Bar Setup",
        "Flair Bartending Show",
        "Custom Signature Cocktail Menu Design",
        "Non-Alcoholic Mocktail Bar",
      ],
      helpText: "Bar services provided",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "liquor_license_support",
      label: "Liquor License Support",
      dataType: "SELECT",
      isRequired: true,
      options: ["Assists with One-day Event Liquor License", "Client Must Provide License"],
      helpText: "Legal liquor permissions support",
    },
    {
      key: "consumables_included",
      label: "Consumables Included in Package",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Fresh Mixers & Syrups", "Premium Ice & Garnishes", "Glassware & Barware", "Custom Printed Menu Cards"],
      helpText: "What caterer supplies besides alcohol",
      isComparable: true,
    },
    {
      key: "alcohol_supply_policy",
      label: "Alcohol Supply Policy",
      dataType: "SELECT",
      isRequired: true,
      options: ["Client Supplies Alcohol (Service Only)", "Full Package (Alcohol + Mixers where permitted)"],
      helpText: "Who buys the liquor",
      isComparable: true,
    },
    { key: "bartenders_per_100_guests", label: "Number of Bartenders per 100 Guests", dataType: "NUMBER", isRequired: true, helpText: "Ratio of bartenders to guests" },
  ],
  "Wedding Cars & Luxury Rentals": [
    {
      key: "fleet_categories_available",
      label: "Fleet Categories Available",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Luxury Sedans (Mercedes, BMW, Audi)",
        "Supercars / Convertible",
        "Vintage & Classic Cars",
        "SUV / Luxury Vans (Velocity, Travelers for guests)",
        "Horse Carriage / Doli",
      ],
      helpText: "Types of vehicles",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "rental_package_duration",
      label: "Rental Package Duration",
      dataType: "SELECT",
      isRequired: true,
      options: ["4 Hours", "8 Hours", "80 KM", "Full Day (24 Hours)"],
      helpText: "Billing structure",
      isComparable: true,
    },
    {
      key: "inclusions_with_vehicle",
      label: "Inclusions with Vehicle",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Uniformed Chauffeur", "Fuel Charges Included", "Basic Ribbon/Flower Decoration", "Toll & State Permits Included"],
      helpText: "What's in the hire charge",
      isComparable: true,
    },
    { key: "backup_vehicle_assurance", label: "Backup Vehicle Assurance", dataType: "BOOLEAN", isRequired: true, helpText: "Emergency vehicle replacement in case of breakdown" },
    {
      key: "outstation_intercity_travel_allowed",
      label: "Outstation / Inter-city Travel Allowed?",
      dataType: "SELECT",
      isRequired: true,
      options: ["Within City Limits Only", "State-wide Allowed", "Custom Permit Available"],
      helpText: "Geographic travel limits",
    },
  ],
  "Event Planners": [
    {
      key: "planning_scope",
      label: "Planning Scope",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Full Wedding Planning (End-to-End)",
        "Partial Planning / Consultation",
        "On-the-Day / Event Execution Management",
        "Destination Wedding Coordination",
      ],
      helpText: "Depth of involvement",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "services_covered_in_planning",
      label: "Services Covered in Planning",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Vendor Scouting & Contract Negotiation",
        "Budget Management",
        "Theme & Aesthetic Design",
        "Guest Hospitality & RSVPs",
        "Logistics & Transport",
        "Stage Management & Itinerary Execution",
        "Photography & Videography",
        "Catering",
        "Decoration",
        "Light & Sound",
        "Artists & Performers",
        "Anchors / Emcees",
        "Wedding Cars & Transport Rentals",
        "Bouquet & Floral Arrangements",
      ],
      helpText: "Specific planning duties",
      isComparable: true,
    },
    {
      key: "fee_model_billing_structure",
      label: "Fee Model / Billing Structure",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Fixed Flat Fee", "Percentage of Total Wedding Budget (e.g., 10%)", "Hybrid"],
      helpText: "How planner charges client",
      isComparable: true,
    },
    {
      key: "experience_destination_weddings",
      label: "Experience in Destination Weddings",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Kerala Backwaters/Resorts", "Goa", "Rajasthan", "International (Dubai, Thailand, etc.)"],
      helpText: "Regional expertise",
    },
    {
      key: "inhouse_vs_vendor_sourcing",
      label: "In-House vs Vendor Sourcing",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Works exclusively with preferred vendor list", "Open to client's preferred vendors"],
      helpText: "Flexibility with third-party vendors",
    },
  ],
  "Content Creators": [
    {
      key: "services_offered",
      label: "Services Offered",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Behind the Scenes (BTS) Coverage",
        "Trending Reels & Short Videos",
        "Raw Unedited Clips & Footage",
        "Live Social Media Takeover",
        "Pre-Wedding Content / Save-the-Date",
        "Bride & Groom Dedicated Coverage",
        "Guest Interviews & Reaction Reels",
        "Drone / Action Cam Coverage",
      ],
      helpText: "Core short-form content services offered",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "delivery_turnaround_time",
      label: "Delivery Turnaround Time",
      dataType: "SELECT",
      isRequired: true,
      options: ["Same Day (Within 12-24 Hours)", "Within 48 Hours", "Within 3-5 Days"],
      helpText: "How fast the final edited reels and raw clips are delivered",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "edited_reels_count",
      label: "Number of Edited Reels Included",
      dataType: "SELECT",
      isRequired: true,
      options: ["2-3 Reels", "4-6 Reels", "7-10 Reels", "10+ Reels / Unlimited"],
      helpText: "Number of polished, trend-synced reels delivered in standard package",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "deliverables_included",
      label: "Deliverables Included",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "All Raw Videos & Photos (AirDrop / Google Drive)",
        "Edited 9:16 Vertical Reels",
        "Curated Instagram Stories & Highlights",
        "Trending Audio & Transition Edits",
        "High-Res Vertical Photos / Stills",
      ],
      helpText: "What the couple receives after the wedding",
      isComparable: true,
    },
    {
      key: "shooting_equipment",
      label: "Primary Shooting Gear",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: [
        "Latest iPhone Pro (4K 60fps HDR)",
        "Gimbal & Handheld Stabilizers",
        "Wireless Lav Microphones (Clear Audio)",
        "Compact On-Camera / Portable Lighting",
        "Pocket Action Cam (DJI / Insta360 / GoPro)",
      ],
      helpText: "Mobile equipment used for capturing seamless mobile content",
      isComparable: true,
    },
    {
      key: "coverage_duration",
      label: "Coverage Duration",
      dataType: "SELECT",
      isRequired: true,
      options: ["Single Event / Half Day (Up to 5 Hours)", "Full Day (8-10 Hours)", "Multi-Day Wedding Coverage"],
      helpText: "Time duration the creator is present on-site",
      isFilterable: true,
      isComparable: true,
    },
    {
      key: "team_size",
      label: "Team Size",
      dataType: "SELECT",
      isRequired: true,
      options: ["Solo Creator (1 Person)", "Duo Creators (2 Persons)", "Creator + Assistant"],
      helpText: "Number of creators assigned on the event day",
      isComparable: true,
    },
    {
      key: "travel_policy",
      label: "Travel Policy",
      dataType: "SELECT",
      isRequired: true,
      options: [
        "Available Across Kerala (Travel & Stay Extra)",
        "Kerala-Wide (Included in Package)",
        "Pan-India & Destination Weddings Available",
        "Local City Only",
      ],
      helpText: "Travel terms for outstation bookings",
      isFilterable: true,
    },
    {
      key: "social_media_takeover",
      label: "Live Social Media Takeover Available",
      dataType: "SELECT",
      isRequired: true,
      options: ["Yes - Live Posting to Couple's Instagram", "No - All Content Delivered to Couple Directly", "Optional Add-on"],
      helpText: "Whether the creator can post directly from your handles during the wedding",
      isFilterable: true,
    },
    {
      key: "starting_price_inr",
      label: "Starting Package Price (INR)",
      dataType: "NUMBER",
      isRequired: true,
      helpText: "Starting package rate in Indian Rupees",
      isComparable: true,
    },
  ],
};

// Homepage carousel/bento-grid curation — same 7 categories the frontend's
// hardcoded design previously used, now real admin-editable data (see
// Category.isFeaturedOnHomepage/imageUrl/startingPriceLabel, added
// 2026-09-03; frontenddocs/10-risks-and-open-questions.md Open Question
// 21). imageUrl points at the bundled local design assets that ship with
// wedhub-frontend-app/public/images/capsules/ — an admin can override any
// of these via the category admin UI at any time.
//
// Image perf pass (2026-09-19): these were originally ~900KB-1.2MB JPEGs
// rendered into a 165x245px carousel tile (CategoryCapsuleCarousel.tsx) —
// re-exported as ~500px-wide WebP at quality 82 (same quality bar as the
// R2 media pipeline's own variants), ~90% smaller with no visible quality
// loss at this render size. The original .jpg files are intentionally kept
// in wedhub-frontend-app/public/ (not deleted) since a production
// Category row seeded before this change may still have the old .jpg URL
// persisted — re-run `npm run db:seed` (or update these 7 rows via the
// admin UI) to pick up the smaller .webp URLs on an already-seeded database.
const HOMEPAGE_FEATURED_CATEGORIES: Array<{ name: string; imageUrl: string; startingPriceLabel: string; sortOrder: number }> = [
  { name: "Photography & Videography", imageUrl: "/images/capsules/photo.webp", startingPriceLabel: "₹ 50,000", sortOrder: 0 },
  { name: "Venues", imageUrl: "/images/capsules/venue.webp", startingPriceLabel: "₹ 1,50,000", sortOrder: 1 },
  { name: "Makeup Artists", imageUrl: "/images/capsules/makeup.webp", startingPriceLabel: "₹ 18,000", sortOrder: 2 },
  { name: "Mehendi Artists", imageUrl: "/images/capsules/mehndi.webp", startingPriceLabel: "₹ 8,000", sortOrder: 3 },
  { name: "Decorators", imageUrl: "/images/capsules/decor.webp", startingPriceLabel: "₹ 75,000", sortOrder: 4 },
  { name: "Bridal Wear", imageUrl: "/images/capsules/wear.webp", startingPriceLabel: "₹ 45,000", sortOrder: 5 },
  { name: "Caterers", imageUrl: "/images/capsules/catering.webp", startingPriceLabel: "₹ 800 / plate", sortOrder: 6 },
];

// Homepage "Popular Searches" strip (PopularSearchCard model) — ships with
// zero seeded rows by default (see this model's own schema comment); these
// 4 give a fresh environment real homepage content instead of an empty
// section immediately after seeding. searchQuery values are real category
// names so they resolve through search.repository.ts's keyword ->
// resolveKeywordCategoryIds() trigram match, i.e. clicking a card actually
// returns filtered results, not an empty search page. locationBlurb/
// priceLabel reflect this platform's actual Kerala-only scope (see
// INDIA_STATES below — no other state is seeded), unlike the original
// hardcoded homepage placeholder array this replaces (which named
// Bengaluru/Delhi/Mumbai/Goa/Jaipur — none of them real for this
// marketplace). Images reuse the same Unsplash-placeholder pattern already
// used by GalleryInspiration.tsx's SAMPLE_COVER_IMAGES for
// admin-uploadable content with no default asset yet.
interface PopularSearchCardSeed {
  title: string;
  locationBlurb: string;
  priceLabel: string;
  imageUrl: string;
  searchQuery: string;
  sortOrder: number;
}

const POPULAR_SEARCH_CARDS: PopularSearchCardSeed[] = [
  {
    title: "Banquet Halls & Wedding Venues",
    locationBlurb: "Kochi, Thiruvananthapuram, Kozhikode & more",
    priceLabel: "₹ 800 per plate onwards",
    imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=500&q=80",
    searchQuery: "Venues",
    sortOrder: 0,
  },
  {
    title: "Kerala Backwater Resorts for Destination Weddings",
    locationBlurb: "Alleppey, Kumarakom & the Kerala backwaters",
    priceLabel: "₹ 1,50,000 per day onwards",
    imageUrl: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=500&q=80",
    searchQuery: "Venues",
    sortOrder: 1,
  },
  {
    title: "Candid Wedding Photographers",
    locationBlurb: "Top-rated photography & videography teams",
    priceLabel: "₹ 50,000 onwards",
    imageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=500&q=80",
    searchQuery: "Photography & Videography",
    sortOrder: 2,
  },
  {
    title: "Bridal Makeup Artists",
    locationBlurb: "HD & airbrush specialists across Kerala",
    priceLabel: "₹ 18,000 onwards",
    imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=500&q=80",
    searchQuery: "Makeup Artists",
    sortOrder: 3,
  },
];

// /blog list + homepage "Latest from the Blog" (BlogPost model) — same
// ships-empty-by-default situation as PopularSearchCard above. slug is
// computed here with the same slugify() this file already uses elsewhere
// (blog.service.ts does this at request time via generateUniqueSlug, but a
// seed script writes directly through Prisma, bypassing that service
// layer, so it has to be precomputed). publishedAt is set (not null) so
// these are immediately live, matching isFeatured: true so they surface on
// the homepage without needing a separate admin publish step after seeding.
interface BlogPostSeed {
  title: string;
  category: string;
  excerpt: string;
  bodyMarkdown: string;
  readTimeMinutes: number;
  coverImageUrl: string;
  sortOrder: number;
}

const BLOG_POSTS: BlogPostSeed[] = [
  {
    title: "The Ultimate Kerala Wedding Planning Checklist & Timeline",
    category: "Wedding Planning",
    excerpt:
      "From booking your venue a year out to confirming the sadhya headcount the week before — a month-by-month checklist for planning a Kerala wedding without the last-minute scramble.",
    bodyMarkdown: `# The Ultimate Kerala Wedding Planning Checklist & Timeline

Planning a wedding in Kerala means juggling venue bookings, catering headcounts, and family traditions across several months. Here's a realistic month-by-month timeline to keep everything on track.

## 12 Months Before

- Set your budget and guest list
- Shortlist and book your venue — banquet halls and backwater resorts get booked out fastest during the November–February wedding season
- Book your photographer and videographer

## 6-8 Months Before

- Finalize your catering partner and sadhya menu
- Book your mehendi and makeup artists
- Start shortlisting outfits — Kanjeevaram and Kasavu sarees, sherwanis, and mundu sets often need custom tailoring lead time

## 3 Months Before

- Send invitations
- Confirm decor and florist bookings
- Finalize the day-of schedule with your event planner or coordinator

## 1 Month Before

- Confirm final guest count with your caterer
- Do a final fitting for all outfits
- Confirm transport and accommodation for out-of-town guests

## Week Of

- Reconfirm every vendor's arrival time
- Delegate a point-of-contact for each vendor so you're not fielding calls on the day
- Take a breath — the planning is done, now it's time to enjoy it

Wherever you are in your planning journey, itsmyKalyanam's verified vendor directory can help you find and compare venues, photographers, caterers, and more, all in one place.`,
    readTimeMinutes: 8,
    coverImageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80",
    sortOrder: 0,
  },
  {
    title: "Top Trending Bridal Looks for Kerala Weddings This Season",
    category: "Bridal Fashion",
    excerpt:
      "From the timeless Kasavu saree to contemporary pastel lehengas — the bridal looks Kerala brides are choosing this wedding season, and how to pick what suits your ceremony.",
    bodyMarkdown: `# Top Trending Bridal Looks for Kerala Weddings This Season

Kerala weddings blend deep-rooted tradition with evolving bridal fashion. Here's what's trending this season across the state's most-loved wedding styles.

## The Classic Kasavu Saree, Reimagined

The off-white and gold Kasavu saree remains a staple for Kerala Hindu weddings, but this season brides are pairing it with statement temple jewellery and contemporary blouse cuts for a fresh silhouette.

## Kanjeevaram Silks in Jewel Tones

For the reception, many brides are moving beyond traditional red toward deep emerald, sapphire blue, and wine Kanjeevaram silks — still rich with zari work, but a distinct look from the ceremony saree.

## Pastel Lehengas for Christian and Fusion Weddings

Kerala's Christian weddings and fusion celebrations are seeing a rise in pastel and blush lehengas, often paired with lightweight dupattas suited to the coastal humidity.

## Minimalist Gold Jewellery

Layered necklaces are giving way to a single statement piece paired with simpler earrings — a shift toward comfort for long ceremony days.

Browse verified bridal wear boutiques and makeup artists across Kerala on itsmyKalyanam to find the look that's right for your wedding.`,
    readTimeMinutes: 5,
    coverImageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80",
    sortOrder: 1,
  },
  {
    title: "10 Stunning Backwater Wedding Venues in Kerala",
    category: "Venues",
    excerpt:
      "Houseboats, lakeside resorts, and heritage properties along Kerala's backwaters — venue ideas for couples dreaming of a destination wedding closer to home.",
    bodyMarkdown: `# 10 Stunning Backwater Wedding Venues in Kerala

Kerala's backwaters offer some of the most photogenic wedding backdrops in India — without the logistics of a true destination wedding abroad. Here's what to look for when shortlisting a backwater venue.

## Alleppey: The Classic Choice

Alleppey's canal-side resorts and houseboat operators are the most established backwater wedding option, with venues used to hosting large Kerala wedding parties.

## Kumarakom: Quiet Luxury

Kumarakom's lake-facing resorts lean upscale, ideal for couples wanting a smaller, more intimate guest list with premium accommodation on-site.

## What to Ask Before Booking

- Can the venue accommodate your full guest list for both the ceremony and the sadhya?
- Is there covered space in case of monsoon-season rain?
- Does the venue have empanelled caterers, or can you bring your own?
- What's included in accommodation for out-of-town guests?

## Book Early

Backwater venues are booked heavily during the November–February peak season — start shortlisting at least 10-12 months ahead if you have your heart set on a specific property.

Compare verified backwater and resort venues across Kerala on itsmyKalyanam, with real pricing and photos from past weddings.`,
    readTimeMinutes: 6,
    coverImageUrl: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80",
    sortOrder: 2,
  },
  {
    title: "Planning a Sadhya: A Guide to Traditional Kerala Wedding Catering",
    category: "Food & Catering",
    excerpt:
      "What goes into a traditional Kerala wedding sadhya, how caterers price per plate, and the questions to ask before you finalize your wedding menu.",
    bodyMarkdown: `# Planning a Sadhya: A Guide to Traditional Kerala Wedding Catering

The sadhya — a traditional vegetarian feast served on a banana leaf — is central to most Kerala weddings. Here's what couples should know before booking a caterer.

## What's In a Traditional Sadhya

A full sadhya typically includes rice, sambar, rasam, avial, thoran, pachadi, pickles, papadam, and payasam for dessert, served in a specific order on a banana leaf. Most caterers offer this as a fixed package, with add-ons for non-vegetarian dishes served separately for weddings that include them.

## How Pricing Works

Caterers generally price per plate, with the rate depending on the number of dishes included, whether it's a full sadhya or a lighter menu, and guest count — larger weddings often get a better per-plate rate.

## Questions to Ask Your Caterer

- Is the quoted price per plate all-inclusive, or are certain dishes extra?
- Can they accommodate a final headcount change close to the wedding date?
- Do they provide serving staff, or is that a separate booking?
- Can you request a tasting session before confirming?

## Don't Forget the Reception Menu

Many couples now pair a traditional sadhya at the main ceremony with a more contemporary buffet or live counters at the reception — worth budgeting for both if that's the plan.

Find and compare verified caterers across Kerala, with real pricing per plate, on itsmyKalyanam.`,
    readTimeMinutes: 6,
    coverImageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    sortOrder: 3,
  },
];

interface LocationSeed {
  name: string;
  cities?: string[];
}

// Kerala-only, all 14 districts — this platform currently operates only in
// Kerala, so no other state/city data is seeded (confirmed with the user
// 2026-09-06).
const INDIA_STATES: LocationSeed[] = [
  {
    name: "Kerala",
    cities: [
      "Thiruvananthapuram",
      "Kollam",
      "Pathanamthitta",
      "Alappuzha",
      "Kottayam",
      "Idukki",
      "Ernakulam",
      "Thrissur",
      "Palakkad",
      "Malappuram",
      "Kozhikode",
      "Wayanad",
      "Kannur",
      "Kasaragod",
    ],
  },
];

export async function seedCategories(): Promise<void> {
  for (const [index, name] of WEDDING_CATEGORIES.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name, sortOrder: index },
      create: { name, slug: slugify(name), sortOrder: index },
    });

    const attributes = CATEGORY_ATTRIBUTES[name] ?? [];
    for (const [attrIndex, attr] of attributes.entries()) {
      await prisma.categoryAttribute.upsert({
        where: { categoryId_key: { categoryId: category.id, key: attr.key } },
        update: {
          label: attr.label,
          dataType: attr.dataType,
          options: attr.options,
          isFilterable: attr.isFilterable ?? false,
          isComparable: attr.isComparable ?? false,
          isRequired: attr.isRequired ?? false,
          helpText: attr.helpText,
          sortOrder: attrIndex,
        },
        create: {
          categoryId: category.id,
          key: attr.key,
          label: attr.label,
          dataType: attr.dataType,
          options: attr.options,
          isFilterable: attr.isFilterable ?? false,
          isComparable: attr.isComparable ?? false,
          isRequired: attr.isRequired ?? false,
          helpText: attr.helpText,
          sortOrder: attrIndex,
        },
      });
    }
  }

  console.info(`Seeded ${WEDDING_CATEGORIES.length} categories.`);
}

async function seedGalleryCategories(): Promise<void> {
  for (const [index, name] of GALLERY_CATEGORIES.entries()) {
    await prisma.galleryCategory.upsert({
      where: { slug: slugify(name) },
      update: { name, sortOrder: index },
      create: { name, slug: slugify(name), sortOrder: index },
    });
  }

  console.info(`Seeded ${GALLERY_CATEGORIES.length} gallery categories.`);
}

export async function seedHomepageFeaturedCategories(): Promise<void> {
  for (const featured of HOMEPAGE_FEATURED_CATEGORIES) {
    const category = await prisma.category.findUnique({ where: { slug: slugify(featured.name) } });
    if (!category) continue;

    await prisma.category.update({
      where: { id: category.id },
      data: {
        isFeaturedOnHomepage: true,
        imageUrl: featured.imageUrl,
        startingPriceLabel: featured.startingPriceLabel,
        homepageSortOrder: featured.sortOrder,
      },
    });
  }

  console.info(`Marked ${HOMEPAGE_FEATURED_CATEGORIES.length} categories as featured on homepage.`);
}

export async function seedPopularSearchCards(): Promise<void> {
  // No unique column exists on this model besides id (see schema.prisma) —
  // searchQuery isn't unique either (two cards legitimately share one, e.g.
  // both backwater-resort cards above search "Venues"), so title is the
  // only field that's actually distinct per row here and the natural
  // idempotency key: re-running this script updates the same 4 rows
  // in place instead of creating duplicates.
  for (const card of POPULAR_SEARCH_CARDS) {
    const existing = await prisma.popularSearchCard.findFirst({ where: { title: card.title } });
    const data = {
      locationBlurb: card.locationBlurb,
      priceLabel: card.priceLabel,
      imageUrl: card.imageUrl,
      searchQuery: card.searchQuery,
      isFeatured: true,
      sortOrder: card.sortOrder,
    };

    if (existing) {
      await prisma.popularSearchCard.update({ where: { id: existing.id }, data });
    } else {
      await prisma.popularSearchCard.create({ data: { title: card.title, ...data } });
    }
  }

  console.info(`Seeded ${POPULAR_SEARCH_CARDS.length} popular search cards.`);
}

export async function seedBlogPosts(): Promise<void> {
  for (const post of BLOG_POSTS) {
    const slug = slugify(post.title);
    await prisma.blogPost.upsert({
      where: { slug },
      update: {
        title: post.title,
        category: post.category,
        coverImageUrl: post.coverImageUrl,
        excerpt: post.excerpt,
        bodyMarkdown: post.bodyMarkdown,
        readTimeMinutes: post.readTimeMinutes,
        isFeatured: true,
        sortOrder: post.sortOrder,
      },
      create: {
        title: post.title,
        slug,
        category: post.category,
        coverImageUrl: post.coverImageUrl,
        excerpt: post.excerpt,
        bodyMarkdown: post.bodyMarkdown,
        readTimeMinutes: post.readTimeMinutes,
        // Set (not null) so these are immediately public — see this
        // array's own comment on why, and BlogPost.publishedAt's schema
        // comment on null-vs-set doubling as the draft/published flag.
        publishedAt: new Date(),
        isFeatured: true,
        sortOrder: post.sortOrder,
      },
    });
  }

  console.info(`Seeded ${BLOG_POSTS.length} blog posts.`);
}

export async function seedLocations(): Promise<void> {
  // Prisma's compound-unique `where` clause rejects a literal `null` for parentId,
  // even though the underlying Postgres unique index treats it correctly — so the
  // one top-level (parent-less) row uses findFirst + conditional create instead of upsert.
  const indiaSlug = slugify("India");
  let india = await prisma.location.findFirst({ where: { parentId: null, slug: indiaSlug } });
  if (!india) {
    india = await prisma.location.create({ data: { type: "COUNTRY", name: "India", slug: indiaSlug } });
  }

  let cityCount = 0;

  for (const state of INDIA_STATES) {
    const stateRecord = await prisma.location.upsert({
      where: { parentId_slug: { parentId: india.id, slug: slugify(state.name) } },
      update: {},
      create: { type: "STATE", name: state.name, slug: slugify(state.name), parentId: india.id },
    });

    for (const cityName of state.cities ?? []) {
      await prisma.location.upsert({
        where: { parentId_slug: { parentId: stateRecord.id, slug: slugify(cityName) } },
        update: {},
        create: { type: "CITY", name: cityName, slug: slugify(cityName), parentId: stateRecord.id },
      });
      cityCount += 1;
    }
  }

  console.info(`Seeded India, ${INDIA_STATES.length} states, and ${cityCount} cities.`);
}

// Dynamic-plans redesign (2026-09-22, see
// PLAN-2026-09-22-dynamic-plans-and-feature-registry.md) — plans are fully
// admin-created via /admin/plans; this is starting data, not a fixed set.
// `slug` is the upsert key (replacing the old tier+interval compound key —
// tier no longer has to be unique per plan). Exactly one plan should carry
// isDefault: true — the fallback for a vendor with no Subscription row, and
// where a cancelled/expired vendor lands. Feature keys here must match
// entitlement.constants.ts's FEATURE_CATALOG.
interface PlanSeed {
  slug: string;
  billingInterval: "MONTHLY" | "YEARLY";
  name: string;
  price: number;
  trialDays: number;
  isDefault: boolean;
  sortOrder: number;
  limits: Record<string, number>;
  features: Record<string, unknown>;
}

// 2-plan Free/Premium structure (confirmed 2026-09-22 — Pro and both YEARLY
// variants were deliberately removed from test and production; this source
// list is create-only per seedSubscriptionPlans below, so leaving the old
// pro/pro-yearly/premium-yearly entries here would silently recreate them on
// any environment where they'd been deleted, on the next deploy/seed run).
const SUBSCRIPTION_PLANS: PlanSeed[] = [
  {
    slug: "free",
    billingInterval: "MONTHLY",
    name: "Free",
    price: 0,
    trialDays: 0,
    isDefault: true,
    sortOrder: 1,
    limits: { portfolio_limit: 10, video_limit: 1, monthly_lead_limit: 0 },
    features: {
      analytics_level: false,
      featured_eligibility: false,
      store_access: false,
      invoicing_access: false,
      portfolio_page_access: false,
    },
  },
  {
    slug: "premium",
    billingInterval: "MONTHLY",
    name: "Premium",
    price: 12999,
    trialDays: 14,
    isDefault: false,
    sortOrder: 2,
    limits: { portfolio_limit: 500, video_limit: 50, monthly_lead_limit: 0 },
    features: {
      analytics_level: true,
      featured_eligibility: true,
      store_access: true,
      invoicing_access: true,
      portfolio_page_access: true,
    },
  },
];

// CREATE-ONLY, never UPDATE an existing plan. Plans are admin-owned data
// post-launch (PLAN-2026-09-22-dynamic-plans-and-feature-registry.md) — an
// admin editing price/limits/features/name through PlanFormModal must never
// have that edit silently reverted by the next deploy's seed run. This
// function only fills in a plan that doesn't exist yet (a fresh database, or
// a plan slug an admin genuinely never created) — it never touches a plan
// that's already there, no matter how its fields differ from SUBSCRIPTION_PLANS
// below. This is what makes it safe to run on every deploy (see deploy.sh).
async function seedSubscriptionPlans(): Promise<void> {
  const existingSlugs = new Set((await prisma.subscriptionPlan.findMany({ select: { slug: true } })).map((p) => p.slug));
  let createdCount = 0;

  for (const plan of SUBSCRIPTION_PLANS) {
    if (existingSlugs.has(plan.slug)) continue;
    await prisma.subscriptionPlan.create({
      data: {
        slug: plan.slug,
        billingInterval: plan.billingInterval,
        name: plan.name,
        price: plan.price,
        currency: "INR",
        trialDays: plan.trialDays,
        isDefault: plan.isDefault,
        sortOrder: plan.sortOrder,
        limits: plan.limits,
        features: plan.features,
      },
    });
    createdCount += 1;
  }

  // Ensures a default exists on a truly fresh database only — never moves
  // the default off whatever plan an admin has since set, and never runs at
  // all once any plan is flagged isDefault (which will always be true after
  // the very first seed on a given database).
  const anyDefault = await prisma.subscriptionPlan.findFirst({ where: { isDefault: true } });
  if (!anyDefault) {
    const freePlan = SUBSCRIPTION_PLANS.find((p) => p.isDefault);
    if (freePlan) {
      await prisma.subscriptionPlan.update({ where: { slug: freePlan.slug }, data: { isDefault: true } });
    }
  }

  console.info(`Subscription plans: ${createdCount} created, ${SUBSCRIPTION_PLANS.length - createdCount} already existed (left untouched).`);
}

export async function seedPermissionsAndRoles(): Promise<void> {
  const permissionRecords = await Promise.all(
    SYSTEM_PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { resource_action: { resource: p.resource, action: p.action } },
        update: { description: p.description },
        create: p,
      }),
    ),
  );

  const permissionsByKey = new Map(permissionRecords.map((p) => [`${p.resource}:${p.action}`, p]));

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description, isSystem: true },
      create: { name: roleDef.name, description: roleDef.description, isSystem: true },
    });

    const grantedPermissions =
      roleDef.permissions === "all"
        ? permissionRecords
        : roleDef.permissions.map((key) => {
            const permission = permissionsByKey.get(key);
            if (!permission) {
              throw new Error(`Seed error: unknown permission key "${key}" for role "${roleDef.name}"`);
            }
            return permission;
          });

    await Promise.all(
      grantedPermissions.map((permission) =>
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        }),
      ),
    );
  }

  console.info(`Seeded ${permissionRecords.length} permissions and ${SYSTEM_ROLES.length} roles.`);
}

async function main(): Promise<void> {
  await seedPermissionsAndRoles();
  await seedCategories();
  await seedGalleryCategories();
  await seedHomepageFeaturedCategories();
  await seedLocations();
  await seedSubscriptionPlans();
  await seedPopularSearchCards();
  await seedBlogPosts();
}

// Only auto-run when executed directly (`npx tsx prisma/seed.ts` or `prisma
// db seed`) — NOT when another script imports this module's exported
// functions (e.g. seed-permissions-and-locations.ts), which would otherwise
// trigger this full seed as an unwanted side effect of the import itself.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
