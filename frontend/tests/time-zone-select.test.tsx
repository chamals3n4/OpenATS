import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TimeZoneSelect } from "@/app/(dashboard)/settings/general/_components/time-zone-select";

// jsdom has neither of these, and the list uses both to keep the highlighted row in view.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};

afterEach(cleanup);

const open = () => fireEvent.click(screen.getByRole("combobox"));

describe("TimeZoneSelect", () => {
  it("shows the chosen zone and its offset", () => {
    render(<TimeZoneSelect value="Asia/Colombo" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox").textContent).toContain("Asia/Colombo");
    expect(screen.getByRole("combobox").textContent).toContain("GMT+5:30");
  });

  it("narrows the list as a city is typed", () => {
    render(<TimeZoneSelect value="UTC" onChange={vi.fn()} />);
    open();
    // Only some are drawn at once, with a note saying how many there are.
    expect(screen.getAllByRole("option")).toHaveLength(50);
    expect(screen.getByText(/Showing 50 of \d+/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Search by city/), { target: { value: "colombo" } });

    const left = screen.getAllByRole("option").map((option) => option.textContent ?? "");
    expect(left.length).toBeLessThan(10);
    expect(left.some((text) => text.includes("Asia/Colombo"))).toBe(true);
  });

  it("finds a zone written with a space where its name has an underscore", () => {
    render(<TimeZoneSelect value="UTC" onChange={vi.fn()} />);
    open();

    fireEvent.change(screen.getByPlaceholderText(/Search by city/), { target: { value: "new york" } });

    expect(screen.getAllByRole("option").some((option) => option.textContent?.includes("America/New York"))).toBe(true);
  });

  it("finds zones by their offset", () => {
    render(<TimeZoneSelect value="UTC" onChange={vi.fn()} />);
    open();

    fireEvent.change(screen.getByPlaceholderText(/Search by city/), { target: { value: "+5:30" } });

    const left = screen.getAllByRole("option").map((option) => option.textContent ?? "");
    expect(left.length).toBeGreaterThan(0);
    expect(left.every((text) => text.includes("GMT+5:30"))).toBe(true);
  });

  it("puts the chosen zone at the top when the list opens", () => {
    render(<TimeZoneSelect value="Asia/Colombo" onChange={vi.fn()} />);
    open();

    expect(screen.getAllByRole("option")[0]?.textContent).toContain("Asia/Colombo");
  });

  it("says so when nothing matches", () => {
    render(<TimeZoneSelect value="UTC" onChange={vi.fn()} />);
    open();

    fireEvent.change(screen.getByPlaceholderText(/Search by city/), { target: { value: "zzzzqqq" } });

    expect(screen.getByText("No time zone matches that.")).toBeTruthy();
  });

  it("gives back the real zone name when one is picked", () => {
    const onChange = vi.fn();
    render(<TimeZoneSelect value="UTC" onChange={onChange} />);
    open();
    fireEvent.change(screen.getByPlaceholderText(/Search by city/), { target: { value: "new york" } });

    const option = screen.getAllByRole("option").find((item) => item.textContent?.includes("America/New York"))!;
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith("America/New_York");
  });
});
