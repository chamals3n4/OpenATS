import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CurrencySelect } from "@/components/form/currency-select";

// jsdom has neither of these, and the list uses both to keep the highlighted row in view.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};

afterEach(cleanup);

const openAndType = (text: string) => {
  fireEvent.click(screen.getByRole("combobox"));
  fireEvent.change(screen.getByPlaceholderText(/Search by code or name/), { target: { value: text } });
};
const options = () => screen.getAllByRole("option").map((option) => option.textContent ?? "");

describe("CurrencySelect", () => {
  it("shows the chosen code on its button", () => {
    render(<CurrencySelect value="LKR" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox").textContent).toBe("LKR");
  });

  it("offers far more than a handful of currencies, the common ones first", () => {
    render(<CurrencySelect value="USD" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox"));

    expect(options()[0]).toContain("USD");
    expect(options().slice(0, 9).some((text) => text.includes("LKR"))).toBe(true);
    expect(screen.getByText(/Showing 50 of \d+/)).toBeTruthy();
  });

  it("finds a currency by its name as well as its code", () => {
    render(<CurrencySelect value="USD" onChange={vi.fn()} />);
    openAndType("sri lankan");

    expect(options()).toHaveLength(1);
    expect(options()[0]).toContain("LKR");
  });

  it("gives back the three letter code when one is picked", () => {
    const onChange = vi.fn();
    render(<CurrencySelect value="USD" onChange={onChange} />);
    openAndType("jpy");

    fireEvent.click(screen.getAllByRole("option")[0]!);

    expect(onChange).toHaveBeenCalledWith("JPY");
  });
});
