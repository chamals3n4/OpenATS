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
  newMemberRole: string;
  setNewMemberRole: (role: string) => void;
  handleAddTeamMember: () => void;
  addTeamMemberMutationPending: boolean;
  removeTeamMemberMutation: any;
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
  setIsAddingMode: (mode: boolean) => void;
  isAddingMode: boolean;
  editingQuestionId: number | null;
  setEditingQuestionId: (id: number | null) => void;
  editQuestionType: any;
  setEditQuestionType: (type: any) => void;
  editQuestionText: string;
  setEditQuestionText: (text: string) => void;
  editQuestionRequired: boolean;
  setEditQuestionRequired: (req: boolean) => void;
  handleSaveQuestion: (id: number) => void;
  updateQuestionMutationPending: boolean;
  openEditQuestion: (q: CustomQuestion) => void;
  deleteQuestionMutation: any;
  handleQuestionReorder: (from: number, to: number) => void;
  newQuestionType: any;
  setNewQuestionType: (type: any) => void;
  newQuestionText: string;
  setNewQuestionText: (text: string) => void;
  newQuestionRequired: boolean;
  setNewQuestionRequired: (req: boolean) => void;
  createQuestionMutation: any;
  isAssessmentDialogOpen: boolean;
  setIsAssessmentDialogOpen: (open: boolean) => void;
  attachedAssessments: JobAssessment[];
  allAssessments: Assessment[];
  setDetachTarget: (id: number | null) => void;
  attachAssessmentMutation: any;
  assessmentSelectId: string;
  setAssessmentSelectId: (id: string) => void;
  triggerStageSelectId: string;
  setTriggerStageSelectId: (id: string) => void;
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
  newMemberRole,
  setNewMemberRole,
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
  setIsAddingMode,
  isAddingMode,
  editingQuestionId,
  setEditingQuestionId,
  editQuestionType,
  setEditQuestionType,
  editQuestionText,
  setEditQuestionText,
  editQuestionRequired,
  setEditQuestionRequired,
  handleSaveQuestion,
  updateQuestionMutationPending,
  openEditQuestion,
  deleteQuestionMutation,
  handleQuestionReorder,
  newQuestionType,
  setNewQuestionType,
  newQuestionText,
  setNewQuestionText,
  newQuestionRequired,
  setNewQuestionRequired,
  createQuestionMutation,
  isAssessmentDialogOpen,
  setIsAssessmentDialogOpen,
  attachedAssessments,
  allAssessments,
  setDetachTarget,
  attachAssessmentMutation,
  assessmentSelectId,
  setAssessmentSelectId,
  triggerStageSelectId,
  setTriggerStageSelectId,
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
          newMemberRole={newMemberRole}
          setNewMemberRole={setNewMemberRole}
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
        className="pt-2 space-y-8 animate-in fade-in duration-300"
      >
        <CustomQuestionsTab
          questions={questions}
          setIsAddingMode={setIsAddingMode}
          isAddingMode={isAddingMode}
          editingQuestionId={editingQuestionId}
          setEditingQuestionId={setEditingQuestionId}
          editQuestionType={editQuestionType}
          setEditQuestionType={setEditQuestionType}
          editQuestionText={editQuestionText}
          setEditQuestionText={setEditQuestionText}
          editQuestionRequired={editQuestionRequired}
          setEditQuestionRequired={setEditQuestionRequired}
          handleSaveQuestion={handleSaveQuestion}
          updateQuestionMutationPending={updateQuestionMutationPending}
          openEditQuestion={openEditQuestion}
          deleteQuestionMutation={deleteQuestionMutation}
          handleQuestionReorder={handleQuestionReorder}
          newQuestionType={newQuestionType}
          setNewQuestionType={setNewQuestionType}
          newQuestionText={newQuestionText}
          setNewQuestionText={setNewQuestionText}
          newQuestionRequired={newQuestionRequired}
          setNewQuestionRequired={setNewQuestionRequired}
          createQuestionMutation={createQuestionMutation}
        />
      </TabsContent>

      <TabsContent value="assessments" className="pt-2 space-y-5">
        <AssessmentsTab
          isAssessmentDialogOpen={isAssessmentDialogOpen}
          setIsAssessmentDialogOpen={setIsAssessmentDialogOpen}
          attachedAssessments={attachedAssessments}
          allAssessments={allAssessments}
          stages={stages}
          setDetachTarget={setDetachTarget}
          attachAssessmentMutation={attachAssessmentMutation}
          assessmentSelectId={assessmentSelectId}
          setAssessmentSelectId={setAssessmentSelectId}
          triggerStageSelectId={triggerStageSelectId}
          setTriggerStageSelectId={setTriggerStageSelectId}
        />
      </TabsContent>
    </div>
  );
}
