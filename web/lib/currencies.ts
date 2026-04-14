import CurrencyList from "currency-list";

const data = CurrencyList.getAll("en_US");

export const currencyOptions = Object.values(data)
  .map((c) => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
  }))
  .sort((a, b) => a.code.localeCompare(b.code));
