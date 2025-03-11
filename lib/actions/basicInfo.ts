"use server";

import { BusinessInfo, BusinessProfile } from "@/types";
import {  httpPost, ResponseObject } from "../api";
import { API_ENDPOINTS } from "@/config/api";

// save Arbitration Agreement action
export const saveBasicInfo = async (
  data: BusinessInfo
): Promise<
  ResponseObject<BusinessProfile>
> =>
  await httpPost<BusinessProfile>(API_ENDPOINTS.VENDOR_REG.BASIC_INFO, data);

// // update Arbitration Agreement action
// export const updateArbitrationAgreement = async (
//   data: ArbitrationAgreementData
// ): Promise<
//   ResponseObject<{
//     id: string;
//   }>
// > =>
//   await httpPut<{
//     id: string;
//   }>(API_ENDPOINTS.REQUEST_FOR_ARBITRATION.ARBITRATION_AGREEMENT, data);

// // fetch arbitration agrement
// export const fetchArbitrationAgreement = async (
//   id: string
// ): Promise<ResponseObject<ArbitrationAgreementData>> =>
//   await httpGet<ArbitrationAgreementData>(
//     `${API_ENDPOINTS.REQUEST_FOR_ARBITRATION.ARBITRATION_AGREEMENT}?id=${id}`
//   );

// // fetch seat and venu action
// export const fetchSeatAndVenu = async (): Promise<
//   ResponseObject<seatAndVenueResponse[]>
// > =>
//   await httpGet<seatAndVenueResponse[]>(
//     API_ENDPOINTS.REQUEST_FOR_ARBITRATION.SEAT_AND_VENU
//   );
