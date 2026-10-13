"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertCompany, useUploadLogo } from "@/hooks/queries/use-company";
import type { Company } from "@/types";
import { FormField, inputCls } from "@/components/form/form-field";
import { LogoField } from "./logo-field";
import { SettingsSection } from "./settings-section";
import { TimeZoneSelect } from "./time-zone-select";

const DESCRIPTION_MAX = 500;
const LOGO_MAX_BYTES = 10 * 1024 * 1024;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Values = {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  description: string;
  logoUrl: string | null;
  timeZone: string;
};

const toValues = (c: Company): Values => ({
  name: c.name ?? "",
  email: c.email ?? "",
  phone: c.phone ?? "",
  website: c.website ?? "",
  address: c.address ?? "",
  description: c.description ?? "",
  logoUrl: c.logoUrl ?? null,
  timeZone: c.timeZone || "UTC",
});

/** Where the person setting the company up is, as a first suggestion. */
function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const FORM_ID = "company-profile-form";

export function CompanyForm({
  company,
  isNew,
  actionsSlot,
}: {
  company: Company;
  isNew: boolean;
  /** Where in the page the save and cancel buttons are drawn: its title row. */
  actionsSlot: HTMLElement | null;
}) {
  const upsertCompany = useUpsertCompany();
  const uploadLogo = useUploadLogo();

  // A new company starts on the zone of whoever is creating it, which is usually the right one.
  const [values, setValues] = useState<Values>(() =>
    isNew ? { ...toValues(company), timeZone: browserTimeZone() } : toValues(company),
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const baseline = toValues(company);
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const isDirty = (Object.keys(values) as (keyof Values)[]).some(
    (k) => (values[k] ?? "") !== (baseline[k] ?? ""),
  );

  const errors = {
    name: values.name.trim() ? null : "Company name is required.",
    email: !values.email.trim()
      ? "Contact email is required."
      : EMAIL_RE.test(values.email.trim())
        ? null
        : "Enter a valid email address.",
  };
  const hasErrors = Boolean(errors.name || errors.email);

  const handleLogo = (file: File) => {
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("That image is larger than 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    uploadLogo.mutate(file, {
      onSuccess: (data) => set("logoUrl", data.url),
      onError: (err) => {
        setLogoPreview(null);
        toast.error(err.message ?? "Logo upload failed");
      },
    });
  };

  const handleDiscard = () => {
    setValues(baseline);
    setLogoPreview(null);
    setShowErrors(false);
  };

  const handleSave = () => {
    setShowErrors(true);
    if (hasErrors) return;
    upsertCompany.mutate(
      {
        name: values.name.trim(),
        email: values.email.trim(),
        website: values.website.trim() || null,
        phone: values.phone.trim() || null,
        address: values.address.trim() || null,
        description: values.description.trim() || null,
        logoUrl: values.logoUrl,
        timeZone: values.timeZone,
      },
      {
        onSuccess: () => {
          setLogoPreview(null);
          setShowErrors(false);
          toast.success(isNew ? "Company created" : "Changes saved");
        },
        onError: () => toast.error("Failed to save"),
      },
    );
  };

  const logoSrc = logoPreview ?? values.logoUrl;

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      {/* Drawn in the page's title row, beside "Company settings", so saving is always in view. */}
      {actionsSlot &&
        createPortal(
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {isDirty && !isNew && (
              <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-neutral-400">
                <span aria-hidden className="size-2 rounded-full bg-amber-500" />
                Unsaved changes
              </p>
            )}
            {!isNew && (
              <Button
                type="button"
                variant="cancel"
                onClick={handleDiscard}
                disabled={!isDirty || upsertCompany.isPending}
                className="h-9 cursor-pointer px-4 text-sm disabled:cursor-not-allowed"
              >
                Cancel
              </Button>
            )}
            {/* Outside the form in the page, so it names the form it submits. */}
            <Button
              type="submit"
              form={FORM_ID}
              disabled={upsertCompany.isPending || uploadLogo.isPending || (!isNew && !isDirty)}
              className="h-9 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover disabled:cursor-not-allowed"
            >
              {upsertCompany.isPending && <Spinner className="size-3.5" />}
              {upsertCompany.isPending ? "Saving" : isNew ? "Create company" : "Save changes"}
            </Button>
          </div>,
          actionsSlot,
        )}

      <SettingsSection
        title="Company profile"
        description="The name and logo candidates see on your careers page, job listings and emails."
      >
        <div className="space-y-5">
          <LogoField
            companyName={values.name}
            logoSrc={logoSrc}
            isUploading={uploadLogo.isPending}
            onSelectFile={handleLogo}
            onRemove={() => {
              set("logoUrl", null);
              setLogoPreview(null);
            }}
          />
          <FormField
            label="Company name"
            htmlFor="company-name"
            required
            error={showErrors ? errors.name : null}
          >
            <Input
              id="company-name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Acme Inc."
              className={inputCls}
            />
          </FormField>
        </div>
      </SettingsSection>

      <SettingsSection title="Contact" description="Where candidates and your team can reach the company.">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Contact email"
            htmlFor="company-email"
            required
            error={showErrors ? errors.email : null}
          >
            <Input
              id="company-email"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="careers@acme.com"
              className={inputCls}
            />
          </FormField>
          <FormField label="Phone" htmlFor="company-phone">
            <Input
              id="company-phone"
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 555 000 0000"
              className={inputCls}
            />
          </FormField>
          <FormField label="Website" htmlFor="company-website">
            <Input
              id="company-website"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://acme.com"
              className={inputCls}
            />
          </FormField>
          <FormField label="Address" htmlFor="company-address">
            <Input
              id="company-address"
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="City, Country"
              className={inputCls}
            />
          </FormField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Time zone"
        description="Interview times and other dates in emails to candidates are written in this time zone."
      >
        <FormField label="Company time zone" htmlFor="company-time-zone">
          <TimeZoneSelect
            id="company-time-zone"
            value={values.timeZone}
            onChange={(zone) => set("timeZone", zone)}
            className="sm:max-w-sm"
          />
        </FormField>
      </SettingsSection>

      <SettingsSection title="About" description="A short introduction candidates read on your careers page.">
        <FormField
          label="Description"
          htmlFor="company-description"
          hint={`${DESCRIPTION_MAX - values.description.length} characters left`}
        >
          <Textarea
            id="company-description"
            value={values.description}
            onChange={(e) => set("description", e.target.value.slice(0, DESCRIPTION_MAX))}
            placeholder="What does your company do, and what is it like to work there?"
            rows={4}
            className="min-h-28 resize-y border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </FormField>
      </SettingsSection>

    </form>
  );
}
