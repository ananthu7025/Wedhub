import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import * as categoryRepository from "../categories/categories.repository";
import * as locationRepository from "../locations/locations.repository";
import * as featuredListingRepository from "./featured-listing.repository";

async function assertReferencesExist(input: {
  vendorId: string;
  categoryId: string | undefined;
  cityId: string | undefined;
  paymentId: string | undefined;
}) {
  const vendor = await featuredListingRepository.findVendorById(input.vendorId);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  if (input.categoryId) {
    const category = await categoryRepository.findCategoryById(input.categoryId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }
  }
  if (input.cityId) {
    const city = await locationRepository.findLocationById(input.cityId);
    if (!city) {
      throw new NotFoundError("City not found");
    }
  }
  if (input.paymentId) {
    const payment = await featuredListingRepository.findPaymentById(input.paymentId);
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
  }
}

export async function createFeaturedListing(
  createdByUserId: string,
  input: {
    vendorId: string;
    placementType: "HOMEPAGE" | "CATEGORY_PAGE" | "CITY_PAGE" | "SEARCH_RESULTS";
    categoryId: string | undefined;
    cityId: string | undefined;
    priority: number;
    price: number;
    currency: string;
    startDate: Date;
    endDate: Date;
    paymentId: string | undefined;
  },
) {
  await assertReferencesExist(input);
  try {
    return await featuredListingRepository.createFeaturedListing({ ...input, createdByUserId });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new ConflictError("This payment is already linked to another featured listing");
    }
    throw err;
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}

const TERMINAL_STATUSES = new Set(["EXPIRED", "CANCELLED"]);

export async function updateFeaturedListing(
  id: string,
  input: {
    priority: number | undefined;
    price: number | undefined;
    startDate: Date | undefined;
    endDate: Date | undefined;
    status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "CANCELLED" | undefined;
    paymentId: string | undefined;
  },
) {
  const existing = await featuredListingRepository.findFeaturedListingById(id);
  if (!existing) {
    throw new NotFoundError("Featured listing not found");
  }
  if (TERMINAL_STATUSES.has(existing.status)) {
    throw new ValidationError(`Cannot modify a listing that is already ${existing.status}`);
  }

  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate ?? existing.endDate;
  if (endDate <= startDate) {
    throw new ValidationError("endDate must be after startDate");
  }
  if (input.paymentId) {
    const payment = await featuredListingRepository.findPaymentById(input.paymentId);
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
  }

  try {
    return await featuredListingRepository.updateFeaturedListing(id, input);
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new ConflictError("This payment is already linked to another featured listing");
    }
    throw err;
  }
}

export async function cancelFeaturedListing(id: string) {
  const existing = await featuredListingRepository.findFeaturedListingById(id);
  if (!existing) {
    throw new NotFoundError("Featured listing not found");
  }
  if (TERMINAL_STATUSES.has(existing.status)) {
    throw new ValidationError(`Listing is already ${existing.status}`);
  }
  return featuredListingRepository.updateFeaturedListing(id, {
    status: "CANCELLED",
    priority: undefined,
    price: undefined,
    startDate: undefined,
    endDate: undefined,
    paymentId: undefined,
  });
}

export function listFeaturedListingsAdmin(filter: {
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "CANCELLED" | undefined;
  vendorId: string | undefined;
  page: number;
  limit: number;
}) {
  return Promise.all([
    featuredListingRepository.listFeaturedListingsAdmin(filter),
    featuredListingRepository.countFeaturedListingsAdmin(filter),
  ]);
}

export function listActiveFeaturedListings(filter: {
  placementType: "HOMEPAGE" | "CATEGORY_PAGE" | "CITY_PAGE" | "SEARCH_RESULTS" | undefined;
  categoryId: string | undefined;
  cityId: string | undefined;
  page: number;
  limit: number;
}) {
  return Promise.all([
    featuredListingRepository.listActiveFeaturedListings(filter),
    featuredListingRepository.countActiveFeaturedListings(filter),
  ]);
}
