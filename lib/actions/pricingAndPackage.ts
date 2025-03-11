"use server";

import {  BusinessProfile, PricingAndPackage } from "@/types";
import {  httpPost, ResponseObject } from "../api";
import { API_ENDPOINTS } from "@/config/api";

// save Arbitration Agreement action
export const savePackage = async (
  data: PricingAndPackage
): Promise<
  ResponseObject<BusinessProfile>
> =>
  await httpPost<BusinessProfile>(API_ENDPOINTS.VENDOR_REG.PRICING, data);