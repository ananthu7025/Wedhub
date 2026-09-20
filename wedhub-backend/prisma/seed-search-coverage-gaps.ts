import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { downloadObject, uploadObject } from "../src/integrations/storage/r2.client";
import { enqueueMediaProcessing } from "../src/jobs/queues/media-processing.queue";

const prisma = new PrismaClient();

// Fixes a real, user-reported gap: the earlier demo-vendor seed left zero
// APPROVED Makeup Artists in Ernakulam (Kochi) and zero APPROVED Venues in
// Thiruvananthapuram (Trivandrum) — not a search bug, confirmed by direct
// SQL (0 rows either way), but it made 3 of the reported "search returns
// zero" test cases untestable regardless of how correct the search logic
// is. This is a small, targeted top-up: one real vendor per missing
// (category, city) combination, with real photos copied through the actual
// R2 upload + processing pipeline (download an existing same-category
// vendor's already-approved original image, re-upload it under the NEW
// vendor's own object-key path, then run it through the same
// enqueueMediaProcessing flow every real upload uses) — never reusing
// another vendor's live Media row by reference, which would let one
// vendor's later photo edit/delete silently break a second vendor's
// listing (Media.vendorId is a single-owner column).

const MAKEUP_CATEGORY_ID = "cf1b2a27-6f1d-4a82-8ac0-83b320ee1dcd";
const VENUES_CATEGORY_ID = "cdd86bda-5784-4c5e-abe9-3c2896e25e56";
const ERNAKULAM_ID = "b1a8dee2-fdbe-4937-acd3-167d5df78111";
const THIRUVANANTHAPURAM_ID = "82e49169-280f-49e9-b218-d97118571575";

// Real, already-processed original images from an EXISTING approved vendor
// in the same category — downloaded and re-uploaded fresh under the new
// vendor's own path below, not referenced directly.
const MAKEUP_SOURCE_IMAGES = [
  { key: "vendors/c2b020f6-ede9-4efe-9c26-551d6e50636c/44a355df-79d9-4b8f-9178-f4eb22bdbe1d.jpg", mime: "image/jpeg" },
  { key: "vendors/c2b020f6-ede9-4efe-9c26-551d6e50636c/46018433-cdea-43e1-82dd-4aa7682c2246.jpg", mime: "image/jpeg" },
  { key: "vendors/c2b020f6-ede9-4efe-9c26-551d6e50636c/6cc29184-28bc-437e-ad9a-2b1d95f67d3c.jpg", mime: "image/jpeg" },
  { key: "vendors/c2b020f6-ede9-4efe-9c26-551d6e50636c/40336f52-5980-411d-9c3b-54e20c6b2415.jpg", mime: "image/jpeg" },
];

const VENUE_SOURCE_IMAGES = [
  { key: "vendors/ea036a58-4f7b-45bc-9e7e-4257fafacc0f/f0c64e3e-17be-4c2d-8fac-b95cfd8d04b2.jpg", mime: "image/jpeg" },
  { key: "vendors/ea036a58-4f7b-45bc-9e7e-4257fafacc0f/836fb385-3f1f-4ed6-998f-53883c9d6394.jpg", mime: "image/jpeg" },
  { key: "vendors/ea036a58-4f7b-45bc-9e7e-4257fafacc0f/0f035f20-695e-4f65-b196-da776bf5f1b5.jpg", mime: "image/jpeg" },
  { key: "vendors/ea036a58-4f7b-45bc-9e7e-4257fafacc0f/e4441747-bdd6-4492-a9f7-549621c8f06f.jpg", mime: "image/jpeg" },
];

function extensionFor(mime: string): string {
  return mime === "image/png" ? ".png" : ".jpg";
}

async function copyPhotosToVendor(vendorId: string, sources: { key: string; mime: string }[]): Promise<string[]> {
  const mediaIds: string[] = [];
  for (const source of sources) {
    const bytes = await downloadObject(source.key);
    const newObjectKey = `vendors/${vendorId}/${randomUUID()}${extensionFor(source.mime)}`;
    await uploadObject(newObjectKey, bytes, source.mime);

    const media = await prisma.media.create({
      data: {
        vendorId,
        mediaType: "PORTFOLIO",
        storageProvider: "cloudflare_r2",
        originalObjectKey: newObjectKey,
        mimeType: source.mime,
        fileSize: bytes.byteLength,
        status: "PROCESSING",
        moderationStatus: "APPROVED",
      },
    });
    await enqueueMediaProcessing(media.id);
    mediaIds.push(media.id);
    console.info(`  queued photo ${media.id} (${newObjectKey})`);
  }
  return mediaIds;
}

async function waitForReady(mediaIds: string[], timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await prisma.media.findMany({ where: { id: { in: mediaIds } }, select: { status: true } });
    if (rows.every((r) => r.status === "READY")) return;
    if (rows.some((r) => r.status === "FAILED")) {
      throw new Error("A media row FAILED processing — aborting");
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for media to become READY after ${timeoutMs}ms`);
}

async function createVendor(input: {
  businessName: string;
  slug: string;
  categoryId: string;
  cityId: string;
  shortDescription: string;
  description: string;
  startingPrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
  yearsExperience: number;
  packages: Array<{ name: string; description: string; price: number; inclusions: string[] }>;
  attributes: Array<{ key: string; valueOptions?: string[]; valueText?: string; valueNumber?: number }>;
  photos: { key: string; mime: string }[];
}) {
  const vendor = await prisma.vendor.create({
    data: {
      businessName: input.businessName,
      slug: input.slug,
      status: "APPROVED",
      creationSource: "ADMIN_CREATED",
      verificationLevel: "BUSINESS_VERIFIED",
      cityId: input.cityId,
      profileCompleteness: 95,
      approvedAt: new Date(),
      submittedAt: new Date(),
      categories: { create: [{ categoryId: input.categoryId, isPrimary: true }] },
      serviceAreas: { create: [{ locationId: input.cityId }] },
      profile: {
        create: {
          shortDescription: input.shortDescription,
          description: input.description,
          startingPrice: input.startingPrice,
          priceRangeMin: input.priceRangeMin,
          priceRangeMax: input.priceRangeMax,
          yearsExperience: input.yearsExperience,
          currency: "INR",
        },
      },
      packages: { create: input.packages.map((p, i) => ({ ...p, sortOrder: i })) },
    },
  });

  const attributeRows = await prisma.categoryAttribute.findMany({
    where: { categoryId: input.categoryId, key: { in: input.attributes.map((a) => a.key) } },
  });
  for (const attr of input.attributes) {
    const row = attributeRows.find((r) => r.key === attr.key);
    if (!row) continue;
    await prisma.vendorAttributeValue.create({
      data: {
        vendorId: vendor.id,
        attributeId: row.id,
        valueOptions: attr.valueOptions ?? [],
        valueText: attr.valueText ?? null,
        valueNumber: attr.valueNumber ?? null,
      },
    });
  }

  console.info(`Created vendor ${input.businessName} (${vendor.id}), uploading ${input.photos.length} photos...`);
  const mediaIds = await copyPhotosToVendor(vendor.id, input.photos);
  await waitForReady(mediaIds);
  console.info(`  all photos READY`);

  // First photo becomes the logo/cover, same convention the earlier
  // backfill used for every other seeded vendor (search cards read
  // VendorProfile.logoMediaId, not "any photo the vendor has").
  await prisma.vendorProfile.update({
    where: { vendorId: vendor.id },
    data: { logoMediaId: mediaIds[0], coverMediaId: mediaIds[0] },
  });

  return vendor;
}

async function main() {
  await createVendor({
    businessName: "Ernakulam Glam Makeovers",
    slug: "ernakulam-glam-makeovers",
    categoryId: MAKEUP_CATEGORY_ID,
    cityId: ERNAKULAM_ID,
    shortDescription: "Bridal HD and airbrush makeup artist based in Ernakulam, specialising in South Indian and Christian bridal looks.",
    description:
      "Ernakulam Glam Makeovers has been styling brides across Kochi for over 8 years, offering HD and airbrush makeup, hair styling, and saree draping for weddings, engagements, and receptions. We use long-wear, skin-friendly products suited to Kerala's climate and offer both studio and on-location bookings.",
    startingPrice: 15000,
    priceRangeMin: 15000,
    priceRangeMax: 65000,
    yearsExperience: 8,
    packages: [
      {
        name: "Bridal HD Makeup",
        description: "Full HD bridal makeup with hair styling and saree draping.",
        price: 25000,
        inclusions: ["HD makeup", "Hair styling", "Saree draping", "False lashes"],
      },
      {
        name: "Bridal + Reception Combo",
        description: "Two complete looks for the wedding day and reception.",
        price: 42000,
        inclusions: ["2 full looks", "Hair styling for both", "Draping", "Touch-up kit"],
      },
      {
        name: "Airbrush Premium",
        description: "Long-wear airbrush makeup for the full bridal party.",
        price: 65000,
        inclusions: ["Airbrush makeup", "Family makeup (up to 3)", "Hair styling", "On-site touch-ups"],
      },
    ],
    attributes: [
      { key: "makeup_specialization", valueOptions: ["Bridal HD Makeup", "Traditional South Indian Bridal", "Engagement / Reception Look"] },
      { key: "service_location_flexibility", valueOptions: ["Both (Studio & Venue Travel)"] },
      { key: "trial_makeup_availability", valueOptions: ["Paid Trial Available"] },
      { key: "hair_styling_draping_inclusions", valueOptions: ["Hair Styling Included", "Saree / Dupatta Draping Included"] },
    ],
    photos: MAKEUP_SOURCE_IMAGES,
  });

  await createVendor({
    businessName: "Trivandrum Palace Gardens",
    slug: "trivandrum-palace-gardens",
    categoryId: VENUES_CATEGORY_ID,
    cityId: THIRUVANANTHAPURAM_ID,
    shortDescription: "Banquet hall and lawn venue in Thiruvananthapuram with indoor and outdoor spaces for up to 500 guests.",
    description:
      "Trivandrum Palace Gardens offers a landscaped outdoor lawn and an air-conditioned banquet hall in the heart of Thiruvananthapuram, hosting weddings, receptions, and engagement ceremonies for up to 500 guests. In-house catering and decor partnerships are available, along with ample parking and dedicated bridal rooms.",
    startingPrice: 200000,
    priceRangeMin: 200000,
    priceRangeMax: 950000,
    yearsExperience: 12,
    packages: [
      {
        name: "Lawn Wedding Package",
        description: "Outdoor lawn setup for up to 300 guests, half-day booking.",
        price: 280000,
        inclusions: ["Lawn venue", "Basic decor", "Parking", "Power backup"],
      },
      {
        name: "Banquet Hall Package",
        description: "Air-conditioned indoor hall for up to 500 guests, full-day booking.",
        price: 520000,
        inclusions: ["AC banquet hall", "Stage setup", "Bridal room", "Valet parking"],
      },
      {
        name: "Grand Wedding Package",
        description: "Both lawn and hall for a multi-function wedding, full weekend.",
        price: 950000,
        inclusions: ["Lawn + hall", "Premium decor tie-up", "Catering coordination", "Dedicated event manager"],
      },
    ],
    attributes: [
      { key: "venue_type", valueOptions: ["Banquet Hall", "Open Air Lawn / Beach"] },
      { key: "ac_climate_control_status", valueOptions: ["Fully Air-Conditioned"] },
      { key: "catering_policy", valueOptions: ["Both"] },
      { key: "seating_guest_capacity", valueNumber: 500 },
      { key: "parking_capacity", valueNumber: 120 },
    ],
    photos: VENUE_SOURCE_IMAGES,
  });

  console.info("\nDone.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
