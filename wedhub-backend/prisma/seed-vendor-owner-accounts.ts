import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/common/utils/password.util";

const prisma = new PrismaClient();

// One representative vendor per category gets a real login account so the
// vendor dashboard can actually be demoed — the earlier seed-demo-data.ts
// pass created 174 vendor BUSINESS rows but never created an owning User
// for any of them (ownerUserId was left null everywhere), so none of them
// could ever sign in. This is a small, additive, one-time fix: create one
// User per selected vendor, hash the same shared demo password convention
// seed-demo-data.ts already used for couples, and link it via
// Vendor.ownerUserId (nullable, @unique — exactly the real self-registration
// shape, see auth.service.ts's register()/Vendor creation flow).
const VENDOR_PASSWORD = "Vendor@2026Demo!";

const SELECTED_VENDOR_IDS = [
  "a1f05744-346a-4d9d-b0ad-48cb3a9175cc", // Alappuzha Music Co. — Artists & DJs
  "7be9c48d-ec20-4649-adc1-08ac2acd0595", // Devika's Bridal Couture — Bridal Wear
  "dbab71d6-a36e-4937-ba2d-73f953c762a6", // Anjali's Bakery — Cakes & Desserts
  "b5c826b6-e593-49ee-b5b0-b6394b0d1245", // Kollam Sadya Specialists — Caterers
  "f637ee61-2d07-4ba5-a314-7104818b9382", // Alappuzha Bar & Beverages — Cocktail & Bar Services
  "f30ed99d-068b-4b89-a0a5-06e577618ec9", // Alappuzha Wedding Decors — Decorators
  "4e86b3ca-6a6a-41d3-a270-5873d78b4865", // Aisle Events — Event Planners
  "88dcfe58-2bfb-48d9-b06f-79f0d1d920e5", // Idukki Groom Wear — Groom Wear
  "0d08f7c1-7029-4816-84f1-b44c4060ff13", // Alappuzha Ornaments — Jewellery
  "bf41b75f-0690-4086-975b-dcf2861a4297", // Anna Bridal Studio — Makeup Artists
  "b3b809d6-f7b4-485b-a963-20f551cb5afb", // Alappuzha Mehendi Designs — Mehendi Artists
  "9b509ae1-b628-4d28-b19b-9f786e4cde7e", // Anna Photography — Photography & Videography
  "b6303aa4-6b2b-4cf6-bae9-69758fb8b408", // Grand Courtyard, Kozhikode — Venues
  "712e1afb-5a87-4ad0-bc2e-a2ce8a414974", // Alappuzha Luxury Luxury Rentals — Wedding Cars & Luxury Rentals
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const passwordHash = await hashPassword(VENDOR_PASSWORD);
  const results: Array<{ businessName: string; slug: string; email: string }> = [];

  for (const vendorId of SELECTED_VENDOR_IDS) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { categories: { include: { category: true }, where: { isPrimary: true } } },
    });
    if (!vendor) {
      console.warn(`Vendor ${vendorId} not found, skipping.`);
      continue;
    }
    if (vendor.ownerUserId) {
      console.warn(`Vendor ${vendor.businessName} already has an owner, skipping.`);
      continue;
    }

    const emailLocalPart = slugify(vendor.businessName).replace(/-/g, ".");
    const email = `${emailLocalPart}@wedhub-demo.dev`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "VENDOR",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { ownerUserId: user.id },
    });

    const categoryName = vendor.categories[0]?.category.name ?? "Unknown";
    results.push({ businessName: `${vendor.businessName} (${categoryName})`, slug: vendor.slug, email });
    console.info(`Linked ${vendor.businessName} -> ${email}`);
  }

  console.info("\n=== SUMMARY ===");
  for (const r of results) {
    console.info(`${r.businessName}: ${r.email} / ${VENDOR_PASSWORD}`);
  }
  console.info(`\nTotal accounts created: ${results.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
