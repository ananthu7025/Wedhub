import { NotFoundError } from "../../common/errors";
import * as vendorRepository from "./vendor.repository";

export async function getOwnedVendorOrThrow(userId: string) {
  const vendor = await vendorRepository.findVendorByOwnerId(userId);
  if (!vendor) {
    throw new NotFoundError("You do not have a vendor profile yet");
  }
  return vendor;
}
