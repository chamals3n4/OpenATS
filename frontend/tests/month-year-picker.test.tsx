import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MonthYearPicker } from "@/app/(dashboard)/interviews/_components/month-year-picker";

afterEach(cleanup);

describe("MonthYearPicker", () => {
  const setup = () => {
    const onChange = vi.fn();
    render(<MonthYearPicker year={2026} month={9} today={new Date(2026, 9, 11)} onChange={onChange} />);
    return onChange;
  };

  it("shows the month and year, and opens a panel of months", async () => {
    setup();
    const trigger = screen.getByRole("button", { name: /October 2026/ });
    expect(trigger.textContent).toContain("October");
    fireEvent.click(trigger);
    expect(await screen.findByRole("button", { name: "March 2026" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "October 2026" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("jumps to a month in another year", async () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole("button", { name: /October 2026/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Next year" }));
    fireEvent.click(screen.getByRole("button", { name: "Next year" }));
    fireEvent.click(screen.getByRole("button", { name: "February 2028" }));
    expect(onChange).toHaveBeenCalledWith(2028, 1);
  });
});
