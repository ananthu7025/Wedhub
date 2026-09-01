export type LocationType = "COUNTRY" | "STATE" | "CITY" | "AREA";

export const LOCATION_HIERARCHY: Record<LocationType, LocationType | null> = {
  COUNTRY: null,
  STATE: "COUNTRY",
  CITY: "STATE",
  AREA: "CITY",
};

export interface CreateLocationInput {
  type: LocationType;
  name: string;
  parentId: string | undefined;
}

export interface UpdateLocationInput {
  name: string | undefined;
  isActive: boolean | undefined;
}

export interface ListLocationsFilter {
  type: LocationType | undefined;
  parentId: string | undefined;
}
