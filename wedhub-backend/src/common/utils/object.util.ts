export type DefinedFields<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

/**
 * Strips keys whose value is `undefined`, producing a type where the remaining
 * keys are genuinely optional (not "present but undefined") — required because
 * `exactOptionalPropertyTypes` treats those as distinct, and Prisma's generated
 * create/update input types don't accept explicit `undefined` for absent fields.
 */
export function omitUndefined<T extends object>(obj: T): DefinedFields<T> {
  const result: DefinedFields<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const value = obj[key];
    if (value !== undefined) {
      result[key] = value as Exclude<T[keyof T], undefined>;
    }
  }
  return result;
}
