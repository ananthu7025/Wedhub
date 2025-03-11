"use server";

import {  BusinessProfile, UserPortfolio } from "@/types";
import {  httpPost, ResponseObject } from "../api";
import { API_ENDPOINTS } from "@/config/api";

// save Arbitration Agreement action
export const savePortfolio = async (
  data: UserPortfolio
): Promise<
  ResponseObject<BusinessProfile>
> =>
  await httpPost<BusinessProfile>(API_ENDPOINTS.VENDOR_REG.PORTFOLIO, data);