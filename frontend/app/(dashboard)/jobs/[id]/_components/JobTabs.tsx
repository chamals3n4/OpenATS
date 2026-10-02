"use client";

import { TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from "./tabs/OverviewTab";
import { HiringTeamTab } from "./tabs/HiringTeamTab";
import { HiringProcessTab } from "./tabs/HiringProcessTab";
import { CustomQuestionsTab } from "./tabs/CustomQuestionsTab";
import { AssessmentsTab } from "./tabs/AssessmentsTab";
import type {
  JobDetail,
  User,
  PipelineStage,
  CustomQuestion,
  Assessment,
  JobAssessment,
} from "@/types";
import type {
  useCreateQuestion,
  useDeleteQuestion,
  useUpdateQuestion,
  useRemoveHiringTeamMember,
} from "@/hooks/queries/use-jobs";
import type { useAttachAssessment, useDetachAssessment } from "@/hooks/queries/use-assessments";

interface JobTabsProps {
  activeJobTab: string;
  job: JobDetail | undefined;
  jobLoading: boolean;
  team: User[];
  allUsers: User[];
  addTeamMemberOpen: boolean;
  setAddTeamMemberOpen: (open: boolean) => void;
  newMemberId: string;
  setNewMemberId: (id: string) => void;
  handleAddTeamMember: () => void;
  addTeamMemberMutationPending: boolean;
  removeTeamMemberMutation: ReturnType<typeof useRemoveHiringTeamMember>;
  stages: (PipelineStage & { color: string })[];
  setAddStageOpen: (open: boolean) => void;
  editingStageId: number | null;
  setEditingStageId: (id: number | null) => void;
  editingStageName: string;
  setEditingStageName: (name: string) => void;
  handleSaveStage: (id: number) => void;
  updateStageMutationPending: boolean;
  setStageDeleteTarget: (target: { id: number; name: string } | null) => void;
  handleStageReorder: (from: number, to: number) => void;
  questions: CustomQuestion[];
  deleteQuestionMutation: ReturnType<typeof useDeleteQuestion>;
  updateQuestionMutation: ReturnType<typeof useUpdateQuestion>;
  handleQuestionReorder: (from: number, to: number) => void;
  createQuestionMutation: ReturnType<typeof useCreateQuestion>;
  attachedAssessments: JobAssessment[];
  allAssessments: Assessment[];
  attachAssessmentMutation: ReturnType<typeof useAttachAssessment>;
  detachAssessmentMutation: ReturnType<typeof useDetachAssessment>;
}

export function JobTabs({
  activeJobTab,
  job,
  jobLoading,
  team,
  allUsers,
  addTeamMemberOpen,
  setAddTeamMemberOpen,
  newMemberId,
  setNewMemberId,
  handleAddTeamMember,
  addTeamMemberMutationPending,
  removeTeamMemberMutation,
  stages,
  setAddStageOpen,
  editingStageId,
  setEditingStageId,
  editingStageName,
  setEditingStageName,
  handleSaveStage,
  updateStageMutationPending,
  setStageDeleteTarget,
  handleStageReorder,
  questions,
  deleteQuestionMutation,
  updateQuestionMutation,
  handleQuestionReorder,
  createQuestionMutation,
  attachedAssessments,
  allAssessments,
  attachAssessmentMutation,
  detachAssessmentMutation,
}: JobTabsProps) {
  return (
    <div className="pb-20 w-full">
      <TabsContent
        value="overview"
        className="pt-2 animate-in fade-in duration-300 max-w-4xl"
      >
        <OverviewTab job={job} jobLoading={jobLoading} />
      </TabsContent>

      <TabsContent
        value="hiring-team"
        className="pt-2 space-y-12 animate-in fade-in duration-300"
      >
        <HiringTeamTab
          team={team}
          allUsers={allUsers}
          addTeamMemberOpen={addTeamMemberOpen}
          setAddTeamMemberOpen={setAddTeamMemberOpen}
          newMemberId={newMemberId}
          setNewMemberId={setNewMemberId}
          handleAddTeamMember={handleAddTeamMember}
          addTeamMemberMutationPending={addTeamMemberMutationPending}
          removeTeamMemberMutation={removeTeamMemberMutation}
        />
      </TabsContent>

      <TabsContent
        value="hiring-process"
        className="pt-2 space-y-6 animate-in fade-in duration-300"
      >
        <HiringProcessTab
          stages={stages}
          setAddStageOpen={setAddStageOpen}
          editingStageId={editingStageId}
          setEditingStageId={setEditingStageId}
          editingStageName={editingStageName}
          setEditingStageName={setEditingStageName}
          handleSaveStage={handleSaveStage}
          updateStageMutationPending={updateStageMutationPending}
          setStageDeleteTarget={setStageDeleteTarget}
          handleStageReorder={handleStageReorder}
        />
      </TabsContent>

      <TabsContent
        value="custom-questions"
        className="pt-2"
      >
        <CustomQuestionsTab
          questions={questions}
          deleteQuestionMutation={deleteQuestionMutation}
          updateQuestionMutation={updateQuestionMutation}
          handleQuestionReorder={handleQuestionReorder}
          createQuestionMutation={createQuestionMutation}
        />
      </TabsContent>

      <TabsContent value="assessments" className="pt-2 space-y-5">
        <AssessmentsTab
          attachedAssessments={attachedAssessments}
          allAssessments={allAssessments}
          stages={stages}
          attachAssessmentMutation={attachAssessmentMutation}
          detachAssessmentMutation={detachAssessmentMutation}
        />
      </TabsContent>
    </div>
  );
}
