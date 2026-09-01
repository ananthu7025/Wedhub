export type AttributeDataType = "BOOLEAN" | "NUMBER" | "TEXT" | "SELECT" | "MULTI_SELECT";

export interface CreateCategoryInput {
  name: string;
  description: string | undefined;
  parentId: string | undefined;
}

export interface UpdateCategoryInput {
  name: string | undefined;
  description: string | undefined;
  sortOrder: number | undefined;
  isActive: boolean | undefined;
}

export interface CreateAttributeInput {
  key: string;
  label: string;
  dataType: AttributeDataType;
  options: string[] | undefined;
  isFilterable: boolean | undefined;
  isComparable: boolean | undefined;
}

export interface UpdateAttributeInput {
  label: string | undefined;
  options: string[] | undefined;
  isFilterable: boolean | undefined;
  isComparable: boolean | undefined;
  sortOrder: number | undefined;
}
