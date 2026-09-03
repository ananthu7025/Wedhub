export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Shared collision-resolution loop, previously duplicated separately in
// vendor.service.ts and categories.service.ts. base -> base-2 -> base-3...
// on collision (existsCheck should be a case-insensitive lookup, matching
// how Vendor.slug/Category.slug collisions were already resolved).
export async function generateUniqueSlug(
  base: string,
  existsCheck: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  let suffix = 1;

  while (await existsCheck(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}
