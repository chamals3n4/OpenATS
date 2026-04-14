import { getData } from "country-list";
import { getCountryCallingCode } from "libphonenumber-js";

export const countryPhoneList = getData()
  .map((c) => {
    try {
      const phoneCode = "+" + getCountryCallingCode(c.code as any);

      return {
        name: c.name,
        code: c.code, // ISO code (LK, US)
        phone: phoneCode,
      };
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .sort((a, b) => a!.name.localeCompare(b!.name));
