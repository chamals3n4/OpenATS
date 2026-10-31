/* eslint-disable @next/next/no-html-link-for-pages -- the guard has to see real links */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { UnsavedChangesGuard } from "@/components/guards/unsaved-changes-guard";

function page(when: boolean) {
  return render(
    <>
      <UnsavedChangesGuard when={when} />
      <a href="/jobs?page=2">Jobs</a>
      <a href="/jobs" target="_blank">New tab</a>
      <a href="https://example.com/">Outside</a>
      <a href={window.location.pathname}>Same page</a>
    </>,
  );
}

const onLinkClick = vi.fn((event: MouseEvent) => event.preventDefault());

function click(name: string, init?: MouseEventInit) {
  document.body.addEventListener("click", onLinkClick);
  fireEvent.click(screen.getByText(name), init);
  document.body.removeEventListener("click", onLinkClick);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("UnsavedChangesGuard", () => {
  it("leaves links alone when nothing has changed", () => {
    page(false);

    click("Jobs");

    expect(screen.queryByText("Leave without saving?")).toBeNull();
    expect(onLinkClick).toHaveBeenCalled();
  });

  it("stops a link and asks first", () => {
    page(true);

    click("Jobs");

    expect(screen.getByText("Leave without saving?")).toBeTruthy();
    expect(onLinkClick).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("goes where the link pointed after confirming", () => {
    page(true);

    click("Jobs");
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));

    expect(push).toHaveBeenCalledWith("/jobs?page=2");
  });

  it("stays on the page when the person cancels", () => {
    page(true);

    click("Jobs");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(push).not.toHaveBeenCalled();
  });

  it("does not ask for links that keep this page open", () => {
    page(true);

    click("New tab");
    click("Outside");
    click("Same page");
    click("Jobs", { ctrlKey: true });

    expect(screen.queryByText("Leave without saving?")).toBeNull();
  });

  it("warns before the tab closes, only while there are changes", () => {
    const closing = () => new Event("beforeunload", { cancelable: true });

    const { unmount } = page(true);
    const warned = closing();
    window.dispatchEvent(warned);
    expect(warned.defaultPrevented).toBe(true);
    unmount();

    page(false);
    const clean = closing();
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
  });
});
