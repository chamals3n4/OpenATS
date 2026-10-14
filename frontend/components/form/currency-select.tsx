"use client";

import { SearchSelect, type SearchSelectOption } from "@/components/form/search-select";

// Common currencies first
const COMMON = ["USD", "EUR", "GBP", "LKR", "INR", "AUD", "CAD", "SGD", "AED"];

// Currency list comes from the browser
let cache: SearchSelectOption[] | null = null;
function currencies(): SearchSelectOption[] {
  if (cache) return cache;

  let codes: string[] = [];
  try {
    codes = Intl.supportedValuesOf("currency");
  } catch {
    codes = [];
  }
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["en"], { type: "currency" });
  } catch {
    names = null;
  }
  const nameOf = (code: string) => {
    try {
      const name = names?.of(code);
      return name && name !== code ? name : "";
    } catch {
      return "";
    }
  };

  const ordered = Array.from(new Set([...COMMON, ...codes]));
  cache = ordered.map((code) => ({ value: code, label: code, hint: nameOf(code) }));
  return cache;
}

/** Currency picker by code or name */
export function CurrencySelect({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (currency: string) => void;
  className?: string;
}) {
  return (
    <SearchSelect
      id={id}
      value={value}
      onChange={onChange}
      options={currencies}
      // Button shows only the code
      describe={(code) => ({ label: code })}
      compact
      ariaLabel="Currency"
      searchPlaceholder="Search by code or name"
      emptyText="No currency matches that."
      className={className}
    />
  );
}
