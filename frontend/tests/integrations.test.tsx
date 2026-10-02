import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntegrationRow } from "@/app/(dashboard)/settings/integrations/_components/integration-row";
import {
  VIDEO_MEETING_INTEGRATIONS,
  stateOf,
} from "@/app/(dashboard)/settings/integrations/lib/integrations";

afterEach(cleanup);

const [meet, zoom] = VIDEO_MEETING_INTEGRATIONS;

describe("stateOf", () => {
  it("is connected, with the account, when the API says so", () => {
    expect(stateOf(meet, [{ provider: "google_meet", connected: true, accountEmail: "ada@x.com" }])).toEqual({
      state: "connected",
      accountEmail: "ada@x.com",
    });
  });
  it("is not connected when the API says no, or knows nothing", () => {
    expect(stateOf(meet, [{ provider: "google_meet", connected: false, accountEmail: null }]).state).toBe("not_connected");
    expect(stateOf(meet, []).state).toBe("not_connected");
    expect(stateOf(meet, undefined).state).toBe("not_connected");
  });
  it("is coming soon for apps that cannot be connected yet, whatever the API says", () => {
    expect(stateOf(zoom, [{ provider: "google_meet", connected: true, accountEmail: "a@x.com" }]).state).toBe("coming_soon");
  });
});

function row(state: "connected" | "not_connected" | "coming_soon", extra: { accountEmail?: string | null; isConnecting?: boolean } = {}) {
  const onConnect = vi.fn();
  const onDisconnect = vi.fn();
  render(
    <ul>
      <IntegrationRow
        integration={state === "coming_soon" ? zoom : meet}
        state={state}
        accountEmail={extra.accountEmail ?? null}
        isConnecting={extra.isConnecting ?? false}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    </ul>,
  );
  return { onConnect, onDisconnect };
}

describe("IntegrationRow", () => {
  it("offers Connect when not connected", () => {
    const { onConnect } = row("not_connected");
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(onConnect).toHaveBeenCalled();
  });

  it("shows the account and offers Disconnect when connected", () => {
    const { onDisconnect } = row("connected", { accountEmail: "ada@x.com" });
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("ada@x.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(onDisconnect).toHaveBeenCalled();
  });

  it("locks Connect while the redirect is starting", () => {
    row("not_connected", { isConnecting: true });
    expect(screen.getByRole("button", { name: /Opening Google/ })).toBeDisabled();
  });

  it("shows a disabled action for apps that are not available yet", () => {
    row("coming_soon");
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not available yet" })).toBeDisabled();
  });
});
