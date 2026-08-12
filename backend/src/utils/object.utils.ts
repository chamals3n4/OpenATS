export const cleanObject = <T extends object>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
};

// Narrows an untrusted query-string value to one of a column's enum members.
export const asEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
