import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AllowedWebsitesCard } from "@/app/(dashboard)/settings/careers-page/_components/allowed-websites-card";

afterEach(cleanup);

function setup(saved: string[], extra: Partial<React.ComponentProps<typeof AllowedWebsitesCard>> = {}) {
  const onSave = vi.fn();
  const onRetry = vi.fn();
  const utils = render(
    <AllowedWebsitesCard saved={saved} isLoading={false} loadError={null} isSaving={false} onRetry={onRetry} onSave={onSave} {...extra} />,
  );
  return { onSave, onRetry, ...utils };
}

const add = (value: string) => {
  fireEvent.change(screen.getByLabelText("Add a website"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
};

describe("AllowedWebsitesCard", () => {
  it("says every website is allowed while the list is empty", () => {
    setup([]);
    expect(screen.getByText("Open to any website")).toBeInTheDocument();
    expect(screen.getByText(/any website can load your jobs/)).toBeInTheDocument();
  });

  it("starts with Save off and lists what is saved", () => {
    setup(["https://jobs.example.com"]);
    expect(screen.getByText("Limited to 1")).toBeInTheDocument();
    expect(screen.getByText("https://jobs.example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("adds a normalized address, turns Save on, and saves the whole list", () => {
    const { onSave } = setup(["https://a.example.com"]);
    add("  Jobs.Example.com/careers/ ");
    expect(screen.getByText("https://jobs.example.com")).toBeInTheDocument();
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith(["https://a.example.com", "https://jobs.example.com"]);
  });

  it("explains a bad or repeated address instead of adding it", () => {
    setup(["https://a.example.com"]);
    add("not a url");
    expect(screen.getByText(/not a valid address/)).toBeInTheDocument();
    add("https://a.example.com/");
    expect(screen.getByText("This website is already in the list.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("removes a website and can discard the change", () => {
    setup(["https://a.example.com", "https://b.example.com"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove https://a.example.com" }));
    expect(screen.queryByText("https://a.example.com")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByText("https://a.example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("shows a load error with a retry, and no form", () => {
    const { onRetry } = setup([], { loadError: "Could not load the allowed websites." });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the allowed websites.");
    expect(screen.queryByLabelText("Add a website")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("goes back to Save off once the server returns the saved list", () => {
    const { rerender } = setup(["https://a.example.com"]);
    add("https://b.example.com");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    rerender(
      <AllowedWebsitesCard
        saved={["https://a.example.com", "https://b.example.com"]}
        isLoading={false}
        loadError={null}
        isSaving={false}
        onRetry={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});
