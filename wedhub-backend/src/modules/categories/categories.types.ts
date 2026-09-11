export type AttributeDataType =
  | "BOOLEAN"
  | "NUMBER"
  | "TEXT"
  | "SELECT"
  | "MULTI_SELECT"
  | "TEXTAREA"
  | "NUMBER_RANGE"
  | "IMAGE"
  | "PHONE"
  | "URL"
  | "EMAIL"
  | "TIME"
  | "TIME_RANGE";

export interface CreateCategoryInput {
  name: string;
  description: string | undefined;
  parentId: string | undefined;
  hasStoreEnabled?: boolean | undefined;
}

export interface UpdateCategoryInput {
  name: string | undefined;
  description: string | undefined;
  sortOrder: number | undefined;
  isActive: boolean | undefined;
  hasStoreEnabled?: boolean | undefined;
  imageUrl: string | null | undefined;
  isFeaturedOnHomepage: boolean | undefined;
  homepageSortOrder: number | undefined;
  startingPriceLabel: string | null | undefined;
}

export interface CreateAttributeInput {
  key: string;
  label: string;
  dataType: AttributeDataType;
  options: string[] | undefined;
  isFilterable: boolean | undefined;
  isComparable: boolean | undefined;
  isRequired: boolean | undefined;
  placeholder: string | undefined;
  helpText: string | undefined;
  uiVariant: string | undefined;
  aspectRatio: string | undefined;
}

export interface UpdateAttributeInput {
  label: string | undefined;
  options: string[] | undefined;
  isFilterable: boolean | undefined;
  isComparable: boolean | undefined;
  isRequired: boolean | undefined;
  placeholder: string | null | undefined;
  helpText: string | null | undefined;
  uiVariant: string | null | undefined;
  aspectRatio: string | null | undefined;
  sortOrder: number | undefined;
}

export interface CreateServiceInput {
  name: string;
  description: string | undefined;
}

export interface UpdateServiceInput {
  name: string | undefined;
  description: string | null | undefined;
  isActive: boolean | undefined;
}
