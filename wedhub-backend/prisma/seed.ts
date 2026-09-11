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
    },
    {
      key: "photography_style_specialty",
      label: "Photography Style Specialty",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Candid / Photojournalistic", "Fine Art", "Traditional / Classic", "Editorial / Fashion"],
      helpText: "Primary visual aesthetic",
    },
    {
      key: "standard_delivery_time_photos",
      label: "Standard Delivery Time for Photos",
      dataType: "SELECT",
      isRequired: true,
      options: ["2 Weeks", "4 Weeks", "6-8 Weeks"],
      helpText: "Expected timeline for edited photos",
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
    },
    {
      key: "catering_policy",
      label: "Catering Policy",
      dataType: "SELECT",
      isRequired: true,
      options: ["In-house Catering Only", "External Caterers Allowed", "Both"],
      helpText: "Food catering flexibility",
      isFilterable: true,
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
    },
    {
      key: "service_location_flexibility",
      label: "Service Location Flexibility",
      dataType: "SELECT",
      isRequired: true,
      options: ["At Venue / Client Home Only", "At Artist Studio Only", "Both (Studio & Venue Travel)"],
      helpText: "Where makeup happens",
    },
    { key: "brands_products_used", label: "Brands / Products Used", dataType: "TEXT", isRequired: true, helpText: "e.g., MAC, Huda Beauty, Bobbi Brown, NARS, Charlotte Tilbury, Estee Lauder — quality of makeup products used" },
    {
      key: "trial_makeup_availability",
      label: "Trial Makeup Availability",
      dataType: "SELECT",
      isRequired: true,
      options: ["Paid Trial Available", "Free Trial on Booking", "No Trial Provided"],
      helpText: "Pre-wedding makeup preview policy",
    },
    {
      key: "hair_styling_draping_inclusions",
      label: "Includes Hair Styling & Draping?",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Hair Styling Included", "Saree / Dupatta Draping Included", "Jewellery Setting Included", "False Lashes Included"],
      helpText: "Package inclusive additions",
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
    },
    {
      key: "henna_material_used",
      label: "Henna Material Used",
      dataType: "SELECT",
      isRequired: true,
      options: ["100% Organic / Chemical-free Homemade Cones", "Standard Commercial Cones"],
      helpText: "Safety of henna for skin",
    },
    { key: "bridal_mehendi_package_pricing", label: "Bridal Mehendi Package Pricing (INR)", dataType: "NUMBER", isRequired: true, helpText: "Starting cost for bride's hands and feet" },
    { key: "guest_family_mehendi_pricing", label: "Guest / Family Mehendi Pricing (per hand/person)", dataType: "NUMBER", isRequired: true, helpText: "Rate for wedding guests" },
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
    },
    { key: "inhouse_lighting_sound_support", label: "In-house Lighting & Sound Support?", dataType: "BOOLEAN", isRequired: true, helpText: "Does decorator provide ambient/architectural lighting" },
    { key: "minimum_event_budget_handled", label: "Minimum Event Budget Handled (INR)", dataType: "NUMBER", isRequired: true, helpText: "Floor budget decorator works with" },
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
    },
    {
      key: "dietary_options_offered",
      label: "Dietary Options Offered",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Pure Veg", "Non-Veg", "Jain Food", "Halal Certified", "Vegan Options"],
      helpText: "Dietary compliance",
      isFilterable: true,
    },
    { key: "guest_count_range_handled", label: "Minimum & Maximum Guest Count Handled", dataType: "NUMBER_RANGE", isRequired: true, helpText: "Operational scale (e.g., Min: 100 guests - Max: 5000 guests)" },
    { key: "per_plate_rate_veg_sadya", label: "Per Plate Rate - Pure Veg Sadya (INR)", dataType: "NUMBER", isRequired: true, helpText: "Cost range for traditional veg feast", isComparable: true },
    { key: "per_plate_rate_non_veg", label: "Per Plate Rate - Non-Veg Menu (INR)", dataType: "NUMBER", isRequired: true, helpText: "Cost range for non-veg buffet", isComparable: true },
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
    },
    {
      key: "business_model",
      label: "Business Model",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Custom Tailoring / Bespoke Design", "Ready-to-Wear Retail", "Rental Outfits"],
      helpText: "Purchase options",
      isFilterable: true,
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
    },
    {
      key: "service_type",
      label: "Service Type",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Bespoke Custom Tailoring", "Off-the-Shelf Retail", "Rental Options"],
      helpText: "Manufacturing/sales format",
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
    },
    {
      key: "services_provided",
      label: "Services Provided",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Custom Jewellery Design", "Ready Purchases", "Bridal Jewellery Rental", "Old Gold Exchange", "Gemstone Consultation"],
      helpText: "Business offerings",
    },
    {
      key: "certifications_purity",
      label: "Certifications & Purity",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["100% BIS Hallmarked Gold", "IGI / GIA Certified Diamonds", "Certified Precious Stones"],
      helpText: "Quality assurance standard",
      isFilterable: true,
    },
    { key: "rental_deposit_terms", label: "Rental Deposit & Terms", dataType: "TEXTAREA", helpText: "Rules for rented jewellery" },
    {
      key: "custom_design_lead_time",
      label: "Custom Design Lead Time",
      dataType: "SELECT",
      isRequired: true,
      options: ["3 Weeks", "4-6 Weeks"],
      helpText: "Time needed to manufacture custom gold/diamond pieces",
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
    { key: "price_per_kg_tier_starting_rate", label: "Price per KG / Tier Starting Rate (INR)", dataType: "TEXT", isRequired: true, helpText: "e.g., ₹1,200 per kg / ₹5,000 starting tier cake — costing base" },
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
    },
    {
      key: "music_genres_specialization",
      label: "Music Genres Specialization",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Bollywood", "EDM / Commercial", "Malayalam / Regional Hits", "Tamil / Telugu Hits", "Retro / Classic", "Hip Hop", "Fusion"],
      helpText: "Musical repertoire",
    },
    {
      key: "sound_lighting_equipment_included",
      label: "Sound & Lighting Equipment Included?",
      dataType: "SELECT",
      isRequired: true,
      options: ["Includes Sound Console & DJ Gear", "Includes Full Sound + Stage Lights", "Performance Only (Venue must provide equipment)"],
      helpText: "Technical setup responsibilities",
    },
    {
      key: "performance_duration_per_event",
      label: "Performance Duration per Event",
      dataType: "SELECT",
      isRequired: true,
      options: ["2 Hours", "4 Hours", "Full Event (Up to 6 Hours)"],
      helpText: "Standard performance hours",
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
    },
    {
      key: "alcohol_supply_policy",
      label: "Alcohol Supply Policy",
      dataType: "SELECT",
      isRequired: true,
      options: ["Client Supplies Alcohol (Service Only)", "Full Package (Alcohol + Mixers where permitted)"],
      helpText: "Who buys the liquor",
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
    },
    {
      key: "rental_package_duration",
      label: "Rental Package Duration",
      dataType: "SELECT",
      isRequired: true,
      options: ["4 Hours", "8 Hours", "80 KM", "Full Day (24 Hours)"],
      helpText: "Billing structure",
    },
    {
      key: "inclusions_with_vehicle",
      label: "Inclusions with Vehicle",
      dataType: "MULTI_SELECT",
      isRequired: true,
      options: ["Uniformed Chauffeur", "Fuel Charges Included", "Basic Ribbon/Flower Decoration", "Toll & State Permits Included"],
      helpText: "What's in the hire charge",
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
      ],
      helpText: "Specific planning duties",
    },
    {
      key: "fee_model_billing_structure",
      label: "Fee Model / Billing Structure",
      dataType: "SELECT",
      isRequired: true,
      options: ["Fixed Flat Fee", "Percentage of Total Wedding Budget (e.g., 10%)", "Hybrid"],
      helpText: "How planner charges client",
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
      dataType: "SELECT",
      isRequired: true,
      options: ["Works exclusively with preferred vendor list", "Open to client's preferred vendors"],
      helpText: "Flexibility with third-party vendors",
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
const HOMEPAGE_FEATURED_CATEGORIES: Array<{ name: string; imageUrl: string; startingPriceLabel: string; sortOrder: number }> = [
  { name: "Photography & Videography", imageUrl: "/images/capsules/photo.jpg", startingPriceLabel: "₹ 50,000", sortOrder: 0 },
  { name: "Venues", imageUrl: "/images/capsules/venue.jpg", startingPriceLabel: "₹ 1,50,000", sortOrder: 1 },
  { name: "Makeup Artists", imageUrl: "/images/capsules/makeup.jpg", startingPriceLabel: "₹ 18,000", sortOrder: 2 },
  { name: "Mehendi Artists", imageUrl: "/images/capsules/mehndi.jpg", startingPriceLabel: "₹ 8,000", sortOrder: 3 },
  { name: "Decorators", imageUrl: "/images/capsules/decor.jpg", startingPriceLabel: "₹ 75,000", sortOrder: 4 },
  { name: "Bridal Wear", imageUrl: "/images/capsules/wear.jpg", startingPriceLabel: "₹ 45,000", sortOrder: 5 },
  { name: "Caterers", imageUrl: "/images/capsules/catering.jpg", startingPriceLabel: "₹ 800 / plate", sortOrder: 6 },
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

// product.md §26's three initial plans, with real prices and the
// entitlement keys Arch Phase 12's EntitlementService reads (see
// entitlement.constants.ts) — never hardcoded in application code, only
// here as seed data admins can subsequently edit via /admin/plans.
interface PlanSeed {
  tier: "FREE" | "PRO" | "PREMIUM";
  billingInterval: "MONTHLY" | "YEARLY";
  name: string;
  price: number;
  trialDays: number;
  limits: Record<string, number>;
  features: Record<string, unknown>;
}

const SUBSCRIPTION_PLANS: PlanSeed[] = [
  {
    tier: "FREE",
    billingInterval: "MONTHLY",
    name: "Free",
    price: 0,
    trialDays: 0,
    limits: { portfolio_limit: 10, video_limit: 1 },
    features: {
      analytics_level: "basic",
      lead_access: true,
      featured_eligibility: false,
      promotional_placement: false,
      response_tools: false,
      priority_support: false,
    },
  },
  {
    tier: "PRO",
    billingInterval: "MONTHLY",
    name: "Pro",
    price: 5999,
    trialDays: 14,
    limits: { portfolio_limit: 100, video_limit: 10 },
    features: {
      analytics_level: "advanced",
      lead_access: true,
      featured_eligibility: false,
      promotional_placement: false,
      response_tools: true,
      priority_support: false,
    },
  },
  {
    tier: "PRO",
    billingInterval: "YEARLY",
    name: "Pro (Yearly)",
    price: 59990,
    trialDays: 14,
    limits: { portfolio_limit: 100, video_limit: 10 },
    features: {
      analytics_level: "advanced",
      lead_access: true,
      featured_eligibility: false,
      promotional_placement: false,
      response_tools: true,
      priority_support: false,
    },
  },
  {
    tier: "PREMIUM",
    billingInterval: "MONTHLY",
    name: "Premium",
    price: 12999,
    trialDays: 14,
    limits: { portfolio_limit: 500, video_limit: 50 },
    features: {
      analytics_level: "advanced",
      lead_access: true,
      featured_eligibility: true,
      promotional_placement: true,
      response_tools: true,
      priority_support: true,
    },
  },
  {
    tier: "PREMIUM",
    billingInterval: "YEARLY",
    name: "Premium (Yearly)",
    price: 129990,
    trialDays: 14,
    limits: { portfolio_limit: 500, video_limit: 50 },
    features: {
      analytics_level: "advanced",
      lead_access: true,
      featured_eligibility: true,
      promotional_placement: true,
      response_tools: true,
      priority_support: true,
    },
  },
];

async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of SUBSCRIPTION_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { tier_billingInterval: { tier: plan.tier, billingInterval: plan.billingInterval } },
      update: {
        name: plan.name,
        price: plan.price,
        trialDays: plan.trialDays,
        limits: plan.limits,
        features: plan.features,
      },
      create: {
        tier: plan.tier,
        billingInterval: plan.billingInterval,
        name: plan.name,
        price: plan.price,
        currency: "INR",
        trialDays: plan.trialDays,
        limits: plan.limits,
        features: plan.features,
      },
    });
  }

  console.info(`Seeded ${SUBSCRIPTION_PLANS.length} subscription plans.`);
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
