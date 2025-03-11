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

interface PortfolioItem {
  title: string;
  description: string;
  media: string[];
}

export interface UserPortfolio {
  portfolio: PortfolioItem[];
}
export interface PricingAndPackage {
  packages: Package[];
}
export interface Register {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface RegisterResponse {
  token:string;
  userId: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified?:boolean;
  profileCompleted?:boolean;
}


interface PortfolioItem {
  title: string;
  description: string;
  media: string[];
}

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  x?: string;
  website?: string;
}

interface Package {
  packageName: string;
  description: string;
  price: number;
  inclusions: string;
}

export interface BusinessProfile {
  userId:string;
  businessName?: string;
  businessPhone?: string;
  location?: string;
  businessAddress?: string;
  contactPersonName?: string;
  businessCategory?: string;
  shortDescription?: string;
  portfolio?: PortfolioItem[];
  yearsOfExperience?: string;
  socialLinks?: SocialLinks;
  packages?: Package[];
}

export interface AdditionalInfo {
  yearsOfExperience?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    x?: string;
    website?: string;
  };
}