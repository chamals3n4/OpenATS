import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// Each hook is a spy, so the tests can see which tab asked for data
const hooks = vi.hoisted(() => {
  // Same object every render, as React Query gives
  const result = { data: { data: [] } };
  const query = () => result;
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useUsers: vi.fn(query),
    useHiringTeam: vi.fn(query),
    useCustomQuestions: vi.fn(query),
    usePipeline: vi.fn(query),
    useAssessments: vi.fn(query),
    useJobAssessments: vi.fn(query),
    mutation,
    sendMessage: vi.fn(),
  };
});

vi.mock("@/hooks/queries/use-user", () => ({
  useUsers: hooks.useUsers,
  useCurrentUser: () => ({ data: { data: { id: 1, firstName: "Ayesha", lastName: "Perera" } } }),
}));
vi.mock("@/hooks/queries/use-jobs", () => ({
  useHiringTeam: hooks.useHiringTeam,
  useAddHiringTeamMember: hooks.mutation,
  useRemoveHiringTeamMember: hooks.mutation,
  useCustomQuestions: hooks.useCustomQuestions,
  useCreateQuestion: hooks.mutation,
  useUpdateQuestion: hooks.mutation,
  useDeleteQuestion: hooks.mutation,
}));
vi.mock("@/hooks/queries/use-pipeline", () => ({
  usePipeline: hooks.usePipeline,
  useCreateStage: hooks.mutation,
  useUpdateStage: hooks.mutation,
  useDeleteStage: hooks.mutation,
  useReorderStages: hooks.mutation,
}));
vi.mock("@/hooks/queries/use-assessments", () => ({
  useAssessments: hooks.useAssessments,
  useJobAssessments: hooks.useJobAssessments,
  useAttachAssessment: hooks.mutation,
  useDetachAssessment: hooks.mutation,
  useUpdatePassMark: hooks.mutation,
}));
vi.mock("@/hooks/queries/use-chat", () => ({
  useChatHistory: () => ({ data: { data: [] }, isError: false }),
}));
vi.mock("@/hooks/use-job-chat", () => ({
  useJobChat: () => ({
    sendMessage: hooks.sendMessage,
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    denied: false,
  }),
}));
vi.mock("@/hooks/use-role", () => ({ useIsManager: () => true }));
vi.mock("@/hooks/use-drag-sort", () => ({
  useDragSort: () => ({ ref: () => {}, isDragging: false, isOver: false }),
}));

import { Tabs } from "@/components/ui/tabs";
import { JobTabs } from "@/app/(dashboard)/jobs/[id]/_components/job-tabs";
import { DiscussionsPanel } from "@/app/(dashboard)/jobs/[id]/_components/discussions-panel";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderTab = (tab: string) =>
  render(
    <Tabs value={tab}>
      <JobTabs jobId={7} job={undefined} jobLoading={false} />
    </Tabs>,
  );

describe("job page tabs", () => {
  it("loads no tab data while the overview is open", () => {
    renderTab("overview");

    for (const hook of [
      hooks.useUsers,
      hooks.useHiringTeam,
      hooks.useCustomQuestions,
      hooks.usePipeline,
      hooks.useAssessments,
      hooks.useJobAssessments,
    ]) {
      expect(hook).not.toHaveBeenCalled();
    }
  });

  it("loads the team and the users only on the hiring team tab", () => {
    renderTab("hiring-team");

    expect(hooks.useHiringTeam).toHaveBeenCalledWith(7);
    expect(hooks.useUsers).toHaveBeenCalled();
    expect(hooks.useAssessments).not.toHaveBeenCalled();
  });

  it("loads stages for the hiring process tab", () => {
    renderTab("hiring-process");
    expect(hooks.usePipeline).toHaveBeenCalledWith(7);
  });

  it("loads the questions for the custom questions tab", () => {
    renderTab("custom-questions");
    expect(hooks.useCustomQuestions).toHaveBeenCalledWith(7);
  });

  it("loads the job's and all assessments, and the stages, for the assessments tab", () => {
    renderTab("assessments");

    expect(hooks.useJobAssessments).toHaveBeenCalledWith(7);
    expect(hooks.useAssessments).toHaveBeenCalled();
    expect(hooks.usePipeline).toHaveBeenCalledWith(7);
  });
});

describe("DiscussionsPanel", () => {
  it("sends the typed message and clears the box", () => {
    render(<DiscussionsPanel jobId={7} onClose={vi.fn()} />);
    const box = screen.getByLabelText("Message the hiring team") as HTMLTextAreaElement;

    fireEvent.change(box, { target: { value: "  Strong candidate  " } });
    fireEvent.click(screen.getByLabelText("Send"));

    expect(hooks.sendMessage).toHaveBeenCalledWith("Strong candidate");
    expect(box.value).toBe("");
  });

  it("closes through onClose", () => {
    const onClose = vi.fn();
    render(<DiscussionsPanel jobId={7} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Close the discussion"));

    expect(onClose).toHaveBeenCalled();
  });
});
