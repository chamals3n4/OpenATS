import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";

let isManager = true;
vi.mock("@/hooks/use-role", () => ({ useIsManager: () => isManager }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { HiringTeamTabView } from "@/app/(dashboard)/jobs/[id]/_components/tabs/hiring-team-tab";
import type { HiringTeamMember, User } from "@/types";

const user = (id: number, firstName: string, lastName: string, role: User["role"], isActive = true) =>
  ({ id, firstName, lastName, email: `${firstName.toLowerCase()}@acme.example`, role, avatarUrl: null, isActive }) as User;

/** A team row: its own id differs from the person's id, as it does from the API. */
const member = (u: User, isJobCreator = false) =>
  ({ ...u, id: u.id + 100, userId: u.id, jobId: 9, addedAt: "", isJobCreator }) as HiringTeamMember;

const ada = user(1, "Ada", "Lovelace", "hiring_manager");
const grace = user(2, "Grace", "Hopper", "interviewer");
const alan = user(3, "Alan", "Turing", "interviewer");
const gone = user(4, "Former", "Employee", "interviewer", false);

const add = vi.fn();
const remove = vi.fn();

function Harness({ team = [member(ada)], open = false }: { team?: HiringTeamMember[]; open?: boolean }) {
  const [isOpen, setOpen] = useState(open);
  const [id, setId] = useState("");
  return (
    <HiringTeamTabView
      team={team}
      allUsers={[ada, grace, alan, gone]}
      addTeamMemberOpen={isOpen}
      setAddTeamMemberOpen={setOpen}
      newMemberId={id}
      setNewMemberId={setId}
      handleAddTeamMember={() => add(id)}
      addTeamMemberMutationPending={false}
      removeTeamMemberMutation={{ mutate: remove, isPending: false } as never}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  isManager = true;
});
afterEach(cleanup);

describe("HiringTeamTabView", () => {
  it("lists each member with their email and a readable role", () => {
    render(<Harness />);
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("ada@acme.example")).toBeTruthy();
    expect(screen.getByText("Hiring Manager")).toBeTruthy();
  });

  it("offers only active people who are not on the team yet", () => {
    render(<Harness open />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Grace Hopper")).toBeTruthy();
    expect(within(dialog).getByText("Alan Turing")).toBeTruthy();
    expect(within(dialog).queryByText("Ada Lovelace")).toBeNull();
    expect(within(dialog).queryByText("Former Employee")).toBeNull();
  });

  it("adds the person picked, and not before one is picked", () => {
    render(<Harness open />);
    const dialog = screen.getByRole("dialog");
    const addButton = within(dialog).getByRole("button", { name: "Add member" }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);

    fireEvent.click(within(dialog).getByText("Grace Hopper"));
    expect(addButton.disabled).toBe(false);
    fireEvent.click(addButton);
    expect(add).toHaveBeenCalledWith("2");
  });

  it("removes by the person's id, not the id of the team row", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Ada Lovelace from the team" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove" }));
    expect(remove).toHaveBeenCalledWith(1, expect.anything());
  });

  it("does not offer to remove the person who created the job", () => {
    render(<Harness team={[member(ada, true), member(grace)]} />);
    expect(screen.getByText("Created this job")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove Ada Lovelace from the team" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove Grace Hopper from the team" })).toBeTruthy();
  });

  it("shows no empty tag when a member has no role", () => {
    render(<Harness team={[{ ...member(ada), role: undefined as never }]} />);
    expect(screen.queryByText("Hiring Manager")).toBeNull();
    expect(document.querySelector("li span:empty")).toBeNull();
  });

  it("lists only a few people at a time and finds the rest by search", () => {
    const many = Array.from({ length: 40 }, (_, i) => user(50 + i, "Person", `Number${i}`, "interviewer"));
    const onlyZed = user(999, "Zed", "Last", "interviewer");
    render(
      <HiringTeamTabView
        team={[]}
        allUsers={[...many, onlyZed]}
        addTeamMemberOpen
        setAddTeamMemberOpen={() => {}}
        newMemberId=""
        setNewMemberId={() => {}}
        handleAddTeamMember={() => {}}
        addTeamMemberMutationPending={false}
        removeTeamMemberMutation={{ mutate: remove, isPending: false } as never}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("option")).toHaveLength(6);
    expect(within(dialog).getByText("Showing 6 of 41. Search to find someone else.")).toBeTruthy();
    expect(within(dialog).queryByText("Zed Last")).toBeNull();

    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "zed" } });
    expect(within(dialog).getAllByRole("option")).toHaveLength(1);
    expect(within(dialog).getByText("Zed Last")).toBeTruthy();
  });

  it("says so when everyone is already on the team", () => {
    render(<Harness open team={[member(ada), member(grace), member(alan)]} />);
    expect(within(screen.getByRole("dialog")).getByText(/Everyone is already on this team/)).toBeTruthy();
  });

  it("asks before removing someone", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Ada Lovelace from the team" }));
    expect(remove).not.toHaveBeenCalled();

    const confirm = screen.getByRole("alertdialog");
    expect(within(confirm).getByText(/will no longer see/)).toBeTruthy();
    fireEvent.click(within(confirm).getByRole("button", { name: "Remove" }));
    expect(remove).toHaveBeenCalledWith(1, expect.anything());
  });

  it("is read-only for people who cannot manage the team", () => {
    isManager = false;
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /Add member/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });

  it("invites you to add someone when the team is empty", () => {
    render(<Harness team={[]} />);
    expect(screen.getByText("No one is on this team yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add member/ })).toBeTruthy();
  });
});
