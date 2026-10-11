import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FormField } from "@/app/(dashboard)/templates/_components/template-form/form-field";

afterEach(cleanup);

describe("FormField", () => {
  it("ties the hint, or the error that replaces it, to the control", () => {
    const { rerender } = render(
      <FormField label="Name" htmlFor="f" hint="A hint">
        <input id="f" />
      </FormField>,
    );
    expect(screen.getByLabelText("Name").getAttribute("aria-describedby")).toBe("f-description");
    expect(document.getElementById("f-description")?.textContent).toBe("A hint");

    rerender(
      <FormField label="Name" htmlFor="f" hint="A hint" error="Wrong">
        <input id="f" />
      </FormField>,
    );
    expect(document.getElementById("f-description")?.textContent).toBe("Wrong");
  });

  it("adds no reference when there is nothing to describe the control", () => {
    render(
      <FormField label="Plain" htmlFor="f">
        <input id="f" />
      </FormField>,
    );
    expect(screen.getByLabelText("Plain").hasAttribute("aria-describedby")).toBe(false);
  });
});
