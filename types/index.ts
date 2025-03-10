export type SelectItem = {
  value: string;
  label: string;
};

export interface BusinessInfo {
  userId: string;
  businessName: string;
  businessPhone: string;
  location: string;
  businessAddress: string;
  contactPersonName: string;
  businessCategory: number;
  shortDescription: string;
}