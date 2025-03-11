"use server";

import {  AdditionalInfo, BusinessProfile } from "@/types";
import {  httpPost, ResponseObject } from "../api";
import { API_ENDPOINTS } from "@/config/api";

// save Arbitration Agreement action
export const saveAdditionalInfo = async (
  data: AdditionalInfo
): Promise<
  ResponseObject<BusinessProfile>
> =>
  await httpPost<BusinessProfile>(API_ENDPOINTS.VENDOR_REG.ADDITIONAL_INFO, data);