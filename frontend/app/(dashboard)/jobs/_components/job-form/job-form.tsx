"use client";

import { useState, type KeyboardEvent } from "react";
import type { Department } from "@/types";
import { JobFormHeader } from "./job-form-header";
import { JobBasicInfo } from "./job-basic-info";
import { SkillsInput } from "./skills-input";
import { LocationInput } from "./location-input";
import { JobDescriptionSection } from "./job-description";
import { SalarySection } from "./salary";
import { FormActions } from "./form-actions";
import {
  EMPTY_JOB_FORM_VALUES,
  isValidJobForm,
  type JobFormValues,
  type ValidJobFormValues,
} from "./job-form-values";

interface JobFormProps {
  mode: "create" | "edit";
  initialValues?: JobFormValues;
  departments: Department[];
  isPending: boolean;
  onSubmit: (values: ValidJobFormValues) => void;
  onCancel: () => void;
}

/**
 * The single job form, shared by the create and edit pages. It owns the field
 * state; the pages own data loading and what happens on submit.
 */
export function JobForm({
  mode,
  initialValues = EMPTY_JOB_FORM_VALUES,
  departments,
  isPending,
  onSubmit,
  onCancel,
}: JobFormProps) {
  const [values, setValues] = useState<JobFormValues>(initialValues);
  const [skillInput, setSkillInput] = useState("");

  const set = <K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleAddSkill = (e: KeyboardEvent<HTMLInputElement>) => {
    const skill = skillInput.trim();
    if (e.key !== "Enter" || !skill) return;
    e.preventDefault();
    if (!values.skills.includes(skill)) set("skills", [...values.skills, skill]);
    setSkillInput("");
  };

  const handleSubmit = () => {
    if (isValidJobForm(values)) onSubmit(values);
  };

  return (
    <div className="px-14 py-10 pb-20 max-w-5xl">
      <JobFormHeader
        mode={mode}
        isActive={values.isActive}
        onActiveChange={(v) => set("isActive", v)}
      />

      <div className="space-y-5">
        <JobBasicInfo
          title={values.title}
          onTitleChange={(v) => set("title", v)}
          departmentId={values.departmentId}
          onDepartmentChange={(v) => set("departmentId", v)}
          employmentType={values.employmentType}
          onEmploymentTypeChange={(v) => set("employmentType", v)}
          departments={departments}
        />

        <SkillsInput
          skills={values.skills}
          skillInput={skillInput}
          onSkillInputChange={setSkillInput}
          onAddSkill={handleAddSkill}
          onRemoveSkill={(skill) =>
            set(
              "skills",
              values.skills.filter((s) => s !== skill),
            )
          }
        />

        <LocationInput
          value={values.location}
          onChange={(v) => set("location", v)}
        />

        <JobDescriptionSection
          value={values.description}
          onChange={(v) => set("description", v)}
        />

        <SalarySection
          isIncluded={values.isSalaryInfoIncluded}
          onIncludedChange={(v) => set("isSalaryInfoIncluded", v)}
          salaryType={values.salaryType}
          onSalaryTypeChange={(v) => set("salaryType", v)}
          currency={values.currency}
          onCurrencyChange={(v) => set("currency", v)}
          payFrequency={values.payFrequency}
          onPayFrequencyChange={(v) => set("payFrequency", v)}
          salaryMin={values.salaryMin}
          onSalaryMinChange={(v) => set("salaryMin", v)}
          salaryMax={values.salaryMax}
          onSalaryMaxChange={(v) => set("salaryMax", v)}
          salaryFixed={values.salaryFixed}
          onSalaryFixedChange={(v) => set("salaryFixed", v)}
        />

        <FormActions
          submitLabel={mode === "create" ? "Save Job" : "Update Job"}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          isSubmitDisabled={!isValidJobForm(values) || isPending}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
