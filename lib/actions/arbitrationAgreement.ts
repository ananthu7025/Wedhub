// "use server";

// import { ArbitrationAgreementData, seatAndVenueResponse } from "@/types";
// import { httpGet, httpPost, httpPut, ResponseObject } from "../api";
// import { API_ENDPOINTS } from "@/config/api";

// // save Arbitration Agreement action
// export const saveArbitrationAgreement = async (
//   data: ArbitrationAgreementData
// ): Promise<
//   ResponseObject<{
//     id: string;
//   }>
// > =>
//   await httpPost<{
//     id: string;
//   }>(API_ENDPOINTS.REQUEST_FOR_ARBITRATION.ARBITRATION_AGREEMENT, data);

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
