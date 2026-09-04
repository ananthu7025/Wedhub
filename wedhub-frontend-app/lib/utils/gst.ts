export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

export interface SacPreset {
  code: string;
  name: string;
  defaultRate: number;
}

export const SAC_PRESETS: SacPreset[] = [
  { code: "998311", name: "Photography & Videography Services", defaultRate: 18 },
  { code: "996331", name: "Catering & Food Preparation Services", defaultRate: 5 },
  { code: "998599", name: "Wedding Planner & Event Management", defaultRate: 18 },
  { code: "999721", name: "Bridal Makeup, Hair & Styling Services", defaultRate: 18 },
  { code: "997212", name: "Wedding Hall / Convention Center Rental", defaultRate: 18 },
  { code: "998399", name: "Decoration, Lighting & Sound Services", defaultRate: 18 },
  { code: "999900", name: "Other Wedding Services", defaultRate: 18 },
];

export const ALLOWED_GST_RATES = [0, 5, 12, 18, 28] as const;

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const STATE_CODE_REGEX = /^[0-9]{2}$/;
export const PINCODE_REGEX = /^[0-9]{6}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates Indian GSTIN. Returns error message if invalid, or null if valid/empty.
 */
export function validateGstin(gstin?: string | null): string | null {
  if (!gstin || !gstin.trim()) return null;
  const upper = gstin.trim().toUpperCase();
  if (upper.length !== 15) {
    return "GSTIN must be exactly 15 characters (e.g. 29ABCDE1234F1Z5)";
  }
  if (!GSTIN_REGEX.test(upper)) {
    return "Invalid GSTIN format (e.g. 2 digits + 5 letters + 4 digits + 1 letter + 1 char + Z + 1 char)";
  }
  return null;
}

/**
 * Validates Indian PAN. Returns error message if invalid, or null if valid/empty.
 */
export function validatePan(pan?: string | null): string | null {
  if (!pan || !pan.trim()) return null;
  const upper = pan.trim().toUpperCase();
  if (upper.length !== 10) {
    return "PAN must be exactly 10 characters (e.g. ABCDE1234F)";
  }
  if (!PAN_REGEX.test(upper)) {
    return "Invalid PAN format (e.g. 5 letters + 4 digits + 1 letter)";
  }
  return null;
}

/**
 * Validates 6-digit Indian Pincode. Returns error message if invalid, or null if valid/empty.
 */
export function validatePincode(pincode?: string | null): string | null {
  if (!pincode || !pincode.trim()) return null;
  const trimmed = pincode.trim();
  if (!PINCODE_REGEX.test(trimmed)) {
    return "Pincode must be exactly 6 digits";
  }
  return null;
}

/**
 * Validates Email. Returns error message if invalid, or null if valid/empty.
 */
export function validateEmail(email?: string | null): string | null {
  if (!email || !email.trim()) return null;
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Invalid email address format";
  }
  return null;
}

export { formatApiError } from "./error";

