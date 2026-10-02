import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfferFilters } from "@/app/(dashboard)/offers/_components/offer-filters";
import { TemplatesFilters } from "@/app/(dashboard)/templates/_components/templates-filters";

const noop = () => {};

describe("filter selects show labels, not raw values, while closed", () => {
  it("offers status filter shows 'All Statuses' for the value 'all'", () => {
    render(
      <OfferFilters
        search=""
        onSearchChange={noop}
        selectedJobId={undefined}
        onJobChange={noop}
        statusFilter="all"
        onStatusChange={noop}
        jobs={[]}
        onClear={noop}
      />,
    );
    expect(screen.getByText("All Statuses")).toBeTruthy();
    expect(screen.queryByText("all")).toBeNull();
  });

  it("offers status filter shows the label of a selected status", () => {
    render(
      <OfferFilters
        search=""
        onSearchChange={noop}
        selectedJobId={undefined}
        onJobChange={noop}
        statusFilter="accepted"
        onStatusChange={noop}
        jobs={[]}
        onClear={noop}
      />,
    );
    expect(screen.getByText("Accepted")).toBeTruthy();
    expect(screen.queryByText("accepted")).toBeNull();
  });

  it("templates type filter shows 'Interview Event' for the value 'event'", () => {
    render(
      <TemplatesFilters
        search=""
        onSearchChange={noop}
        filterType="event"
        onFilterTypeChange={noop}
        onClear={noop}
      />,
    );
    expect(screen.getByText("Interview Event")).toBeTruthy();
    expect(screen.queryByText("event")).toBeNull();
  });
});
